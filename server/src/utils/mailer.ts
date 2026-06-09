import { Resend } from 'resend';
import { logger } from './logger.js';
import { Buffer } from 'node:buffer';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Envoie un email de confirmation de souscription au client
 */
export const sendSubscriptionConfirmation = async (
  email: string,
  companyName: string,
  plan: string,
  amount: number,
  pdfBuffer: any
) => {
  try {
    await resend.emails.send({
      from: 'Bamousso RH <facturation@bamousso.com>',
      to: email,
      subject: `Confirmation de votre abonnement Bamousso - ${companyName}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h1 style="color: #ff5722;">Merci pour votre confiance !</h1>
          <p>Bonjour,</p>
          <p>Nous vous confirmons l'activation de votre abonnement <strong>${plan}</strong> pour l'entreprise <strong>${companyName}</strong>.</p>
          <p>Le montant de <strong>${amount.toLocaleString()} FCFA</strong> a été réglé avec succès.</p>
          <p>Vous trouverez votre facture en pièce jointe de cet email.</p>
          <div style="margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/dashboard" style="background-color: #ff5722; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Accéder à mon tableau de bord</a>
          </div>
          <p>L'équipe Bamousso RH</p>
        </div>
      `,
      attachments: [
        {
          filename: `facture_bamousso_${Date.now()}.pdf`,
          content: pdfBuffer,
        },
      ],
    });
    await logger.info(`Email de confirmation envoyé à ${email}`, { companyName, plan }, "Mailer");
  } catch (error) {
    await logger.error("Erreur envoi email confirmation client", error, "Mailer");
    throw error;
  }
};

/**
 * Notifie les administrateurs de Bamousso d'une nouvelle souscription
 */
export const sendAdminSubscriptionNotification = async (
  companyName: string,
  plan: string,
  amount: number,
  pdfBuffer: any
) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@bamousso.ci';
    await resend.emails.send({
      from: 'System Bamousso <system@bamousso.com>',
      to: adminEmail,
      subject: `🚀 Nouvelle Souscription : ${companyName} (${plan})`,
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Nouvelle vente réalisée !</h2>
          <p>L'entreprise <strong>${companyName}</strong> vient de souscrire au plan <strong>${plan}</strong>.</p>
          <p>Montant : <strong>${amount.toLocaleString()} FCFA</strong></p>
          <p>La facture est jointe à cet email.</p>
        </div>
      `,
      attachments: [
        {
          filename: `vente_${companyName}_${Date.now()}.pdf`,
          content: pdfBuffer,
        },
      ],
    });
    await logger.info(`Notification admin envoyée pour ${companyName}`, { plan }, "Mailer");
  } catch (error) {
    await logger.error("Erreur envoi email notification admin", error, "Mailer");
    // On ne throw pas ici pour ne pas bloquer le processus client si l'admin ne reçoit pas
  }
};

/**
 * Envoie l'email sécurisé de réinitialisation de mot de passe
 */
export const sendPasswordResetEmail = async (email: string, name: string, token: string) => {
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
    
    await resend.emails.send({
      from: 'Bamousso RH <securite@bamousso.com>',
      to: email,
      subject: '🔒 Réinitialisation de votre mot de passe Bamousso',
      html: `
        <div style="font-family: sans-serif; padding: 30px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #f0f0f0; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #f7a600; font-size: 28px; font-weight: 900; margin: 0; letter-spacing: -1px;">BAMOUSSO RH</h1>
          </div>
          <h2 style="font-size: 18px; font-weight: 700; color: #1a0f0a;">Bonjour ${name},</h2>
          <p style="font-size: 15px; line-height: 1.6;">Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte sur la plateforme BAMOUSSO RH.</p>
          <p style="font-size: 15px; line-height: 1.6;">Cliquez sur le bouton ci-dessous pour configurer un nouveau mot de passe de sécurité. Ce lien est à usage unique et expirera dans **1 heure**.</p>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${resetUrl}" style="background-color: #f7a600; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(247,166,0,0.3); display: inline-block;">Réinitialiser mon mot de passe</a>
          </div>
          
          <p style="font-size: 12px; color: #666; text-align: center;">Si le bouton ne fonctionne pas, vous pouvez copier-coller l'URL suivante dans votre navigateur :</p>
          <p style="font-size: 11px; color: #0070f3; text-align: center; word-break: break-all; background: #f9f9f9; padding: 10px; border-radius: 8px;">${resetUrl}</p>
          
          <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; font-size: 12px; color: #999;">
            <p style="margin: 0 0 10px 0;">Si vous n'avez pas initié cette demande, vous pouvez ignorer cet e-mail en toute sécurité. Votre mot de passe actuel reste protégé.</p>
            <p style="margin: 0;">L'équipe Sécurité BAMOUSSO</p>
          </div>
        </div>
      `,
    });
    await logger.info(`Email de réinitialisation de mot de passe envoyé à ${email}`, {}, "Mailer");
  } catch (error) {
    await logger.error("Erreur critique d'envoi email de réinitialisation", error, "Mailer");
    throw error;
  }
};

/**
 * Envoie un email de bienvenue pour une création manuelle (hors-ligne) par le Super Admin
 */
export const sendOfflineWelcomeEmail = async (email: string, name: string, companyName: string, plan: string, defaultPassword: string) => {
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    await resend.emails.send({
      from: 'Bamousso RH <bienvenue@bamousso.com>',
      to: email,
      subject: '🎉 Bienvenue sur Bamousso RH - Vos accès administrateur',
      html: `
        <div style="font-family: sans-serif; padding: 30px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #f0f0f0; border-radius: 16px;">
          <h1 style="color: #f7a600; text-align: center;">BAMOUSSO RH</h1>
          <h2>Bonjour ${name},</h2>
          <p>Votre espace pour l'entreprise <strong>${companyName}</strong> (Forfait ${plan}) a été activé avec succès par notre équipe !</p>
          <p>Voici vos identifiants temporaires de connexion :</p>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Email :</strong> ${email}</p>
            <p style="margin: 5px 0;"><strong>Mot de passe :</strong> ${defaultPassword}</p>
          </div>
          <p style="color: #d9534f; font-weight: bold;">Nous vous conseillons fortement de modifier ce mot de passe dès votre première connexion pour des raisons de sécurité.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${frontendUrl}/login" style="background-color: #f7a600; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Se connecter</a>
          </div>
          <p>L'équipe Bamousso RH</p>
        </div>
      `,
    });
    await logger.info(`Email de bienvenue hors-ligne envoyé à ${email}`, { companyName }, "Mailer");
  } catch (error) {
    await logger.error("Erreur envoi email bienvenue hors-ligne", error, "Mailer");
  }
};
