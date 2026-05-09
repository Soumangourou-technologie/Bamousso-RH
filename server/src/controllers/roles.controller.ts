import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import { z } from 'zod';
import { catchAsync } from '../utils/catchAsync.js';

const roleSchema = z.object({
  name: z.string().min(2, "Le nom du rôle est requis."),
  permissions: z.array(z.string()).min(1, "Au moins une permission est requise."),
});

export const getRoles = catchAsync(async (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const roles = await prisma.customRole.findMany({
    where: { companyId: currentUser.companyId },
    orderBy: { name: 'asc' },
  });
  res.json(roles);
});

export const createRole = catchAsync(async (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { name, permissions } = roleSchema.parse(req.body);

  const newRole = await prisma.customRole.create({
    data: {
      name,
      permissions,
      companyId: currentUser.companyId,
    },
  });
  res.status(201).json(newRole);
});

export const updateRole = catchAsync(async (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!id) return res.status(400).json({ message: 'ID du rôle manquant.' });

  const { name, permissions } = roleSchema.parse(req.body);

  const roleToUpdate = await prisma.customRole.findFirst({
    where: { id, companyId: currentUser.companyId },
  });

  if (!roleToUpdate) {
    return res.status(404).json({ message: 'Rôle non trouvé.' });
  }

  const updatedRole = await prisma.customRole.update({
    where: { id },
    data: { name, permissions },
  });
  res.json(updatedRole);
});

export const deleteRole = catchAsync(async (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!id) return res.status(400).json({ message: 'ID du rôle manquant.' });

  const roleToDelete = await prisma.customRole.findFirst({
    where: { id, companyId: currentUser.companyId },
  });

  if (!roleToDelete) {
    return res.status(404).json({ message: 'Rôle non trouvé.' });
  }

  await prisma.customRole.delete({ where: { id } });
  res.status(204).send();
});
