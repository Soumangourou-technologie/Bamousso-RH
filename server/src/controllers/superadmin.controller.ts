/**
 * Contrôleur SUPER_ADMIN : gestion globale de la plateforme Bamousso RH.
 * - Vue de toutes les entreprises et abonnements
 * - Création de nouveaux SUPER_ADMIN
 * - Changement de mot de passe
 */
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../utils/prisma.js";
import { z } from "zod";
import type { AuthRequest } from "../middleware/auth.js";
import { sendOfflineWelcomeEmail, sendBroadcastEmail } from "../utils/mailer.js";
import { uploadToSupabase } from "../utils/supabase.js";

// ─── Schémas de Validation ────────────────────────────────────────────────────

const createSuperAdminSchema = z.object({
  email: z.string().email("Format d'email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Le mot de passe actuel est requis"),
  newPassword: z.string().min(6, "Le nouveau mot de passe doit contenir au moins 6 caractères"),
});

const createOfflineCompanySchema = z.object({
  companyName: z.string().min(2, "Le nom de l'entreprise est requis"),
  email: z.string().email("Format d'email invalide"),
  phone: z.string().min(8, "Numéro de téléphone invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  plan: z.enum(['FITINI', 'LOUBA', 'KORO']),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']),
});

// ─── Tableau de bord SUPER_ADMIN ──────────────────────────────────────────────

/**
 * Retourne la liste de toutes les entreprises avec leur statut d'abonnement.
 */
export const getAllCompanies = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const companies = await prisma.company.findMany({
      where: {
        OR: [
          { isActive: true },
          { subscriptionStatus: 'ACTIVE' },
          { subscriptionEndsAt: { not: null } }
        ]
      },
      select: {
        id: true,
        name: true,
        isActive: true,
        isLocked: true,
        subscriptionStatus: true,
        subscriptionEndsAt: true,
        // @ts-ignore: Prisma client needs IDE TS Server restart to recognize this new field
        paymentMode: true,
        plan: true,
        createdAt: true,
        _count: {
          select: { users: true }
        },
        manager: {
          select: { email: true, firstName: true, lastName: true, phone: true }
        },
        users: {
          where: { role: 'COMPANY_ADMIN' },
          take: 1,
          select: { email: true, firstName: true, lastName: true, phone: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Si manager est null, on utilise le premier COMPANY_ADMIN comme contact
    const formatted = companies.map((c: any) => ({
      ...c,
      manager: c.manager || c.users?.[0] || null,
      users: undefined
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la récupération des entreprises.", error: error.message });
  }
};

/**
 * Retourne les statistiques globales de la plateforme.
 */
export const getPlatformStats = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const [totalCompanies, activeCompanies, lockedCompanies, totalUsers, superAdmins] = await Promise.all([
      prisma.company.count({
        where: {
          OR: [
            { isActive: true },
            { subscriptionStatus: 'ACTIVE' },
            { subscriptionEndsAt: { not: null } }
          ]
        }
      }),
      prisma.company.count({ where: { isActive: true, subscriptionStatus: 'ACTIVE' } }),
      prisma.company.count({ where: { isLocked: true } }),
      prisma.user.count({ where: { role: { not: 'SUPER_ADMIN' } } }),
      prisma.user.findMany({ 
        where: { role: 'SUPER_ADMIN' }, 
        select: { id: true, email: true, firstName: true, lastName: true, createdAt: true, isOnline: true } 
      })
    ]);

    res.json({
      totalCompanies,
      activeCompanies,
      lockedCompanies,
      totalUsers,
      superAdmins,
    });
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la récupération des statistiques.", error: error.message });
  }
};

/**
 * Crée un nouveau compte SUPER_ADMIN (réservé aux SUPER_ADMIN existants).
 */
export const createSuperAdmin = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { email, password, firstName, lastName } = createSuperAdminSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: "Un compte avec cet email existe déjà." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
      },
    });

    res.status(201).json({
      message: "SUPER_ADMIN créé avec succès.",
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.issues[0].message });
    }
    res.status(500).json({ message: "Erreur lors de la création du SUPER_ADMIN.", error: error.message });
  }
};

/**
 * Permet à un utilisateur connecté de changer son propre mot de passe.
 * Accessible à tous les rôles (SUPER_ADMIN, COMPANY_ADMIN, EMPLOYEE…)
 */
export const changePassword = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const currentUser = req.user;
    if (!currentUser) return res.status(401).json({ message: "Non authentifié." });

    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body) as { currentPassword: string; newPassword: string };

    const user = await prisma.user.findUnique({ where: { id: currentUser.id } });
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable." });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Le mot de passe actuel est incorrect." });
    }

    const hashedNew = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedNew }
    });

    res.json({ message: "Mot de passe mis à jour avec succès." });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.issues[0].message });
    }
    res.status(500).json({ message: "Erreur lors du changement de mot de passe.", error: error.message });
  }
};

