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
    const { id } = req.params;
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { company: true }
    });

    if (!payment) {
      return res.status(404).json({ message: "Paiement introuvable." });
    }

    // Extraire le plan de la description
    let plan = 'FITINI';
    if (payment.description && payment.description.includes('- ')) {
      plan = payment.description.split('- ')[1];
    }

    const pdfBuffer = await generateSubscriptionPDF({
      companyName: payment.company.name,
      plan: plan,
      amount: payment.amount,
      date: new Date(payment.createdAt).toLocaleDateString('fr-FR'),
      transactionId: payment.externalId || payment.reference
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Facture_${payment.company.name.replace(/\s+/g, '_')}_${payment.reference}.pdf`);
    res.send(pdfBuffer);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la génération de la facture.", error: error.message });
  }
};
