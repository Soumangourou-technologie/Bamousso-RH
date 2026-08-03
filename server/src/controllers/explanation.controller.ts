import { Response } from "express";
import prisma from "../utils/prisma.js";
import { z } from "zod";
import { createNotification } from "../utils/notifications.js";

const createExplanationSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  employeeId: z.string().uuid(),
});

const respondExplanationSchema = z.object({
  response: z.string().min(1),
});

export const createExplanation = async (req: any, res: Response) => {
  try {
    const { title, description, employeeId } = createExplanationSchema.parse(req.body);
    const user = req.user;

    const explanation = await prisma.explanationRequest.create({
      data: {
        title,
        description,
        employeeId,
        createdBy: user.id,
        companyId: user.companyId,
      },
    });

    // Notifier l'employé
    await createNotification({
      title: "Demande d'explication",
      message: `Vous avez reçu une demande d'explication : ${title}`,
      type: "EXPLANATION",
      resourceId: explanation.id,
      userId: employeeId,
      companyId: user.companyId
    });

    res.status(201).json(explanation);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la création de la demande", error: error.message });
  }
};

export const getExplanations = async (req: any, res: Response) => {
  try {
    const user = req.user;
    
    let whereClause: any = { companyId: user.companyId };
    
    // Si employé, il voit les demandes qui lui sont adressées
    if (user.role === "EMPLOYEE") {
      whereClause.employeeId = user.id;
    }

    const explanations = await prisma.explanationRequest.findMany({
      where: whereClause,
      include: {
        employee: { select: { firstName: true, lastName: true } },
        creator: { select: { firstName: true, lastName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(explanations);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la récupération des demandes", error: error.message });
  }
};

export const respondExplanation = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { response } = respondExplanationSchema.parse(req.body);
    const user = req.user;

    const explanation = await prisma.explanationRequest.findUnique({ where: { id } });
    if (!explanation) return res.status(404).json({ message: "Demande non trouvée" });

    if (explanation.employeeId !== user.id) {
      return res.status(403).json({ message: "Non autorisé" });
    }

    const updated = await prisma.explanationRequest.update({
      where: { id },
      data: { 
        response,
        status: 'RESPONDED'
      }
    });

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    const fullName = dbUser ? `${dbUser.firstName} ${dbUser.lastName}` : 'Un employé';

    // Notifier le créateur (Admin/RH)
    await createNotification({
      title: "Réponse à demande d'explication",
      message: `${fullName} a répondu à votre demande d'explication.`,
      type: "EXPLANATION",
      resourceId: updated.id,
      userId: updated.createdBy,
      companyId: user.companyId
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la réponse", error: error.message });
  }
};

export const closeExplanation = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const explanation = await prisma.explanationRequest.findUnique({ where: { id } });
    if (!explanation) return res.status(404).json({ message: "Demande non trouvée" });

    if (user.role !== "COMPANY_ADMIN" && user.role !== "HR_MANAGER") {
      return res.status(403).json({ message: "Non autorisé" });
    }

    const updated = await prisma.explanationRequest.update({
      where: { id },
      data: { status: 'CLOSED' }
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la clôture", error: error.message });
  }
};
