import { Response } from "express";
import prisma from "../utils/prisma.js";
import { z } from "zod";
import { notifyAdmins } from "../utils/notifications.js";

const suggestionSchema = z.object({
  nature: z.string().min(1),
  description: z.string().min(1),
  isAnonymous: z.boolean().optional().default(false),
  targetAudience: z.string().optional().default("ALL"),
});

export const reportSuggestion = async (req: any, res: Response) => {
  try {
    const { nature, description, isAnonymous, targetAudience } = suggestionSchema.parse(req.body);
    const user = req.user;

    const suggestion = await prisma.suggestion.create({
      data: {
        nature,
        description,
        isAnonymous,
        targetAudience,
        reporterId: user.id,
        companyId: user.companyId,
      },
    });

    // Notifier les admins (selon la cible)
    if (targetAudience === "COMPANY_ADMIN") {
      await notifyAdmins(user.companyId, "Nouvelle suggestion", `Une suggestion a été déposée pour la direction.`, "SUGGESTION", suggestion.id, "COMPANY_ADMIN");
    } else if (targetAudience === "HR") {
      await notifyAdmins(user.companyId, "Nouvelle suggestion", `Une suggestion a été déposée pour les ressources humaines.`, "SUGGESTION", suggestion.id, "HR");
    } else {
      await notifyAdmins(user.companyId, "Nouvelle suggestion", `Une nouvelle suggestion (${nature}) a été déposée.`, "SUGGESTION", suggestion.id);
    }

    res.status(201).json(suggestion);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de l'envoi de la suggestion", error: error.message });
  }
};

export const getSuggestions = async (req: any, res: Response) => {
  try {
    const user = req.user;
    
    let whereClause: any = { companyId: user.companyId };
    
    // Filtres selon le rôle
    if (user.role === "EMPLOYEE") {
      whereClause.reporterId = user.id;
    } else if (user.role === "COMPANY_ADMIN") {
      // Le boss voit "ALL" et "COMPANY_ADMIN", mais on va aussi inclure ses propres suggestions (au cas où)
      whereClause = {
        companyId: user.companyId,
        OR: [
          { targetAudience: { in: ["ALL", "COMPANY_ADMIN"] } },
          { reporterId: user.id }
        ]
      };
    } else if (user.role === "HR_MANAGER" || user.role === "HR_ASSISTANT" || user.role === "RH") {
      // Les RH voient "ALL" et "HR", plus les leurs
      whereClause = {
        companyId: user.companyId,
        OR: [
          { targetAudience: { in: ["ALL", "HR"] } },
          { reporterId: user.id }
        ]
      };
    }

    const suggestions = await prisma.suggestion.findMany({
      where: whereClause,
      include: {
        reporter: {
          select: { firstName: true, lastName: true, role: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(suggestions);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la récupération des suggestions", error: error.message });
  }
};

export const updateSuggestionStatus = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const suggestion = await prisma.suggestion.update({
      where: { id },
      data: { status }
    });
    
    res.json(suggestion);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la mise à jour", error: error.message });
  }
};
