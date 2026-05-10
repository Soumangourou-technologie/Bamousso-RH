import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import prisma from "../utils/prisma.js";
import { z } from "zod";
import { catchAsync } from '../utils/catchAsync.js';

const registerSchema = z.object({
  email: z.string().email("Format d'email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  role: z.enum(["SUPER_ADMIN", "COMPANY_ADMIN", "HR_MANAGER", "COMMERCIAL", "EMPLOYEE"]).optional(),
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
  extraEmployees: z.number().optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Format d'email invalide"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(10, "Token invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
});

export const register = catchAsync(async (req: Request, res: Response) => {
  const { email, password, firstName, lastName, role } = registerSchema.parse(req.body);
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(400).json({ message: "Cet utilisateur existe déjà" });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
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

export const registerCompany = catchAsync(async (req: Request, res: Response) => {
  const { companyName, email, phone, password, firstName, lastName, plan, extraEmployees } = registerCompanySchema.parse(req.body);
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(400).json({ message: "Cet utilisateur existe déjà" });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: companyName,
        isActive: false,
        subscriptionStatus: "PAST_DUE", 
        subscriptionEndsAt: null,
        trialEndsAt: null,
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
  res.status(201).json({
    message: "Entreprise créée. Veuillez procéder au paiement pour activer votre compte.",
    company: { 
      id: result.company.id, 
      name: result.company.name,
      plan: result.company.plan
    }
  });
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
  const isProd = process.env.NODE_ENV === "production";
  return res.json({
    message: "Si le compte existe, un email de réinitialisation a été envoyé.",
    ...(isProd ? {} : { devResetToken: rawToken }),
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
  const blockedRoles = ['EMPLOYEE', 'HR_MANAGER', 'COMMERCIAL'];
  if (user.company && !user.company.isActive && blockedRoles.includes(user.role)) {
    return res.status(403).json({ 
      message: "L'accès à cette entreprise a été suspendu. Veuillez contacter l'administrateur." 
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
    company: user.company ? {
      id: user.company.id,
      name: user.company.name,
      plan: (user.company as any).plan,
      isLocked: (user.company as any).isLocked,
      isActive: user.company.isActive,
      trialEndsAt: (user.company as any).trialEndsAt,
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
});
