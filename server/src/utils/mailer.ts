import { Resend } from 'resend';
import { logger } from './logger.js';
import { Buffer } from 'node:buffer';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_to_prevent_crash');

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
 * Envoie un email de bienvenue lors de l'inscription en ligne avec récapitulatif des identifiants
 */
export const sendRegistrationWelcomeEmail = async (
  email: string, 
  firstName: string, 
  companyName: string, 
  plan: string, 
  rawPassword: string
) => {
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'https://www.bamousso.com';
    
    await resend.emails.send({
      from: 'Bamousso RH <bienvenue@bamousso.com>',
      to: email,
      subject: `🎉 Bienvenue sur Bamousso RH - Identifiants de l'entreprise ${companyName}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1a0f0a; max-width: 600px; margin: 0 auto; border: 1px solid #f0f0f0; border-radius: 16px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #ff5722; font-size: 28px; font-weight: 900; margin: 0; letter-spacing: -1px;">BAMOUSSO RH</h1>
            <p style="font-size: 13px; color: #666; font-weight: 600; text-transform: uppercase; tracking: 2px;">La Mère de votre Gestion RH</p>
          </div>
          
          <h2 style="font-size: 18px; font-weight: 700; color: #1a0f0a;">Bonjour ${firstName},</h2>
          <p style="font-size: 15px; line-height: 1.6; color: #444;">Félicitations ! Votre entreprise <strong>${companyName}</strong> a été enregistrée avec succès sur la plateforme Bamousso RH (Formule ${plan}).</p>
          
          <p style="font-size: 15px; font-weight: 700; color: #1a0f0a; margin-top: 20px;">Voici le récapitulatif de vos identifiants d'accès :</p>
          <div style="background: #fff3e0; padding: 20px; border-radius: 12px; border-left: 4px solid #ff5722; margin: 15px 0;">
            <p style="margin: 6px 0; font-size: 14px;"><strong>Entreprise :</strong> ${companyName}</p>
            <p style="margin: 6px 0; font-size: 14px;"><strong>Administrateur :</strong> ${firstName}</p>
            <p style="margin: 6px 0; font-size: 14px;"><strong>Email de connexion :</strong> <span style="color: #ff5722; font-weight: bold;">${email}</span></p>
            <p style="margin: 6px 0; font-size: 14px;"><strong>Mot de passe :</strong> <span style="font-family: monospace; font-size: 15px; background: #fff; padding: 2px 8px; border-radius: 4px; border: 1px solid #ffd0b0;">${rawPassword}</span></p>
          </div>
          
          <p style="font-size: 13px; color: #666; line-height: 1.5;">Pour des raisons de sécurité, nous vous recommandons de conserver cet email précieusement ou de modifier votre mot de passe si vous le souhaitez depuis vos paramètres d'espace.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${frontendUrl}/login" style="background-color: #ff5722; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(255,87,34,0.3); display: inline-block;">Accéder à mon espace client</a>
          </div>
          
          <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; font-size: 12px; color: #888; text-align: center;">
            <p style="margin: 0 0 5px 0;">Besoin d'assistance ? Contactez notre support direct sur WhatsApp ou à support@bamousso.ci</p>
            <p style="margin: 0;">L'équipe Bamousso RH</p>
          </div>
        </div>
      `,
    });
    await logger.info(`Email de bienvenue à l'inscription envoyé à ${email}`, { companyName }, "Mailer");
  } catch (error) {
    await logger.error("Erreur envoi email bienvenue inscription", error, "Mailer");
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

/**
 * Envoie un email de bienvenue à un employé avec ses accès
 */
export const sendEmployeeWelcomeEmail = async (email: string, firstName: string, lastName: string, companyName: string, defaultPassword: string, employerName: string) => {
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    await resend.emails.send({
      from: 'Bamousso RH <bienvenue@bamousso.com>',
      to: email,
      subject: `🎉 Bienvenue sur Bamousso RH - Vos accès pour ${companyName}`,
      html: `
        <div style="font-family: sans-serif; padding: 30px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #f0f0f0; border-radius: 16px;">
          <h1 style="color: #f7a600; text-align: center;">BAMOUSSO RH</h1>
          <h2>Bonjour ${firstName} ${lastName},</h2>
          <p>Votre compte pour l'entreprise <strong>${companyName}</strong> a été créé avec succès par <strong>${employerName}</strong>.</p>
          <p>Voici vos identifiants temporaires pour vous connecter à votre espace :</p>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Email :</strong> ${email}</p>
            <p style="margin: 5px 0;"><strong>Mot de passe :</strong> ${defaultPassword}</p>
          </div>
          <p style="color: #d9534f; font-weight: bold;">Nous vous conseillons fortement de modifier ce mot de passe dès votre première connexion pour des raisons de sécurité.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${frontendUrl}/login" style="background-color: #f7a600; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Se connecter à mon espace</a>
          </div>
          <p>L'équipe Bamousso RH</p>
        </div>
      `,
    });
    await logger.info(`Email de bienvenue employé envoyé à ${email}`, { companyName }, "Mailer");
  } catch (error) {
    await logger.error("Erreur envoi email bienvenue employé", error, "Mailer");
  }
};

