import { Response } from "express";
import prisma from "../utils/prisma.js";
import { AuthRequest } from "../middleware/auth.js";

// =======================
// CREATE MISSION
// =======================
export const createMission = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.companyId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (user.role !== "SUPER_ADMIN" && user.role !== "COMPANY_ADMIN" && user.role !== "HR_MANAGER") {
       return res.status(403).json({ message: "Accès refusé pour la création de mission." });
    }

    const { title, description, type, dueDate, clientName, clientPhone, address, assignedToId } = req.body;

    if (!title || !type || !assignedToId) {
      return res.status(400).json({ message: "Titre, type et employé assigné sont requis." });
    }

    const mission = await prisma.mission.create({
      data: {
        title,
        description,
        type,
        dueDate: dueDate ? new Date(dueDate) : null,
        clientName,
        clientPhone,
        address,
        companyId: user.companyId,
        assignedToId,
        createdById: user.id
      }
    });

    res.status(201).json(mission);
  } catch (error: any) {
    console.error("Error creating mission:", error);
    res.status(500).json({ message: "Erreur lors de la création de la mission.", error: error.message });
  }
};

// =======================
// GET MISSIONS
// =======================
export const getMissions = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.companyId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const typeFilter = req.query.type as string; // LIVRAISON ou PROSPECTION
    
    let whereClause: any = { companyId: user.companyId };
    
    if (typeFilter) {
      whereClause.type = typeFilter;
    }

    // Si pas Admin ni HR, on ne voit que ses propres missions
    if (user.role !== "SUPER_ADMIN" && user.role !== "COMPANY_ADMIN" && user.role !== "HR_MANAGER") {
       whereClause.assignedToId = user.id;
    }

    const missions = await prisma.mission.findMany({
      where: whereClause,
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, role: true }
        },
        createdBy: {
           select: { id: true, firstName: true, lastName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(missions);
  } catch (error: any) {
    console.error("Error fetching missions:", error);
    res.status(500).json({ message: "Erreur lors de la récupération des missions.", error: error.message });
  }
};

// =======================
// VALIDATE MISSION
// =======================
export const validateMission = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;
    
    if (!user || !user.companyId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { validationMode, signatureUrl } = req.body;

    if (!validationMode) {
      return res.status(400).json({ message: "Le mode de validation est requis (SIGNATURE ou CHECKBOX)." });
    }

    const mission = await prisma.mission.findUnique({ where: { id: id as string } });

    if (!mission) {
      return res.status(404).json({ message: "Mission non trouvée." });
    }

    if (mission.companyId !== user.companyId) {
       return res.status(403).json({ message: "Accès refusé." });
    }

    // Seul l'assigné ou un admin peut valider
    if (mission.assignedToId !== user.id && user.role !== "SUPER_ADMIN" && user.role !== "COMPANY_ADMIN") {
      return res.status(403).json({ message: "Vous ne pouvez pas valider cette mission." });
    }

    const updatedMission = await prisma.mission.update({
      where: { id: id as string },
      data: {
        status: "VALIDEE",
        validationMode,
        signatureUrl,
        validatedAt: new Date()
      },
      include: {
        assignedTo: { select: { firstName: true, lastName: true } }
      }
    });

    // 🔔 Envoyer une notification en temps réel aux admins
    const admins = await prisma.user.findMany({
      where: { 
        companyId: user.companyId,
        role: { in: ["COMPANY_ADMIN", "SUPER_ADMIN"] }
      }
    });

    const notifications = admins.map(admin => ({
      title: `Mission Validée : ${updatedMission.title}`,
      message: `${updatedMission.assignedTo.firstName} a validé une mission de ${updatedMission.type}.`,
      type: "MISSION_VALIDATED",
      resourceId: updatedMission.id,
      userId: admin.id,
      companyId: user.companyId,
    }));

    if (notifications.length > 0) {
      await prisma.notification.createMany({ data: notifications });
    }

    res.json(updatedMission);
  } catch (error: any) {
    console.error("Error validating mission:", error);
    res.status(500).json({ message: "Erreur lors de la validation.", error: error.message });
  }
};
