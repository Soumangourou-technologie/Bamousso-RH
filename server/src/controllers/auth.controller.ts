import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import prisma from "../utils/prisma.js";
import { z } from "zod";
import { catchAsync } from '../utils/catchAsync.js';
import { sendPasswordResetEmail, sendRegistrationWelcomeEmail } from '../utils/mailer.js';

const registerSchema = z.object({
  email: z.string().trim().email("Format d'email invalide").max(254),
  password: z.string().min(8).refine(value => Buffer.byteLength(value, "utf8") <= 72),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
});

const loginSchema = z.object({
  email: z.string().email("Format d'email invalide"),
  password: z.string().min(1, "Le mot de passe est requis"),
});

const registerCompanySchema = z.object({
  companyName: z.string().min(2, "Le nom de l'entreprise est requis"),
  email: z.string().email("Format d'email invalide"),
  phone: z.string().min(8, "Numéro de téléphone invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  plan: z.string().optional(),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']).optional(),
  extraEmployees: z.coerce.number().optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Format d'email invalide"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(10, "Token invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
});

export const register = catchAsync(async (req: Request, res: Response) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ message: "Vérifiez le nom, l’adresse e-mail et le mot de passe (8 caractères minimum)." });
  const { email, password, firstName, lastName } = result.data;
  try {
    const user = await prisma.user.create({
      data: { email, firstName, lastName, password: await bcrypt.hash(password, 10), role: "PERSONAL" },
      select: { id: true, email: true, role: true },
    });
    res.status(201).json({ message: "Compte personnel créé.", user });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({ message: "Cet e-mail est déjà utilisé. Connectez-vous à votre compte existant." });
    }
    throw error;
  }
});

export const registerCompany = catchAsync(async (req: Request, res: Response) => {
  try {
    const result = registerCompanySchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        message: "Données invalides", 
        errors: result.error.issues.map(e => e.message) 
      });
    }

    const { companyName, email, phone, password, firstName, lastName, plan, billingCycle, extraEmployees } = result.data;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Cet email est déjà utilisé par un autre utilisateur" });
    }

    // Vérifier si l'entreprise existe déjà
    const existingCompany = await prisma.company.findFirst({ where: { name: companyName } });
    if (existingCompany) {
      return res.status(400).json({ message: "Ce nom d'entreprise est déjà utilisé" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }

    // Générer un token d'inscription temporaire (aucune insertion DB ni envoi d'email avant paiement réel)
    const pendingRegistrationToken = jwt.sign(
      { 
        companyName,
        email,
        phone,
        hashedPassword,
        rawPassword: password,
        firstName,
        lastName,
        plan: plan || "FITINI",
        billingCycle: billingCycle || "MONTHLY",
        extraEmployees: extraEmployees || 0
      },
      jwtSecret,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      success: true,
      message: "Inscription initialisée. Veuillez procéder au paiement pour créer votre espace.",
      pendingRegistrationToken,
      registrationData: {
        companyName,
        email,
        phone,
        firstName,
        lastName,
        plan: plan || "FITINI",
        billingCycle: billingCycle || "MONTHLY",
        extraEmployees: extraEmployees || 0
      }
    });
  } catch (error: any) {
    console.error("ERREUR CRITIQUE [registerCompany]:", error);
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return res.status(400).json({ message: "Le nom de l'entreprise ou l'email est déjà utilisé" });
      }
    }

    // On ne renvoie plus d'informations sensibles (stack trace) même en dev
    return res.status(500).json({ 
      message: "Erreur lors de la création du compte",
    });
  }
});

export const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const { email } = forgotPasswordSchema.parse(req.body);
  const user = await prisma.user.findUnique({
    where: { email },
    include: { customRole: true },
  });
  if (!user) {
    return res.json({ message: "Si le compte existe, un email de réinitialisation a été envoyé." });
  }
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordResetToken: tokenHash, passwordResetExpiresAt: expiresAt },
  });

  // Envoi automatique de l'e-mail via Resend
  await sendPasswordResetEmail(user.email, `${user.firstName} ${user.lastName}`, rawToken);

  return res.json({
    message: "Si le compte existe, un email de réinitialisation a été envoyé."
  });
});

