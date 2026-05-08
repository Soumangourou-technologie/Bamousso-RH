import { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import { uploadToSupabase } from "../utils/supabase.js";
import { createNotification } from "../utils/notifications.js";

export const uploadDocument = async (req: Request, res: Response): Promise<any> => {
  try {
    const { title, type, employeeId } = req.body;
    const file = (req as any).file;
    const currentUser = (req as any).user;

    if (!file) {
      return res.status(400).json({ message: "Aucun fichier fourni." });
    }

    // Vérifier que l'employé appartient bien à l'entreprise de l'utilisateur connecté
    const targetEmployee = await prisma.user.findFirst({
      where: {
        id: employeeId,
        companyId: currentUser.companyId
      }
    });

    if (!targetEmployee && currentUser.role !== "SUPER_ADMIN") {
      return res.status(403).json({ message: "Action non autorisée : l'employé n'appartient pas à votre entreprise." });
    }

    // Upload vers Supabase Storage
    const fileUrl = await uploadToSupabase(file, 'documents');

    if (!fileUrl) {
      return res.status(500).json({ message: "Erreur lors de l'upload du fichier vers Supabase." });
    }

    const doc = await prisma.document.create({
      data: {
        title,
        type, // PAYSLIP, CONTRACT, POLICY
        url: fileUrl,
        employeeId
      }
    });

    // Notifier l'employé
    await createNotification({
      title: "Nouveau document",
      message: `Un nouveau document (${title}) a été ajouté à votre espace.`,
      type: "DOCUMENT",
      resourceId: doc.id,
      userId: employeeId,
      companyId: currentUser.companyId
    });

    res.status(201).json(doc);
  } catch (error: any) {
    console.error("DEBUG UPLOAD ERROR:", error);
    res.status(500).json({ 
      message: "Erreur serveur lors de l'upload.", 
      error: error.message 
    });
  }
};

export const getDocuments = async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    
    // Si employé, il ne voit que ses documents
    if (user.role === "EMPLOYEE") {
      const docs = await prisma.document.findMany({
        where: { employeeId: user.id },
        orderBy: { createdAt: 'desc' }
      });
      return res.json(docs);
    }

    // HR/Admin voit les documents de toute l'entreprise
    const docs = await prisma.document.findMany({
      where: {
        employee: { companyId: user.companyId }
      },
      include: { employee: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(docs);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};
