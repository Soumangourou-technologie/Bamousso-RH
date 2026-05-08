import { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import { z } from "zod";

const roleSchema = z.object({
  name: z.string().min(1),
  permissions: z.array(z.string()),
});

export const getRoles = async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    
    // Only fetch roles for the user's company
    const roles = await prisma.customRole.findMany({
      where: { companyId: user.companyId },
      include: {
        _count: {
          select: { users: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(roles);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

export const createRole = async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const { name, permissions } = roleSchema.parse(req.body);

    // Verify if company plan allows custom roles
    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: { plan: true }
    });

    if (company?.plan === "FITINI") {
      return res.status(403).json({ message: "La formule FITINI ne permet pas la création de rôles personnalisés. Veuillez passer à la formule supérieure." });
    }

    const role = await prisma.customRole.create({
      data: {
        name,
        permissions,
        companyId: user.companyId,
      }
    });

    res.status(201).json(role);
  } catch (error: any) {
    res.status(400).json({ message: "Erreur de validation ou serveur.", error: error.message });
  }
};

export const updateRole = async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { name, permissions } = roleSchema.parse(req.body);

    const role = await prisma.customRole.update({
      where: { id, companyId: user.companyId },
      data: { name, permissions }
    });

    res.json(role);
  } catch (error: any) {
    res.status(400).json({ message: "Erreur lors de la mise à jour.", error: error.message });
  }
};

export const deleteRole = async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    // Check if role is used
    const usersWithRole = await prisma.user.count({
      where: { customRoleId: id }
    });

    if (usersWithRole > 0) {
      return res.status(400).json({ message: "Impossible de supprimer ce rôle car il est attribué à des employés." });
    }

    await prisma.customRole.delete({
      where: { id, companyId: user.companyId }
    });

    res.json({ message: "Rôle supprimé avec succès." });
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la suppression.", error: error.message });
  }
};