export const resetPassword = catchAsync(async (req: Request, res: Response) => {
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
});

export const login = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({
    where: { email },
    include: { company: true, customRole: true },
  });
  if (!user) {
    return res.status(400).json({ message: "Identifiants invalides" });
  }
  if (user.company && !user.company.isActive && user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ 
      message: "Compte en attente d'activation. Veuillez finaliser votre paiement." 
    });
  }
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: "Identifiants invalides" });
  }
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }
  const token = jwt.sign(
    { 
      id: user.id, 
      role: user.role, 
      companyId: user.companyId, 
      permissions: user.customRole?.permissions || [] 
    },
    jwtSecret,
    { expiresIn: "1d" }
  );
  await prisma.user.update({
    where: { id: user.id },
    data: { isOnline: true }
  });
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const,
    maxAge: 24 * 60 * 60 * 1000 // 1 jour
  };

  res.cookie('token', token, cookieOptions);

  const responseData = { 
    user: { 
      id: user.id, 
      email: user.email, 
      role: user.role, 
      firstName: user.firstName, 
      lastName: user.lastName, 
      companyId: user.companyId,
      status: (user as any).status,
      permissions: user.customRole?.permissions || [],
      currentLat: user.currentLat,
      currentLng: user.currentLng,
      lastLocationUpdate: user.lastLocationUpdate,
    },
    company: user.company ? {
      id: user.company.id,
      name: user.company.name,
      logoUrl: user.company.logoUrl,
      plan: (user.company as any).plan,
      billingCycle: (user.company as any).billingCycle,
      isLocked: (user.company as any).isLocked,
      isActive: user.company.isActive,
      trialEndsAt: (user.company as any).trialEndsAt,
      subscriptionEndsAt: (user.company as any).subscriptionEndsAt,
      subscriptionStatus: (user.company as any).subscriptionStatus,
      extraEmployees: (user.company as any).extraEmployees,
    } : null,
  };
  return res.json(responseData);
});

export const getCurrentUser = catchAsync(async (req: any, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: "Non authentifié" });
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { company: true, customRole: true },
  });
  if (!user) {
    return res.status(404).json({ success: false, message: "Utilisateur introuvable" });
  }

  // Refresh the JWT token with the latest user roles and permissions from DB
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret) {
    const token = jwt.sign(
      { 
        id: user.id, 
        role: user.role, 
        companyId: user.companyId, 
        permissions: user.customRole?.permissions || [] 
      },
      jwtSecret,
      { expiresIn: "1d" }
    );
    
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const,
      maxAge: 24 * 60 * 60 * 1000 // 1 jour
    };
    res.cookie('token', token, cookieOptions);
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
      permissions: user.customRole?.permissions || [],
      currentLat: user.currentLat,
      currentLng: user.currentLng,
      lastLocationUpdate: user.lastLocationUpdate,
    },
    company: user.company ? {
      id: user.company.id,
      name: user.company.name,
      logoUrl: user.company.logoUrl,
      plan: (user.company as any).plan,
      billingCycle: (user.company as any).billingCycle,
      isActive: user.company.isActive,
      isLocked: (user.company as any).isLocked,
      trialEndsAt: (user.company as any).trialEndsAt,
      subscriptionEndsAt: (user.company as any).subscriptionEndsAt,
      subscriptionStatus: (user.company as any).subscriptionStatus,
      extraEmployees: (user.company as any).extraEmployees,
    } : null
  });
});

export const logout = catchAsync(async (req: any, res: Response) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const,
  });
  
  if (req.user?.id) {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { isOnline: false }
    }).catch(() => {});
  }
  
  res.json({ success: true, message: "Déconnecté avec succès" });
});
