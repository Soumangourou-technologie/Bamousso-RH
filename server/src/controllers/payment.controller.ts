import { Request, Response } from 'express';
import axios from 'axios';
import crypto from 'node:crypto';
import prisma from '../utils/prisma.js';
import { logger } from '../utils/logger.js';
import { sendSubscriptionConfirmation, sendAdminSubscriptionNotification } from '../utils/mailer.js';
import { generateSubscriptionPDF } from '../utils/pdfGenerator.js';

/**
 * Initialise un paiement avec GeniusPay
 */
export const initiatePayment = async (req: Request, res: Response) => {
  try {
    const { amount, description, companyId, plan } = req.body;

    if (!amount || !companyId) {
      return res.status(400).json({ success: false, message: "Montant et ID entreprise requis." });
    }

    const apiKey = process.env.GENIUSPAY_KEY;
    const apiSecret = process.env.GENIUSPAY_SECRET;

    if (!apiKey || !apiSecret) {
      const errorMsg = "Clés GeniusPay manquantes dans .env";
      await logger.error(errorMsg, { apiKey: !!apiKey, apiSecret: !!apiSecret }, "PaymentController");
      return res.status(500).json({ success: false, message: errorMsg });
    }

    // Log diagnostic (affiche juste le début pour vérification)
    await logger.info(`Diagnostic Clés: KEY=${apiKey.substring(0, 10)}... SECRET=${apiSecret.substring(0, 10)}...`, null, "PaymentController");

    await logger.info("Initiating payment request", { amount, companyId, plan }, "PaymentController");

    const response = await axios.post('https://pay.genius.ci/api/v1/merchant/payments', {
      amount: parseInt(amount),
      description: description || "Abonnement Bamousso RH",
      currency: "XOF",
      metadata: {
        companyId: companyId,
        plan: plan,
        extraEmployees: req.body.extraEmployees || 0,
        isAddOn: req.body.isAddOn || false
      },
      success_url: `${process.env.FRONTEND_URL}/payment-success?companyId=${companyId}`,
      error_url: `${process.env.FRONTEND_URL}/payment-cancelled`,
    }, {
      headers: {
        'X-API-Key': apiKey,
        'X-API-Secret': apiSecret,
        'X-PUBLIC-KEY': apiKey,
        'X-SECRET-KEY': apiSecret,
        'Authorization': `Bearer ${apiSecret}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (response.data && response.data.data && response.data.data.checkout_url) {
      const transactionId = response.data.data.transaction_id || response.data.data.id || response.data.data.reference;

      // Sauvegarde de la transaction en attente dans la DB
      await prisma.payment.create({
        data: {
          amount: parseFloat(amount),
          reference: `BAM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          externalId: transactionId.toString(),
          status: "PENDING",
          companyId: companyId,
          description: description || `Abonnement Bamousso - ${plan}`,
        }
      });

      return res.json({
        success: true,
        url: response.data.data.checkout_url,
        transactionId: transactionId
      });
    }

    throw new Error(response.data.message || "Réponse invalide de GeniusPay");

  } catch (error: any) {
    const errorDetails = error.response?.data || error.message;
    await logger.error("GeniusPay Initiation Error", errorDetails, "PaymentController");
    
    res.status(500).json({ 
      success: false, 
      message: "Erreur lors de l'initialisation du paiement.",
      error: errorDetails
    });
  }
};