/**
 * Envoie un email pour notifier qu'une fiche de paie est disponible
 */
export const sendPayslipEmail = async (email: string, firstName: string, lastName: string, month: number, year: number, netSalary: number, companyName: string) => {
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    // Convert month to French name
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const monthName = months[month - 1];
    
    await resend.emails.send({
      from: 'Bamousso RH <paie@bamousso.com>',
      to: email,
      subject: `📄 Votre fiche de paie de ${monthName} ${year} est disponible`,
      html: `
        <div style="font-family: sans-serif; padding: 30px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #f0f0f0; border-radius: 16px;">
          <h1 style="color: #f7a600; text-align: center;">BAMOUSSO RH</h1>
          <h2>Bonjour ${firstName} ${lastName},</h2>
          <p>Votre employeur (<strong>${companyName}</strong>) vient de générer votre fiche de paie pour la période de <strong>${monthName} ${year}</strong>.</p>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Période :</strong> ${monthName} ${year}</p>
            <p style="margin: 5px 0;"><strong>Salaire net :</strong> ${netSalary.toLocaleString()} FCFA</p>
          </div>
          <p>Vous pouvez consulter et télécharger votre fiche de paie détaillée directement depuis votre espace personnel sécurisé.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${frontendUrl}/login" style="background-color: #f7a600; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Accéder à mon espace</a>
          </div>
          <p>L'équipe Bamousso RH</p>
        </div>
      `,
    });
    await logger.info(`Email de paie envoyé à ${email}`, { month, year }, "Mailer");
  } catch (error) {
    await logger.error("Erreur envoi email paie", error, "Mailer");
  }
};

/**
 * Envoie un email de diffusion générale ou ciblée émis par le Super Admin
 */
export const sendBroadcastEmail = async (
  email: string,
  recipientName: string,
  subject: string,
  messageContent: string,
  attachmentUrl?: string | null,
  attachmentName?: string | null
) => {
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    // Convert newlines in messageContent to HTML linebreaks
    const formattedMessage = messageContent.replace(/\n/g, '<br/>');

    const html = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; color: #222; max-width: 650px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 20px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #fff3e0;">
          <h1 style="color: #f7a600; font-size: 26px; font-weight: 900; margin: 0; letter-spacing: -0.5px;">BAMOUSSO RH</h1>
          <p style="color: #6b7280; font-size: 13px; margin-top: 4px; font-weight: 600;">Information Officielle de la Plateforme</p>
        </div>
        
        <h2 style="font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 16px;">Bonjour ${recipientName},</h2>
        
        <div style="font-size: 15px; line-height: 1.7; color: #374151; background: #fafafa; padding: 20px; border-radius: 12px; border-left: 4px solid #f7a600; margin-bottom: 24px;">
          ${formattedMessage}
        </div>

        ${attachmentUrl ? `
          <div style="background: #fff8f0; border: 1px dashed #f7a600; padding: 15px; border-radius: 12px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 13px; font-weight: bold; color: #d97706;">📎 Document joint :</p>
            <p style="margin: 4px 0 10px 0; font-size: 14px; font-weight: 600; color: #1f2937;">${attachmentName || 'Fichier attaché'}</p>
            <a href="${attachmentUrl}" target="_blank" style="background-color: #f7a600; color: white; padding: 8px 16px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 12px; display: inline-block;">Télécharger la pièce jointe</a>
          </div>
        ` : ''}
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${frontendUrl}/login" style="background-color: #111827; color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">Accéder à Bamousso RH</a>
        </div>
        
        <div style="border-top: 1px solid #f3f4f6; margin-top: 30px; padding-top: 20px; font-size: 12px; color: #9ca3af; text-align: center;">
          <p style="margin: 0 0 5px 0;">Cet e-mail a été envoyé par l'administration de Bamousso RH.</p>
          <p style="margin: 0;">© 2026 Bamousso RH — Tous droits réservés.</p>
        </div>
      </div>
    `;

    await resend.emails.send({
      from: 'Bamousso RH <information@bamousso.com>',
      to: email,
      subject: subject,
      html: html
    });
    await logger.info(`Email de broadcast envoyé à ${email}`, { subject }, "Mailer");
  } catch (error) {
    await logger.error(`Erreur envoi email broadcast à ${email}`, error, "Mailer");
  }
};