/**
 * Change le plan d'abonnement d'une entreprise.
 */
export const updateCompanyPlan = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const id = String(req.params.id);
    const { plan } = req.body;

    if (!['FITINI', 'LOUBA', 'KORO'].includes(plan)) {
      return res.status(400).json({ message: "Plan invalide. Utilisez FITINI, LOUBA ou KORO." });
    }

    const updated = await prisma.company.update({
      where: { id },
      data: { 
        plan, 
        subscriptionStatus: 'ACTIVE', 
        isActive: true,
        isLocked: false,
        subscriptionEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Donne 30 jours auto
      }
    });

    res.json({ message: `Plan mis à jour : ${plan}`, company: updated });
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la mise à jour du plan.", error: error.message });
  }
};

/**
 * Supprime définitivement une entreprise et ses données (Aggressif).
 */
export const deleteCompany = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const id = String(req.params.id);
    
    // 1. On récupère tous les IDs des utilisateurs de cette entreprise
    const users = await prisma.user.findMany({
      where: { companyId: id },
      select: { id: true }
    });
    const userIds = users.map(u => u.id);

    // 2. On nettoie tout ce qui est lié à ces utilisateurs par transaction
    await prisma.$transaction(async (tx) => {
      // Désactiver le manager de l'entreprise pour éviter les blocages de clé étrangère
      await tx.company.update({
        where: { id },
        data: { managerId: null }
      });

      // Récupérer les IDs des départements
      const departments = await tx.department.findMany({
        where: { companyId: id },
        select: { id: true }
      });
      const deptIds = departments.map(d => d.id);

      // Supprimer les données liées aux utilisateurs
      if (userIds.length > 0) {
        await tx.attendance.deleteMany({ where: { employeeId: { in: userIds } } });
        await tx.leaveRequest.deleteMany({ where: { employeeId: { in: userIds } } });
        await tx.document.deleteMany({ where: { employeeId: { in: userIds } } });
        await tx.notification.deleteMany({ where: { userId: { in: userIds } } });
        await tx.forumComment.deleteMany({ where: { authorId: { in: userIds } } });
        await tx.forumPost.deleteMany({ where: { authorId: { in: userIds } } });
        
        // Supprimer TOUS les messages liés aux utilisateurs ou aux départements de l'entreprise
        await tx.message.deleteMany({ 
          where: { 
            OR: [
              { senderId: { in: userIds } }, 
              { recipientId: { in: userIds } },
              { departmentId: { in: deptIds } }
            ] 
          } 
        });
      }

      // Supprimer les départements
      await tx.department.deleteMany({ where: { companyId: id } });

      // Supprimer les paiements
      await tx.payment.deleteMany({ where: { companyId: id } });

      // Supprimer les utilisateurs
      await tx.user.deleteMany({ where: { companyId: id } });

      // Enfin supprimer l'entreprise
      await tx.company.delete({ where: { id } });
    }, {
      timeout: 10000 // Augmenter le timeout pour les grosses entreprises
    });

    res.json({ message: "Entreprise et toutes ses données supprimées avec succès." });
  } catch (error: any) {
    console.error("Delete Error:", error);
    res.status(500).json({ message: "Erreur lors de la suppression.", error: error.message });
  }
};

/**
 * Active ou désactive le verrou d'une entreprise.
 */
export const toggleCompanyLock = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const id = String(req.params.id);
    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) return res.status(404).json({ message: "Entreprise non trouvée." });

    const updated = await prisma.company.update({
      where: { id },
      data: {
        isLocked: !company.isLocked,
        lockedAt: !company.isLocked ? new Date() : null,
      }
    });

    res.json({ message: `Entreprise ${updated.isLocked ? 'verrouillée' : 'déverrouillée'} avec succès.`, company: updated });
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors du verrouillage.", error: error.message });
  }
};

/**
 * Récupère les logs système (pour le débogage).
 */
export const getSystemLogs = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const logs = await (prisma as any).systemLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100, // Limite aux 100 derniers logs
    });

    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la récupération des logs.", error: error.message });
  }
};
/**
 * Récupère tous les paiements réussis de la plateforme.
 */
export const getAllPayments = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        company: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 200 // Limite aux 200 derniers
    });

    res.json(payments);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la récupération des paiements.", error: error.message });
  }
};

/**
 * Régénère et télécharge la facture PDF pour un paiement donné.
 */
import { generateSubscriptionPDF } from "../utils/pdfGenerator.js";

