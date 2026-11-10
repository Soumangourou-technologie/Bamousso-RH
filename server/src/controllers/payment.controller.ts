import { Request, Response } from 'express';
import axios from 'axios';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { openRegistrationHash } from '../utils/registrationPassword.js';
import prisma from '../utils/prisma.js';
import { logger } from '../utils/logger.js';
import { sendSubscriptionConfirmation, sendAdminSubscriptionNotification, sendRegistrationWelcomeEmail } from '../utils/mailer.js';
import { generateSubscriptionPDF } from '../utils/pdfGenerator.js';
import { calculateTotalAmount, PlanType, BillingCycle } from '../shared/pricing.js';

/**
 * Traite un paiement réussi (crée l'entreprise & l'utilisateur pour une nouvelle inscription, 
 * ou active l'abonnement pour une entreprise existante)
 */
export const processSuccessfulPayment = async (transactionId: string, amount: number | string, metadata: any) => {
  const numericAmount = Number(amount);
  if (!transactionId || !Number.isFinite(numericAmount) || numericAmount <= 0) return { success: false };
  const isNewRegistration = metadata.isNewRegistration === true || metadata.isNewRegistration === 'true' || Boolean(metadata.companyName && metadata.email);

  if (isNewRegistration) {
    const email = metadata.email;
    const companyName = metadata.companyName;
    const firstName = metadata.firstName || 'Client';
    const lastName = metadata.lastName || '';
    const phone = metadata.phone || '';
    const plan = (metadata.plan || 'FITINI').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const billingCycle = metadata.billingCycle || 'MONTHLY';
    const extraEmployees = Number(metadata.extraEmployees) || 0;

    const paid = await prisma.payment.findFirst({ where: { externalId: transactionId, status: "SUCCESS" }, select: { id: true } });
    if (paid) return { success: true };

    if (numericAmount !== calculateTotalAmount(plan as PlanType, billingCycle, extraEmployees)) return { success: false };

    const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existingUser) return { success: false };

    // Compatibilité avec les paiements déjà initialisés avant la correction.
    const password = typeof metadata.passwordEnvelope === 'string'
      ? openRegistrationHash(metadata.passwordEnvelope, email)
      : metadata.hashedPassword;
    if (typeof password !== 'string' || !/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(password)) {
      throw new Error('Identifiants d’inscription incomplets');
    }
    // 1. CRÉATION DE L'ENTREPRISE ET DE L'UTILISATEUR EN BASE DE DONNÉES UNIQUEMENT APRÈS PAIEMENT RÉEL VALIDÉ
    await prisma.$transaction(async (tx) => {
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
          password,
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
          amount: numericAmount,
          reference: `BAM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          externalId: transactionId.toString(),
          status: "SUCCESS",
          companyId: newCompany.id,
          description: `Abonnement Bamousso RH - Formule ${plan}`,
        }
      });

    });

    // 2. Envoyer le lien de connexion une fois le compte créé.
    try {
      await sendRegistrationWelcomeEmail(email, firstName, companyName, plan);
    } catch (mailErr) {
      await logger.error("Erreur envoi email bienvenue après paiement", mailErr, "PaymentController");
    }


    // 3. ENVOI DE LA CONFIRMATION ET FACTURE PDF
    try {
      const pdfBuffer = await generateSubscriptionPDF({
        companyName: companyName,
        plan: plan,
        amount: numericAmount,
        date: new Date().toLocaleDateString(),
        transactionId: transactionId,
        billingCycle: billingCycle
      });
      await sendSubscriptionConfirmation(email, companyName, plan, numericAmount, pdfBuffer);
      await sendAdminSubscriptionNotification(companyName, plan, numericAmount, pdfBuffer);
    } catch (pdfErr) {
      await logger.error("Erreur envoi facture après paiement", pdfErr, "PaymentController");
    }

    return { success: true };
  } else {
    // Cas Entreprise existante (Renouvellement)
    const companyId = metadata.companyId;
    if (!companyId) return { success: false, message: "Company ID manquant" };

    const extraEmployees = Number(metadata.extraEmployees) || 0;
    const isAddOn = metadata.isAddOn === 'true' || metadata.isAddOn === true;
    const plan = (metadata.plan || 'FITINI').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const billingCycle = metadata.billingCycle || 'MONTHLY';

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

    const company = await prisma.$transaction(async tx => {
      const updated = await tx.payment.updateMany({
        where: { externalId: transactionId, companyId, amount: numericAmount, status: "PENDING" },
        data: { status: "SUCCESS" },
      });
      if (!updated.count) return null;
      return tx.company.update({
        where: { id: companyId },
        data: updateData,
        include: { users: { where: { role: 'COMPANY_ADMIN' }, take: 1 } },
      });
    });
    if (!company) {
      const paid = await prisma.payment.findFirst({ where: { externalId: transactionId, companyId, amount: numericAmount, status: "SUCCESS" }, select: { id: true } });
      return { success: Boolean(paid) };
    }

    try {
      const adminEmail = company.users[0]?.email;
      const pdfBuffer = await generateSubscriptionPDF({
        companyName: company.name,
        plan: plan,
        amount: numericAmount,
        date: new Date().toLocaleDateString(),
        transactionId: transactionId,
        billingCycle: billingCycle
      });

      if (adminEmail) {
        await sendSubscriptionConfirmation(adminEmail, company.name, plan, numericAmount, pdfBuffer);
      }
      await sendAdminSubscriptionNotification(company.name, plan, numericAmount, pdfBuffer);
    } catch (mailError) {
      await logger.error("Erreur envoi emails confirmation", mailError, "PaymentController");
    }

    return { success: true };
  }
};

/**
 * Initialise un paiement avec GeniusPay
 */
export const initiatePayment = async (req: Request, res: Response) => {
  try {
    const { description, companyId, plan, pendingToken } = req.body;

    let regData: jwt.JwtPayload | null = null;
    if (pendingToken) {
      try {
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('JWT_SECRET absent');
        const payload = jwt.verify(pendingToken, secret, { algorithms: ['HS256'] });
        if (typeof payload === 'string' || payload.purpose !== 'company-registration'
            || typeof payload.email !== 'string' || typeof payload.companyName !== 'string'
            || typeof payload.passwordEnvelope !== 'string') {
          throw new Error('Jeton d’inscription invalide');
        }
        regData = payload;
      } catch {
        return res.status(400).json({ success: false, message: "Inscription expirée ou invalide. Reprenez le formulaire d’inscription." });
      }
    }

    const isNewRegistration = Boolean(regData && regData.companyName && regData.email);

    if (!isNewRegistration && !companyId) {
      return res.status(400).json({ success: false, message: "Inscription ou ID entreprise requis." });
    }

    const targetPlan = plan || (regData ? regData.plan : 'FITINI');
    const isAddOn = !isNewRegistration && (req.body.isAddOn === 'true' || req.body.isAddOn === true);
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
      metadata.passwordEnvelope = regData.passwordEnvelope;
    } else {
      metadata.companyId = companyId;
    }

    await logger.info("Initialisation du paiement GeniusPay", { amount: calculatedAmount, isNewRegistration }, "PaymentController");

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
        transactionId: transactionId,
        paymentReference: response.data.data.reference || transactionId
      });
    }

    throw new Error(response.data.message || "Réponse invalide de GeniusPay");

  } catch (error: any) {
    await logger.error("GeniusPay Initiation Error", { status: error.response?.status }, "PaymentController");
    
    res.status(500).json({ 
      success: false, 
      message: "Erreur lors de l'initialisation du paiement."
    });
  }
};

// Les deux points d’entrée confirment la transaction auprès du prestataire.
async function verifyMerchantPayment(reference: unknown) {
  if (typeof reference !== 'string' || !/^[a-zA-Z0-9_-]{1,120}$/.test(reference)) return { success: false };
  const apiKey = process.env.GENIUSPAY_KEY;
  const apiSecret = process.env.GENIUSPAY_SECRET;
  if (!apiKey || !apiSecret) return { success: false };
  const response = await axios.get(`https://pay.genius.ci/api/v1/merchant/payments/${encodeURIComponent(reference)}`, {
    headers: { 'X-API-Key': apiKey, 'X-API-Secret': apiSecret },
    timeout: 10000,
  });
  const payment = response.data?.data;
  if (!payment || !['completed', 'SUCCESS'].includes(payment.status)) return { success: false };
  const id = String(payment.transaction_id || payment.id || payment.reference || reference);
  return processSuccessfulPayment(id, payment.amount, payment.metadata || {});
}

export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const { event, data } = req.body;
    if (event === 'payment.success' || ['completed', 'SUCCESS'].includes(data?.status)) {
      const reference = data?.reference || data?.transaction_id || data?.id;
      const result = await verifyMerchantPayment(reference == null ? undefined : String(reference));
      if (!result.success) return res.status(503).send('Paiement non confirmé');
    }
    res.status(200).send('OK');
  } catch {
    await logger.error("Vérification du webhook GeniusPay indisponible", undefined, "PaymentController");
    res.status(503).send('Webhook Error');
  }
};

export const confirmPayment = async (req: Request, res: Response) => {
  try {
    const result = await verifyMerchantPayment(req.params.token);
    return res.json(result.success
      ? { success: true, status: "SUCCESS" }
      : { success: false, message: "Paiement non confirmé ou en cours de validation." });
  } catch {
    return res.status(503).json({ success: false, message: "Vérification du paiement momentanément indisponible." });
  }
};
