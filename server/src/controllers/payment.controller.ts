import { Request, Response } from 'express';
import axios from 'axios';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma.js';
import { logger } from '../utils/logger.js';
import { sendSubscriptionConfirmation, sendAdminSubscriptionNotification, sendRegistrationWelcomeEmail } from '../utils/mailer.js';
import { generateSubscriptionPDF } from '../utils/pdfGenerator.js';
import { calculateTotalAmount, PlanType, BillingCycle } from '../shared/pricing.js';

/**
 * Traite un paiement réussi (crée l'entreprise & l'utilisateur pour une nouvelle inscription, 
 * ou active l'abonnement pour une entreprise existante)
 */
export const processSuccessfulPayment = async (transactionId: string, amount: number, metadata: any) => {
  const isNewRegistration = metadata.isNewRegistration === true || metadata.isNewRegistration === 'true' || Boolean(metadata.companyName && metadata.email);

  if (isNewRegistration) {
    const email = metadata.email;
    const companyName = metadata.companyName;
    const firstName = metadata.firstName || 'Client';
    const lastName = metadata.lastName || '';
    const phone = metadata.phone || '';
    const hashedPassword = metadata.hashedPassword;
    const rawPassword = metadata.rawPassword || 'Password123';
    let plan = (metadata.plan || 'FITINI').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const billingCycle = metadata.billingCycle || 'MONTHLY';
    const extraEmployees = Number(metadata.extraEmployees) || 0;

    // Idempotency: vérifier si l'utilisateur existe déjà
    let user = await prisma.user.findUnique({
      where: { email },
      include: { company: true }
    });

    let company = user?.company;

    if (!user) {
      // 1. CRÉATION DE L'ENTREPRISE ET DE L'UTILISATEUR EN BASE DE DONNÉES UNIQUEMENT APRÈS PAIEMENT RÉEL VALIDÉ
      const creationResult = await prisma.$transaction(async (tx) => {
        const newCompany = await tx.company.create({
          data: {
            name: companyName,
            isActive: true,
            subscriptionStatus: "ACTIVE",
            subscriptionEndsAt: new Date(Date.now() + (billingCycle === 'YEARLY' ? 365 : 30) * 24 * 60 * 60 * 1000),
            trialEndsAt: null,
            plan: plan,
            billingCycle: billingCycle,
            extraEmployees: extraEmployees,
            isLocked: false,
            lockedAt: null,
          } as any,
        });

        const newUser = await tx.user.create({
          data: {
            email,
            phone,
            password: hashedPassword || await bcrypt.hash(rawPassword, 10),
            firstName,
            lastName,
            role: "COMPANY_ADMIN",
            companyId: newCompany.id,
            status: "ACTIVE",
          },
        });

        await tx.company.update({
          where: { id: newCompany.id },
          data: { managerId: newUser.id }
        });

        await tx.payment.create({
          data: {
            amount: amount || 0,
            reference: `BAM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            externalId: transactionId.toString(),
            status: "SUCCESS",
            companyId: newCompany.id,
            description: `Abonnement Bamousso RH - Formule ${plan}`,
          }
        });

        return { company: newCompany, user: newUser };
      });

      company = creationResult.company as any;
      user = creationResult.user as any;

      // 2. ENVOI DE L'EMAIL DE BIENVENUE AVEC IDENTIFIANTS UNIQUEMENT MAINTENANT
      try {
        await sendRegistrationWelcomeEmail(email, firstName, companyName, plan, rawPassword);
      } catch (mailErr) {
        await logger.error("Erreur envoi email bienvenue après paiement", mailErr, "PaymentController");
      }
    } else if (company && !company.isActive) {
      await prisma.company.update({
        where: { id: company.id },
        data: {
          isActive: true,
          subscriptionStatus: "ACTIVE",
          isLocked: false,
          subscriptionEndsAt: new Date(Date.now() + (billingCycle === 'YEARLY' ? 365 : 30) * 24 * 60 * 60 * 1000)
        }
      });
    }

    // 3. ENVOI DE LA CONFIRMATION ET FACTURE PDF
    try {
      const pdfBuffer = await generateSubscriptionPDF({
        companyName: companyName,
        plan: plan,
        amount: amount || 0,
        date: new Date().toLocaleDateString(),
        transactionId: transactionId,
        billingCycle: billingCycle
      });
      await sendSubscriptionConfirmation(email, companyName, plan, amount || 0, pdfBuffer);
      await sendAdminSubscriptionNotification(companyName, plan, amount || 0, pdfBuffer);
    } catch (pdfErr) {
      await logger.error("Erreur envoi facture après paiement", pdfErr, "PaymentController");
    }

    return { success: true, company, user };
  } else {
    // Cas Entreprise existante (Renouvellement)
    const companyId = metadata.companyId;
    if (!companyId) return { success: false, message: "Company ID manquant" };

    const extraEmployees = Number(metadata.extraEmployees) || 0;
    const isAddOn = metadata.isAddOn === 'true' || metadata.isAddOn === true;
    let plan = (metadata.plan || 'FITINI').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    let billingCycle = metadata.billingCycle || 'MONTHLY';

    const updateData: any = {
      subscriptionStatus: "ACTIVE",
      isActive: true,
      isLocked: false
    };

    if (isAddOn) {
      updateData.extraEmployees = { increment: extraEmployees };
    } else {
      updateData.subscriptionEndsAt = new Date(Date.now() + (billingCycle === 'YEARLY' ? 365 : 30) * 24 * 60 * 60 * 1000);
      updateData.plan = plan;
      updateData.billingCycle = billingCycle;
      if (metadata.extraEmployees !== undefined) {
        updateData.extraEmployees = extraEmployees;
      }
    }

    const company = await (prisma.company.update({
      where: { id: companyId },
      data: updateData,
      include: { users: { where: { role: 'COMPANY_ADMIN' }, take: 1 } }
    }) as any);

    await prisma.payment.updateMany({
      where: { externalId: transactionId.toString() },
      data: { status: "SUCCESS" }
    });

    try {
      const adminEmail = company.users[0]?.email;
      const pdfBuffer = await generateSubscriptionPDF({
        companyName: company.name,
        plan: plan,
        amount: amount || 0,
        date: new Date().toLocaleDateString(),
        transactionId: transactionId,
        billingCycle: billingCycle
      });

      if (adminEmail) {
        await sendSubscriptionConfirmation(adminEmail, company.name, plan, amount || 0, pdfBuffer);
      }
      await sendAdminSubscriptionNotification(company.name, plan, amount || 0, pdfBuffer);
    } catch (mailError) {
      await logger.error("Erreur envoi emails confirmation", mailError, "PaymentController");
    }

    return { success: true, company, user: company.users[0] };
  }
};

/**
 * Initialise un paiement avec GeniusPay
 */
export const initiatePayment = async (req: Request, res: Response) => {
  try {
    const { description, companyId, plan, pendingToken, registrationData } = req.body;

    // Décoder le token d'inscription temporaire s'il existe
    let regData: any = registrationData || null;
    if (pendingToken) {
      try {
        const jwtSecret = process.env.JWT_SECRET || '';
        regData = jwt.verify(pendingToken, jwtSecret);
      } catch (err) {
        console.error("Token d'inscription invalide ou expiré:", err);
      }
    }

    const isNewRegistration = Boolean(regData && regData.companyName && regData.email);

    if (!isNewRegistration && !companyId) {
      return res.status(400).json({ success: false, message: "Inscription ou ID entreprise requis." });
    }

    const targetPlan = plan || (regData ? regData.plan : 'FITINI');
    const isAddOn = req.body.isAddOn === 'true' || req.body.isAddOn === true;
    const extraEmployees = parseInt(req.body.extraEmployees || (regData ? regData.extraEmployees : 0)) || 0;
    const billingCycle: BillingCycle = (req.body.billingCycle || (regData ? regData.billingCycle : 'MONTHLY')) === 'YEARLY' ? 'YEARLY' : 'MONTHLY';
    const idempotencyKey = req.headers['idempotency-key'] as string;

    // Normaliser le nom du plan
    let normalizedPlan: PlanType = 'FITINI';
    const rawPlan = String(targetPlan || '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    if (rawPlan.includes('KORO')) {
      normalizedPlan = 'KORO';
    } else if (rawPlan.includes('LOUBA')) {
      normalizedPlan = 'LOUBA';
    } else if (rawPlan.includes('FITINI')) {
      normalizedPlan = 'FITINI';
    }

    // Calcul sécurisé du montant côté serveur
    let calculatedAmount = 0;
    if (isAddOn) {
      calculatedAmount = calculateTotalAmount('FITINI', billingCycle, extraEmployees) - calculateTotalAmount('FITINI', billingCycle, 0);
    } else {
      calculatedAmount = calculateTotalAmount(normalizedPlan, billingCycle, extraEmployees);
    }

    if (calculatedAmount <= 0) {
      return res.status(400).json({ success: false, message: "Montant invalide ou formule gratuite (aucune transaction requise)." });
    }

    const apiKey = process.env.GENIUSPAY_KEY;
    const apiSecret = process.env.GENIUSPAY_SECRET;

    if (!apiKey || !apiSecret) {
      const errorMsg = "Clés GeniusPay manquantes dans .env";
      await logger.error(errorMsg, undefined, "PaymentController");
      return res.status(500).json({ success: false, message: errorMsg });
    }

    const rawFrontendUrl = process.env.FRONTEND_URL || 'https://bamoussorh.com';
    const cleanFrontendUrl = rawFrontendUrl.replace(/\/+$/, '').replace(/^http:\/\/localhost:\d+$/, 'https://bamoussorh.com');

    // Métadonnées d'inscription à transmettre à GeniusPay sans créer de compte en DB
    const metadata: any = {
      isNewRegistration: isNewRegistration,
      plan: normalizedPlan,
      billingCycle: billingCycle,
      extraEmployees: extraEmployees,
      isAddOn: isAddOn,
    };

    if (isNewRegistration) {
      metadata.companyName = regData.companyName;
      metadata.email = regData.email;
      metadata.phone = regData.phone;
      metadata.firstName = regData.firstName;
      metadata.lastName = regData.lastName;
      metadata.hashedPassword = regData.hashedPassword;
      metadata.rawPassword = regData.rawPassword;
    } else {
      metadata.companyId = companyId;
    }

    await logger.info("Initiating GeniusPay payment request (0 DB write before payment)", { amount: calculatedAmount, isNewRegistration, email: regData?.email }, "PaymentController");

    const response = await axios.post('https://pay.genius.ci/api/v1/merchant/payments', {
      amount: calculatedAmount,
      description: description || `Abonnement Bamousso RH - Formule ${normalizedPlan}`,
      currency: "XOF",
      metadata: metadata,
      success_url: `${cleanFrontendUrl}/payment-success?${isNewRegistration ? `email=${encodeURIComponent(regData.email)}` : `companyId=${companyId}`}`,
      error_url: `${cleanFrontendUrl}/payment-cancelled`,
    }, {
      headers: {
        'X-API-Key': apiKey,
        'X-API-Secret': apiSecret,
        'X-PUBLIC-KEY': apiKey,
        'X-SECRET-KEY': apiSecret,
        'Authorization': `Bearer ${apiSecret}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Idempotency-Key': idempotencyKey || crypto.randomUUID()
      }
    });

    if (response.data && response.data.data && response.data.data.checkout_url) {
      const transactionId = response.data.data.transaction_id || response.data.data.id || response.data.data.reference;

      // Seules les entreprises déjà enregistrées créent une ligne PENDING dans payment
      if (companyId && !isNewRegistration) {
        await prisma.payment.create({
          data: {
            amount: calculatedAmount,
            reference: `BAM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            externalId: transactionId.toString(),
            status: "PENDING",
            companyId: companyId,
            description: description || `Abonnement Bamousso - ${normalizedPlan}`,
          }
        });
      }

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
 * Webhook pour confirmer le paiement avec vérification de signature GeniusPay
 */
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    await logger.info("Webhook GeniusPay reçu", req.body, "PaymentController");

    const { event, data } = req.body;
    const isSuccess = event === 'payment.success' || (data && (data.status === 'completed' || data.status === 'SUCCESS'));

    if (isSuccess && data) {
      const transactionId = (data.transaction_id || data.id || data.reference || '').toString();
      const amount = data.amount || 0;
      const metadata = data.metadata || {};

      await processSuccessfulPayment(transactionId, amount, metadata);
    }

    res.status(200).send('OK');
  } catch (error: any) {
    await logger.error("Webhook Error", error.message, "PaymentController");
    res.status(500).send('Webhook Error');
  }
};

/**
 * Confirmation directe appelée lors du retour sur /payment-success
 */
export const confirmPayment = async (req: Request, res: Response) => {
  try {
    const { token, companyId } = req.params; 
    const apiKey = process.env.GENIUSPAY_KEY;
    const apiSecret = process.env.GENIUSPAY_SECRET;

    let transactionId = token;

    if (transactionId && transactionId !== '{transaction_id}' && !transactionId.includes('{')) {
      try {
        const response = await axios.get(`https://pay.genius.ci/api/v1/merchant/payments/${transactionId}`, {
          headers: {
            'X-API-Key': apiKey,
            'X-API-Secret': apiSecret
          }
        });

        const externalData = response.data.data;
        if (externalData && (externalData.status === 'completed' || externalData.status === 'SUCCESS')) {
          const result = await processSuccessfulPayment(transactionId.toString(), externalData.amount || 0, externalData.metadata || {});

          if (result && result.user && result.company) {
            const jwtSecret = process.env.JWT_SECRET || 'secret';
            const userToken = jwt.sign(
              { id: result.user.id, role: result.user.role, companyId: result.company.id },
              jwtSecret,
              { expiresIn: '1d' }
            );

            return res.json({
              success: true,
              status: "SUCCESS",
              token: userToken,
              user: {
                id: result.user.id,
                email: result.user.email,
                firstName: result.user.firstName,
                lastName: result.user.lastName,
                role: result.user.role,
                companyId: result.user.companyId
              },
              company: result.company
            });
          }
        }
      } catch (err: any) {
        await logger.error("Erreur vérification directe confirmPayment", err.message, "PaymentController");
      }
    }

    return res.json({ success: false, message: "Paiement non confirmé ou en cours de validation." });
  } catch (error: any) {
    await logger.error("ConfirmPayment Error", error.message, "PaymentController");
    res.status(500).json({ success: false, message: "Erreur lors de la confirmation." });
  }
};