export const getPaymentInvoice = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const id = String(req.params.id);
    const payment = await (prisma.payment.findUnique({
      where: { id },
      include: { company: true }
    }) as any);

    if (!payment) {
      return res.status(404).json({ message: "Paiement introuvable." });
    }

    // Extraire le plan de la description
    let plan = 'FITINI';
    if (payment.description && payment.description.includes('- ')) {
      plan = payment.description.split('- ')[1];
    }

    const companyName = payment.company?.name || 'Entreprise';

    const pdfBuffer = await generateSubscriptionPDF({
      companyName,
      plan: plan,
      amount: payment.amount,
      date: new Date(payment.createdAt).toLocaleDateString('fr-FR'),
      transactionId: payment.externalId || payment.reference
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Facture_${companyName.replace(/\s+/g, '_')}_${payment.reference}.pdf`);
    res.send(pdfBuffer);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la génération de la facture.", error: error.message });
  }
};

/**
 * Crée une entreprise en mode hors-ligne (Paiement Comptant).
 */
export const createOfflineCompany = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const data = createOfflineCompanySchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) return res.status(400).json({ message: "Cet email est déjà utilisé." });

    const existingCompany = await prisma.company.findFirst({ where: { name: data.companyName } });
    if (existingCompany) return res.status(400).json({ message: "Ce nom d'entreprise existe déjà." });

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const months = data.billingCycle === 'YEARLY' ? 12 : 1;
    const endsAt = new Date();
    endsAt.setMonth(endsAt.getMonth() + months);

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: data.companyName,
          isActive: true,
          subscriptionStatus: "ACTIVE",
          subscriptionEndsAt: endsAt,
          plan: data.plan,
          billingCycle: data.billingCycle,
          paymentMode: "OFFLINE",
          isLocked: false,
        } as any,
      });

      const user = await tx.user.create({
        data: {
          email: data.email,
          phone: data.phone,
          password: hashedPassword,
          firstName: data.firstName,
          lastName: data.lastName,
          role: "COMPANY_ADMIN",
          companyId: company.id,
          status: "ACTIVE",
        },
      });

      await tx.company.update({
        where: { id: company.id },
        data: { managerId: user.id }
      });

      return { company, user };
    });

    // Envoi de l'email à l'admin de l'entreprise
    await sendOfflineWelcomeEmail(result.user.email, result.user.firstName, result.company.name, result.company.plan, data.password);

    res.status(201).json({ message: "Entreprise hors-ligne créée avec succès.", company: result.company });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: error.issues[0].message });
    res.status(500).json({ message: "Erreur lors de la création de l'entreprise hors-ligne.", error: error.message });
  }
};

/**
 * Renouvelle l'abonnement d'une entreprise hors-ligne en prolongeant la date de fin.
 */
export const renewOfflineSubscription = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const id = String(req.params.id);
    const company = await prisma.company.findUnique({ where: { id } });
    
    if (!company) return res.status(404).json({ message: "Entreprise introuvable." });
    if ((company as any).paymentMode !== 'OFFLINE') return res.status(400).json({ message: "Cette entreprise n'est pas en mode paiement hors-ligne." });

    let currentEnd = company.subscriptionEndsAt ? new Date(company.subscriptionEndsAt) : new Date();
    if (currentEnd < new Date()) currentEnd = new Date();

    const monthsToAdd = (company as any).billingCycle === 'YEARLY' ? 12 : 1;
    currentEnd.setMonth(currentEnd.getMonth() + monthsToAdd);

    const updated = await prisma.company.update({
      where: { id },
      data: {
        subscriptionEndsAt: currentEnd,
        subscriptionStatus: "ACTIVE",
        isActive: true,
        isLocked: false,
      }
    });

    res.json({ message: "Abonnement renouvelé avec succès.", company: updated });
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors du renouvellement.", error: error.message });
  }
};

/**
 * Change le plan ou le cycle d'une entreprise hors-ligne.
 */
export const changeOfflinePlan = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const id = String(req.params.id);
    const { plan, billingCycle } = req.body;
    
    const updated = await prisma.company.update({
      where: { id },
      data: {
        ...(plan && { plan }),
        ...(billingCycle && { billingCycle }),
      }
    });

    res.json({ message: "Plan/Cycle mis à jour avec succès.", company: updated });
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la modification du plan.", error: error.message });
  }
};

/**
 * Récupère les paramètres globaux (ex: Numéros WhatsApp).
 */
export const getSystemSettings = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    // @ts-ignore: Prisma client needs IDE TS Server restart to recognize this new model
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'WHATSAPP_CONTACTS' }
    });
    const contacts = setting ? setting.value : [];
    res.json({ WHATSAPP_CONTACTS: contacts });
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la récupération des paramètres.", error: error.message });
  }
};

/**
 * Met à jour les paramètres globaux (ex: Numéros WhatsApp).
 */
export const updateSystemSettings = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { WHATSAPP_CONTACTS } = req.body;
    
    if (WHATSAPP_CONTACTS !== undefined) {
      // @ts-ignore: Prisma client needs IDE TS Server restart to recognize this new model
      await prisma.systemSetting.upsert({
        where: { key: 'WHATSAPP_CONTACTS' },
        update: { value: WHATSAPP_CONTACTS },
        create: { key: 'WHATSAPP_CONTACTS', value: WHATSAPP_CONTACTS }
      });
    }
    
    res.json({ message: "Paramètres mis à jour avec succès." });
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la mise à jour des paramètres.", error: error.message });
  }
};

/**
 * Diffuse un message/notification générale ou ciblée aux clients SaaS (Super Admin)
 */
export const sendBroadcastMessage = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const superAdminId = req.user?.id || "SYSTEM";
    const {
      subject,
      message,
      targetType = "ALL", // ALL | SELECTED_COMPANIES | PLAN_FILTER | ROLE_FILTER
      targetPlan,
      targetRole,
      sendEmail = "true",
      sendInApp = "true",
    } = req.body;

    let targetCompanyIds: string[] = [];
    if (req.body.targetCompanyIds) {
      if (typeof req.body.targetCompanyIds === 'string') {
        try {
          targetCompanyIds = JSON.parse(req.body.targetCompanyIds);
        } catch {
          targetCompanyIds = [req.body.targetCompanyIds];
        }
      } else if (Array.isArray(req.body.targetCompanyIds)) {
        targetCompanyIds = req.body.targetCompanyIds;
      }
    }

    const shouldSendEmail = sendEmail === true || sendEmail === "true";
    const shouldSendInApp = sendInApp === true || sendInApp === "true";

    if (!subject || !message) {
      return res.status(400).json({ message: "Le sujet et le message sont obligatoires." });
    }

    // Traitement du fichier joint si présent
    let attachmentUrl: string | null = null;
    let attachmentName: string | null = null;

    if (req.file) {
      attachmentName = req.file.originalname;
      attachmentUrl = await uploadToSupabase(req.file as any, 'bamousso');
    }

    // Construction du filtre des utilisateurs destinataires
    const userWhere: any = {
      status: 'ACTIVE'
    };

    if (targetType === 'SELECTED_COMPANIES' && targetCompanyIds.length > 0) {
      userWhere.companyId = { in: targetCompanyIds };
    } else if (targetType === 'PLAN_FILTER' && targetPlan) {
      userWhere.company = { plan: targetPlan };
    }

    if (targetRole && targetRole !== 'ALL') {
      userWhere.role = targetRole;
    }

    // Récupérer les utilisateurs cibles
    const targetUsers = await prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        companyId: true,
        company: {
          select: { name: true }
        }
      }
    });

    // 1. Envoi In-App (Notifications)
    if (shouldSendInApp && targetUsers.length > 0) {
      const notifData = targetUsers.map(u => ({
        title: subject,
        message: message,
        type: 'SYSTEM_BROADCAST',
        userId: u.id,
        companyId: u.companyId,
        read: false
      }));

      await prisma.notification.createMany({
        data: notifData
      });
    }

    // 2. Envoi E-mail via Resend
    if (shouldSendEmail && targetUsers.length > 0) {
      void (async () => {
        for (const u of targetUsers) {
          if (u.email) {
            const recipientName = `${u.firstName} ${u.lastName}`;
            await sendBroadcastEmail(
              u.email,
              recipientName,
              subject,
              message,
              attachmentUrl,
              attachmentName
            );
          }
        }
      })();
    }

    // 3. Enregistrement dans SystemBroadcast
    // @ts-ignore
    const broadcastRecord = await prisma.systemBroadcast.create({
      data: {
        subject,
        message,
        targetType,
        targetPlan: targetPlan || null,
        targetRole: targetRole || null,
        targetCompanyIds,
        sendEmail: shouldSendEmail,
        sendInApp: shouldSendInApp,
        attachmentUrl,
        attachmentName,
        createdById: superAdminId
      }
    });

    res.json({
      success: true,
      message: `Message diffusé avec succès à ${targetUsers.length} destinataire(s).`,
      recipientCount: targetUsers.length,
      broadcast: broadcastRecord
    });
  } catch (error: any) {
    console.error("Erreur diffusion message superadmin:", error);
    res.status(500).json({ message: "Erreur lors de la diffusion du message.", error: error.message });
  }
};

/**
 * Récupère l'historique des diffusions envoyées par le Super Admin
 */
export const getBroadcastHistory = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    // @ts-ignore
    const broadcasts = await prisma.systemBroadcast.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(broadcasts);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la récupération de l'historique de diffusion.", error: error.message });
  }
};

