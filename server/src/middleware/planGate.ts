/**
 * Middleware de contrôle d'accès basé sur le plan d'abonnement.
 * Utilisation : router.get("/route", requirePlan("BAMOUSSO"), handler)
 */
import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./auth.js";
import prisma from "../utils/prisma.js";

// Hiérarchie des plans : FITINI < LOUBA < KORO
const PLAN_HIERARCHY: Record<string, number> = {
  FITINI: 1,
  LOUBA: 2,
  KORO: 3,
};

// Limites d'employés de BASE par plan
export const PLAN_LIMITS: Record<string, number> = {
  FITINI: 5,
  LOUBA: 10,
  KORO: Infinity,
};

/**
 * Middleware vérifiant que le plan de l'entreprise est suffisant.
 * @param minPlan Plan minimum requis ("PIKIN" | "BAMOUSSO" | "KORO")
 */
export const requirePlan = (minPlan: "FITINI" | "LOUBA" | "KORO") => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Non authentifié." });

      // SUPER_ADMIN : accès total
      if (user.role === "SUPER_ADMIN") return next();

      if (!user.companyId) {
        return res.status(403).json({ message: "Aucune entreprise associée." });
      }

      const company = await prisma.company.findUnique({
        where: { id: user.companyId },
        select: { plan: true }
      });

      if (!company) {
        return res.status(404).json({ message: "Entreprise introuvable." });
      }

      const companyPlanLevel = PLAN_HIERARCHY[company.plan] || 1;
      const requiredLevel = PLAN_HIERARCHY[minPlan] || 1;

      if (companyPlanLevel < requiredLevel) {
        return res.status(403).json({
          message: `Cette fonctionnalité nécessite le plan "${minPlan}" ou supérieur. Votre plan actuel : "${company.plan}".`,
          requiredPlan: minPlan,
          currentPlan: company.plan,
          upgradeRequired: true,
        });
      }

      next();
    } catch (error: any) {
      res.status(500).json({ message: "Erreur de vérification du plan.", error: error.message });
    }
  };
};

/**
 * Middleware vérifiant la limite d'employés selon le plan.
 * À utiliser avant la création d'un employé.
 */
export const checkEmployeeLimit = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Non authentifié." });
    if (user.role === "SUPER_ADMIN") return next();
    if (!user.companyId) return next();

    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: { plan: true, extraEmployees: true, _count: { select: { users: true } } }
    });

    if (!company) return next();

    const baseLimit = PLAN_LIMITS[company.plan] || 3;
    const extraLimit = company.extraEmployees || 0;
    const totalLimit = baseLimit + extraLimit;
    const currentCount = company._count.users;

    if (currentCount >= totalLimit) {
      return res.status(403).json({
        message: `Limite d'employés atteinte (${currentCount}/${totalLimit}). Veuillez upgrader votre plan ou ajouter des employés supplémentaires.`,
        currentCount,
        limit: totalLimit,
        currentPlan: company.plan,
        upgradeRequired: true,
      });
    }

    next();
  } catch (error: any) {
    res.status(500).json({ message: "Erreur de vérification de la limite.", error: error.message });
  }
};
