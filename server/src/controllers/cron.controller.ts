import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_to_prevent_crash');

/**
 * Vérifie les abonnements expirants et envoie des alertes.
 * Devrait être appelé par un Cron Job chaque jour.
 */
export const checkSubscriptions = async (req: Request, res: Response) => {
  // Vérification de sécurité (token secret dans l'URL ou header)
  const cronSecret = req.headers['x-cron-auth'] || req.query.secret;
  if (cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ message: "Non autorisé" });
  }

  try {
    const now = new Date();
    const twoWeeksFromNow = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    // 1. Trouver les entreprises expirant dans moins de 14 jours et toujours ACTIVE
    const expiringCompanies = await prisma.company.findMany({
      where: {
        subscriptionStatus: "ACTIVE",
        subscriptionEndsAt: {
          lte: twoWeeksFromNow,
          gt: now
        }
      },
      include: { users: { where: { role: 'COMPANY_ADMIN' }, take: 1 } }
    });

    for (const company of expiringCompanies) {
      const daysLeft = Math.ceil((new Date(company.subscriptionEndsAt!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      // Alerte tous les 2 jours si moins de 14 jours restants
      if (daysLeft % 2 === 0 || daysLeft <= 3) {
        const adminEmail = company.users[0]?.email;
        if (adminEmail) {
          await resend.emails.send({
            from: 'Bamousso Alerts <alerts@resend.dev>',
            to: adminEmail,
            subject: `⚠️ Rappel : Votre abonnement Bamousso expire dans ${daysLeft} jours`,
            html: `
              <div style="font-family: sans-serif; padding: 20px; border: 1px solid #fecaca; border-radius: 16px;">
                <h2 style="color: #dc2626;">Attention : Expiration proche</h2>
                <p>Bonjour,</p>
                <p>Votre abonnement Bamousso pour l'entreprise <strong>${company.name}</strong> arrive à son terme dans <strong>${daysLeft} jours</strong>.</p>
                <p>Pour éviter toute interruption de service, veuillez renouveler votre abonnement dès que possible.</p>
                <div style="margin: 20px 0;">
                  <a href="${process.env.FRONTEND_URL}/register" style="background-color: #ff5722; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Renouveler maintenant</a>
                </div>
                <p style="font-size: 12px; color: #666;">Si vous avez déjà effectué le règlement, ignorez cet email.</p>
              </div>
            `
          });
        }
      }
    }

    // 2. Suspendre les entreprises dont la date est dépassée
    const expiredCompanies = await prisma.company.updateMany({
      where: {
        subscriptionStatus: "ACTIVE",
        subscriptionEndsAt: { lte: now }
      },
      data: {
        subscriptionStatus: "SUSPENDED",
        isActive: false,
        isLocked: true,
        lockedAt: now
      }
    });

    res.json({ 
      success: true, 
      processed: expiringCompanies.length,
      suspended: expiredCompanies.count 
    });

  } catch (error) {
    console.error("Cron Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * Nettoie les entreprises abandonnées (pas de paiement après 24h).
 */
export const cleanupAbandonedCompanies = async (req: Request, res: Response) => {
  const cronSecret = req.headers['x-cron-auth'] || req.query.secret;
  if (cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ message: "Non autorisé" });
  }

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Trouver les entreprises fantômes
    const ghostCompanies = await prisma.company.findMany({
      where: {
        isActive: false,
        subscriptionStatus: "PAST_DUE",
        subscriptionEndsAt: null,
        createdAt: { lte: twentyFourHoursAgo }
      },
      select: { id: true }
    });

    if (ghostCompanies.length === 0) {
      return res.json({ success: true, message: "Aucune entreprise abandonnée à nettoyer." });
    }

    const ids = ghostCompanies.map(c => c.id);

    // Suppression en cascade (utilisateurs, puis entreprise)
    await prisma.$transaction([
      prisma.user.deleteMany({ where: { companyId: { in: ids } } }),
      prisma.company.deleteMany({ where: { id: { in: ids } } })
    ]);

    res.json({ 
      success: true, 
      cleaned: ids.length 
    });

  } catch (error) {
    console.error("Cleanup Cron Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
