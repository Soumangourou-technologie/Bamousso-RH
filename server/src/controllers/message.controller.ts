import { Response } from "express";
import prisma from "../utils/prisma.js";
import { z } from "zod";
import { createNotification } from "../utils/notifications.js";

const sendMessageSchema = z.object({
  recipientId: z.string().uuid(),
  content: z.string().min(1),
  attachmentUrl: z.string().optional(),
  attachmentType: z.string().optional(),
});

export const getMessages = async (req: any, res: Response) => {
  try {
    const { contactId } = req.params;
    const userId = req.user.id;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, recipientId: contactId },
          { senderId: contactId, recipientId: userId },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la récupération des messages", error: error.message });
  }
};

export const sendMessage = async (req: any, res: Response) => {
  try {
    const { recipientId, content, attachmentUrl, attachmentType } = sendMessageSchema.parse(req.body);
    const userId = req.user.id;

    const message = await prisma.message.create({
      data: {
        content,
        senderId: userId,
        recipientId,
        attachmentUrl,
        attachmentType,
      },
      include: {
        sender: { select: { firstName: true, lastName: true } }
      }
    });

    // Notifier le destinataire
    await createNotification({
      title: "Nouveau message",
      message: `Vous avez reçu un message de ${message.sender.firstName} ${message.sender.lastName}`,
      userId: recipientId
    });

    res.status(201).json(message);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de l'envoi du message", error: error.message });
  }
};

export const getContacts = async (req: any, res: Response) => {
  try {
    const user = req.user;

    // Si c'est un SUPER_ADMIN, il voit les autres SUPER_ADMIN et tous les utilisateurs avec qui il a un historique de messages
    if (user.role === 'SUPER_ADMIN') {
      // 1. Récupérer les ID de tous les utilisateurs ayant échangé avec ce super admin
      const messages = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: user.id },
            { recipientId: user.id }
          ]
        },
        select: { senderId: true, recipientId: true }
      });

      const contactIds = new Set<string>();
      messages.forEach((m: any) => {
        if (m.senderId !== user.id) contactIds.add(m.senderId);
        if (m.recipientId !== user.id) contactIds.add(m.recipientId);
      });

      // 2. Ajouter aussi les autres SUPER_ADMIN par défaut
      const superAdmins = await prisma.user.findMany({
        where: { 
          role: 'SUPER_ADMIN',
          id: { not: user.id }
        },
        select: { id: true }
      });
      superAdmins.forEach((s: any) => contactIds.add(s.id));

      // 3. Récupérer les informations de tous ces contacts
      const contactsUsers = await prisma.user.findMany({
        where: {
          id: { in: Array.from(contactIds) }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          company: { select: { name: true } }
        }
      });

      const contacts = contactsUsers.map((u: any) => ({
        id: u.id,
        name: u.company ? `${u.firstName} ${u.lastName} (${u.company.name})` : `${u.firstName} ${u.lastName}`,
        role: u.role,
        isSupport: u.role === 'SUPER_ADMIN'
      }));

      return res.json(contacts);
    }

    // Comportement normal pour les autres utilisateurs
    // 1. Récupérer les employés de la même entreprise
    const employees = await prisma.user.findMany({
      where: {
        companyId: user.companyId,
        id: { not: user.id },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
      },
    });

    // 2. Récupérer un super-admin pour le support
    const superAdmin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      }
    });

    const contacts = employees.map(emp => ({
      id: emp.id,
      name: `${emp.firstName} ${emp.lastName}`,
      role: emp.role,
      isSupport: false
    }));

    if (superAdmin) {
      contacts.unshift({
        id: superAdmin.id,
        name: 'Support Bamousso',
        role: 'SUPER_ADMIN',
        isSupport: true
      });
    }

    res.json(contacts);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la récupération des contacts", error: error.message });
  }
};