/**
 * Webhook pour confirmer le paiement avec vérification de signature
 */
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    await logger.info("Webhook GeniusPay reçu", req.body, "PaymentController");

    const signature = req.headers['x-webhook-signature'] as string;
    const timestamp = req.headers['x-webhook-timestamp'] as string;
    const webhookSecret = process.env.GENIUSPAY_WEBHOOK_SECRET;

    // Signature verification logic
    if (!webhookSecret || !signature || !timestamp) {
      await logger.error("Configuration Webhook manquante ou signature absente", { signature: !!signature, timestamp: !!timestamp, secret: !!webhookSecret }, "PaymentController");
      return res.status(401).json({ error: "Unauthorized: Missing signature configuration" });
    }

    // Diagnostic pour l'utilisateur (à vérifier dans les logs Vercel)
    const secretSnippet = webhookSecret ? `${webhookSecret.substring(0, 8)}...` : "NON DEFINI";
    
    // IMPORTANT : Utiliser le Raw Body (Buffer) pour une précision binaire totale
    const rawBody = (req as any).rawBody;
    let expectedSignature = "";

    if (rawBody) {
      const hmac = crypto.createHmac('sha256', webhookSecret);
      hmac.update(`${timestamp}.`);
      hmac.update(rawBody);
      expectedSignature = hmac.digest('hex');
    } else {
      // Fallback si rawBody est absent (ne devrait pas arriver avec notre config app.ts)
      const payload = JSON.stringify(req.body);
      expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(`${timestamp}.${payload}`)
        .digest('hex');
    }

    if (signature !== expectedSignature) {
      await logger.error("Signature Webhook invalide", { 
        expected: expectedSignature, 
        received: signature,
        webhookSecretUsed: secretSnippet,
        hasRawBody: !!rawBody
      }, "PaymentController");
      return res.status(401).json({ error: "Invalid signature" });
    }

    const { event, data } = req.body;
    const isSuccess = event === 'payment.success' || (data && (data.status === 'completed' || data.status === 'SUCCESS'));

    if (isSuccess && data) {
      const metadata = data.metadata || {};
      const companyId = metadata.companyId;
      let extraEmployees = 0;
      
      // Robust extraction of extraEmployees (handle string or number)
      if (metadata.extraEmployees !== undefined) {
        extraEmployees = typeof metadata.extraEmployees === 'string' 
          ? parseInt(metadata.extraEmployees) 
          : Number(metadata.extraEmployees);
      }
      
      const isAddOn = metadata.isAddOn === 'true' || metadata.isAddOn === true;
      let plan = metadata.plan;

      await logger.info("Webhook Data Received", { 
        companyId, 
        extraEmployees, 
        isAddOn, 
        plan,
        fullMetadata: metadata 
      }, "PaymentController");

      // Fallback: chercher le paiement correspondant pour retrouver le plan
      if (!plan) {
        const p = await prisma.payment.findFirst({
          where: { externalId: (data.transaction_id || data.id || data.reference || '').toString() }
        });
        if (p && p.description && p.description.includes('- ')) {
          plan = p.description.split('- ')[1];
        }
      }
      if (!plan) plan = 'FITINI';

      // Normalisation du plan
      plan = plan.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      if (companyId) {
        await logger.info(`Traitement Webhook pour Company: ${companyId}`, { event, plan, extraEmployees }, "PaymentController");
        
        // 1. Mettre à jour l'entreprise
        const updateData: any = {
          subscriptionStatus: "ACTIVE",
          isActive: true,
          isLocked: false,
          subscriptionEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        };

        if (isAddOn) {
          // Cas "Ajout d'employé" : on incrémente
          updateData.extraEmployees = { increment: extraEmployees };
        } else {
          // Cas "Nouvel abonnement / Renouvellement" : on écrase avec le plan et le quota choisi
          updateData.plan = plan;
          updateData.extraEmployees = extraEmployees;
        }

        const company = await (prisma.company.update({
          where: { id: companyId },
          data: updateData,
          include: { users: { where: { role: 'COMPANY_ADMIN' }, take: 1 } }
        }) as any);

        // 2. Mettre à jour le record de paiement
        await prisma.payment.updateMany({
          where: { externalId: (data.transaction_id || data.id || data.reference || '').toString() },
          data: { status: "SUCCESS" }
        });

        await logger.info(`Compte activé via Webhook pour ${company.name}`, { plan }, "PaymentController");

        // Envoi des emails et PDF
        try {
          const adminEmail = company.users[0]?.email;
          const amount = data.amount || 0;
          const pdfBuffer = await generateSubscriptionPDF({
            companyName: company.name,
            plan: plan,
            amount: amount,
            date: new Date().toLocaleDateString(),
            transactionId: (data.transaction_id || data.id || 'GP-' + Date.now()).toString()
          });

          if (adminEmail) {
            await sendSubscriptionConfirmation(adminEmail, company.name, plan, amount, pdfBuffer);
          }
          await sendAdminSubscriptionNotification(company.name, plan, amount, pdfBuffer);
        } catch (mailError) {
          await logger.error("Erreur envoi emails après webhook", mailError, "PaymentController");
        }
      }
    }

    res.status(200).send('OK');
  } catch (error: any) {
    await logger.error("Webhook Error", error.message, "PaymentController");
    res.status(500).send('Webhook Error');
  }
};

