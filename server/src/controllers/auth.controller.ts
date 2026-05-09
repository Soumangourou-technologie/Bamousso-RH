/**
 * Contrôleur pour la gestion de l'authentification.
 * Gère l'inscription, la connexion et la génération des tokens JWT.
 */
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import prisma from "../utils/prisma.js";
import { z } from "zod";

import { catchAsync } from '../utils/catchAsync.js';

// Schéma de validation pour l'inscription d'un utilisateur
const registerSchema = z.object({
  email: z.string().email("Format d'email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  role: z
    .enum([
      "SUPER_ADMIN",
      "COMPANY_ADMIN",
      "HR_MANAGER",
      "COMMERCIAL",
      "EMPLOYEE",
    ])
    .optional(),
});

// Schéma de validation pour la connexion
const loginSchema = z.object({
  email: z.string().email("Format d'email invalide"),
  password: z.string().min(1, "Le mot de passe est requis"),
});

// Création d'une entreprise + 1er admin (self-serve)
const registerCompanySchema = z.object({
  companyName: z.string().min(2, "Le nom de l'entreprise est requis"),
  email: z.string().email("Format d'email invalide"),
  phone: z.string().min(8, "Numéro de téléphone invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  plan: z.string().optional(),
  extraEmployees: z.number().optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Format d'email invalide"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(10, "Token invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
});

/**
 * Enregistre un nouvel utilisateur (principalement utilisé pour les employés par défaut).
 */
export const register = catchAsync(async (req: Request, res: Response) => {
  try {
    // Validation des données entrantes avec Zod
    const { email, password, firstName, lastName, role } = registerSchema.parse(req.body);

    // Vérification si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Cet utilisateur existe déjà" });
    }

    // Cryptage du mot de passe avec Bcrypt (10 rounds de salage)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Création de l'utilisateur dans la base de données
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: role || "EMPLOYEE",
      },
    });

    res.status(201).json({ 
      message: "Utilisateur créé avec succès", 
      user: { id: user.id, email: user.email, role: user.role } 
    });
  });
};

/**
 * Crée une entreprise (tenant) et le premier compte admin entreprise.
 */
export const registerCompany = catchAsync(async (req: Request, res: Response) => {
  try {
    const { companyName, email, phone, password, firstName, lastName, plan, extraEmployees } = registerCompanySchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Cet utilisateur existe déjà" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const isKoroTrial = plan === "KORO";
      const trialDuration = 7 * 24 * 60 * 60 * 1000; // 7 jours
      
      const company = await tx.company.create({
        data: {
          name: companyName,
          isActive: isKoroTrial ? true : false, // Actif immédiatement si essai Kôrô
          subscriptionStatus: isKoroTrial ? "ACTIVE" : "PAST_DUE", 
          subscriptionEndsAt: null,
          trialEndsAt: isKoroTrial ? new Date(Date.now() + trialDuration) : null,
          plan: plan || "FITINI",
          extraEmployees: extraEmployees || 0,
          isLocked: false,
          lockedAt: null,
        } as any,
      });

      const user = await tx.user.create({
        data: {
          email,
          phone,
          password: hashedPassword,
          firstName,
          lastName,
          role: "COMPANY_ADMIN",
          companyId: company.id,
          status: "ACTIVE",
        },
      });

      return { company, user };
    });

    // NOTE: On ne génère plus de token ici pour empêcher l'accès au dashboard 
    // tant que le paiement n'est pas validé par le Webhook.
    res.status(201).json({
      message: "Entreprise créée. Veuillez procéder au paiement pour activer votre compte.",
      company: { 
        id: result.company.id, 
        name: result.company.name,
        plan: result.company.plan
      }
    });
  });
};

/**
 * Mot de passe oublié : génère un token de reset (hashé en DB).
 * Note MVP : l'envoi email n'est pas branché ici (on pourra ajouter SMTP/Sendgrid).
 */
