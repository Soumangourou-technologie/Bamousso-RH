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
      from: 'Bamousso RH <facturation@resend.dev>', // À remplacer par un domaine vérifié en prod
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
      from: 'System Bamousso <system@resend.dev>',
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