/**
 * Vérifie l'état d'un paiement (appelé par le frontend après redirection)
 */
export const confirmPayment = async (req: Request, res: Response) => {
  try {
    const { token, companyId } = req.params; 

    let payment;
    if (token && token !== '{transaction_id}' && !token.includes('{')) {
      payment = await prisma.payment.findFirst({
        where: { externalId: token as string },
        include: { company: true }
      });
    } 
    
    if (!payment && companyId) {
      payment = await prisma.payment.findFirst({
        where: { companyId: companyId as string },
        orderBy: { createdAt: 'desc' },
        include: { company: true }
      });
    }

    if (!payment) {
      return res.status(404).json({ success: false, message: "Paiement introuvable." });
    }

    if (payment.company.isActive || payment.status === "SUCCESS") {
      return res.json({ success: true, status: "SUCCESS" });
    }

    // --- VÉRIFICATION DIRECTE AUPRÈS DE GENIUSPAY ---
    try {
      const currentToken = payment.externalId;
      if (!currentToken) throw new Error("ID transaction externe manquant.");

      const apiKey = process.env.GENIUSPAY_KEY;
      const apiSecret = process.env.GENIUSPAY_SECRET;

      await logger.info(`Vérification directe demandée pour ${currentToken}`, { companyId: payment.companyId }, "PaymentController");
      
      const response = await axios.get(`https://pay.genius.ci/api/v1/merchant/payments/${currentToken}`, {
        headers: {
          'X-API-Key': apiKey,
          'X-API-Secret': apiSecret
        }
      });

      const externalData = response.data.data;
      if (externalData.status === 'completed' || externalData.status === 'SUCCESS') {
        const companyId = payment.companyId;
        
        // On récupère le plan depuis les métadonnées OU depuis la description du paiement
        let plan = externalData.metadata?.plan;
        if (!plan && payment.description && payment.description.includes('- ')) {
          plan = payment.description.split('- ')[1];
        }
        if (!plan) plan = 'FITINI';
        
        plan = plan.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        // Extraire les données isAddOn et extraEmployees depuis les métadonnées
        const metadata = externalData.metadata || {};
        const isAddOn = metadata.isAddOn === 'true' || metadata.isAddOn === true;
        let extraEmployees = 0;
        if (metadata.extraEmployees !== undefined) {
          extraEmployees = typeof metadata.extraEmployees === 'string'
            ? parseInt(metadata.extraEmployees)
            : Number(metadata.extraEmployees);
        }

        const updateData: any = {
          subscriptionStatus: "ACTIVE",
          isActive: true,
          isLocked: false,
          subscriptionEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        };

        if (isAddOn) {
          // Cas "Ajout d'employé" : on incrémente
          updateData.extraEmployees = { increment: extraEmployees };
        } else {
          // Cas "Nouvel abonnement / Renouvellement"
          updateData.plan = plan;
          updateData.extraEmployees = extraEmployees;
        }

        await prisma.company.update({
          where: { id: companyId },
          data: updateData as any
        });

        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "SUCCESS" }
        });

        await logger.info(`Compte activé via Confirmation Directe pour ${payment.company.name}`, { plan }, "PaymentController");
        return res.json({ success: true, status: "SUCCESS" });
      }
    } catch (apiError) {
      console.error("Erreur vérification directe GeniusPay:", apiError);
    }
    
    return res.json({ 
      success: false, 
      status: payment.status 
    });

  } catch (error: any) {
    await logger.error("ConfirmPayment Error", error.message, "PaymentController");
    res.status(500).json({ success: false, message: error.message });
  }
};