export const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    // Réponse neutre pour éviter l'énumération d'emails
    if (!user) {
      return res.json({ message: "Si le compte existe, un email de réinitialisation a été envoyé." });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: tokenHash, passwordResetExpiresAt: expiresAt },
    });

    // Envoi de l'email réel via Resend
    // const { success, error: mailError } = await sendResetPasswordEmail(email, rawToken);

    // if (!success) {
    //   console.error("Erreur d'envoi email:", mailError);
    //   // On continue quand même pour ne pas bloquer l'UX, 
    //   // mais en production l'admin verra l'erreur dans les logs.
    // }

    const isProd = process.env.NODE_ENV === "production";

    return res.json({
      message: "Si le compte existe, un email de réinitialisation a été envoyé.",
      ...(isProd ? {} : { devResetToken: rawToken }),
    });
  });
};

/**
 * Réinitialisation mot de passe via token.
 */
export const resetPassword = catchAsync(async (req: Request, res: Response) => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: tokenHash,
        passwordResetExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ message: "Token invalide ou expiré." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      },
    });

    res.json({ message: "Mot de passe mis à jour avec succès." });
  });};

/**
 * Connecte un utilisateur et génère un token JWT.
 */
export const login = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validation des données de connexion
    const { email, password } = loginSchema.parse(req.body);

    // Recherche de l'utilisateur et inclusion de son entreprise
    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: true },
    });

    if (!user) {
      return res.status(400).json({ message: "Identifiants invalides" });
    }

    // Vérification si l'entreprise est active
    // Les COMPANY_ADMIN peuvent toujours se connecter (même si l'entreprise est suspendue)
    // pour accéder à la page de paiement ou voir leur statut.
    // Seuls les simples employés/RH sont bloqués si l'entreprise est suspendue.
    const blockedRoles = ['EMPLOYEE', 'HR_MANAGER', 'COMMERCIAL'];
    if (user.company && !user.company.isActive && blockedRoles.includes(user.role)) {
      return res.status(403).json({ 
        message: "L'accès à cette entreprise a été suspendu. Veuillez contacter l'administrateur." 
      });
    }

    // Comparaison du mot de passe saisi avec le mot de passe crypté en base
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await logger.warn(`Tentative de connexion échouée pour l'email: ${email}`, { ip: req.ip }, "AuthController");
      return res.status(400).json({ message: "Identifiants invalides" });
    }

    // Génération du token JWT (valable 1 jour)
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, companyId: user.companyId },
      jwtSecret,
      { expiresIn: "1d" }
    );

    // Mise à jour du statut en ligne
    await prisma.user.update({
      where: { id: user.id },
      data: { isOnline: true }
    });

    // Retour des informations utilisateur et du token au client
    const responseData = { 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        role: user.role, 
        firstName: user.firstName, 
        lastName: user.lastName, 
        companyId: user.companyId,
        status: (user as any).status,
      },
      company: user.company
        ? {
            id: user.company.id,
            name: user.company.name,
            plan: (user.company as any).plan,
            isLocked: (user.company as any).isLocked,
            isActive: user.company.isActive,
            trialEndsAt: (user.company as any).trialEndsAt,
            subscriptionStatus: (user.company as any).subscriptionStatus,
            extraEmployees: (user.company as any).extraEmployees,
          }
        : null,
    };

    return res.json(responseData);
};

/**
 * Récupère les informations de l'utilisateur connecté (pour rafraîchir le frontend)
 */
export const getCurrentUser = async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Non authentifié" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "Utilisateur introuvable" });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        companyId: user.companyId,
      },
      company: user.company ? {
        id: user.company.id,
        name: user.company.name,
        plan: (user.company as any).plan,
        isActive: user.company.isActive,
        isLocked: (user.company as any).isLocked,
        trialEndsAt: (user.company as any).trialEndsAt,
        subscriptionStatus: (user.company as any).subscriptionStatus,
        extraEmployees: (user.company as any).extraEmployees,
      } : null
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};
