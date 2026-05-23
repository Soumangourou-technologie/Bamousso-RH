import { Request, Response } from "express";
import prisma from "../utils/prisma.js";

// Lister tous les cas disciplinaires d'une entreprise
export const getDisciplinaryCases = async (req: Request, res: Response): Promise<any> => {
  try {
    const currentUser = (req as any).user;
    const cases = await prisma.disciplinaryCase.findMany({
      where: { companyId: currentUser.companyId },
      include: {
        involvedEmployee: { select: { id: true, firstName: true, lastName: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(cases);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

// Créer un nouveau cas disciplinaire
export const createDisciplinaryCase = async (req: Request, res: Response): Promise<any> => {
  try {
    const currentUser = (req as any).user;
    const { title, description, involvedEmployeeId } = req.body;

    // Validation simple
    if (!title || !description || !involvedEmployeeId) {
      return res.status(400).json({ message: "Titre, description et employé sont requis." });
    }

    // Vérifier que l'employé cible appartient à la même entreprise
    const targetEmployee = await prisma.user.findFirst({
      where: { id: involvedEmployeeId, companyId: currentUser.companyId }
    });

    if (!targetEmployee) {
      return res.status(404).json({ message: "Employé non trouvé ou n'appartenant pas à votre entreprise." });
    }

    const newCase = await prisma.disciplinaryCase.create({
      data: {
        title,
        description,
        involvedEmployeeId,
        companyId: currentUser.companyId,
      }
    });

    // Notifier l'employé concerné
    await prisma.notification.create({
      data: {
        title: "Nouveau cas disciplinaire",
        message: `Un cas disciplinaire vous concernant a été ouvert : ${title}`,
        type: "EXPLANATION",
        resourceId: newCase.id,
        userId: involvedEmployeeId,
        companyId: currentUser.companyId
      }
    });

    res.status(201).json(newCase);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};
