import { Response } from "express";
import prisma from "../utils/prisma.js";
import { z } from "zod";

// Validations de schéma
const createTicketSchema = z.object({
  title: z.string().min(3, "Le titre doit contenir au moins 3 caractères"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional().default("MEDIUM"),
  content: z.string().min(1, "Le contenu du premier message est requis"),
});

const replyTicketSchema = z.object({
  content: z.string().min(1, "Le contenu du message est requis"),
});

/**
 * 1. Création d'un Ticket Support
 * Accessible aux COMPANY_ADMIN (avec forfait FITINI) et SUPER_ADMIN
 */
export const createTicket = async (req: any, res: Response) => {
  try {
    const { title, priority, content } = createTicketSchema.parse(req.body);
    const user = req.user;

    // 1. Vérification entreprise
    const company = await prisma.company.findUnique({
      where: { id: user.companyId }
    });

    if (!company) {
      return res.status(404).json({ message: "Entreprise introuvable." });
    }

    // 2. Contrôle du Plan (Vérifier s'ils ont FITINI ou si l'administrateur permet le bypass)
    // Si ce n'est pas FITINI, on les invite plutôt à utiliser le live chat, mais on autorise la création si nécessaire.
    if (company.plan !== "FITINI" && user.role !== "SUPER_ADMIN") {
      // Optionnel : Restreindre aux tickets UNIQUEMENT si FITINI (selon logique métier)
      // Pour l'instant, on les redirige via un code spécifique au cas où
      return res.status(403).json({
        code: "USE_LIVE_CHAT",
        message: "Votre formule vous donne accès à l'assistance par Chat en direct. Veuillez l'utiliser pour une réponse instantanée."
      });
    }

    // 3. Création atomique (Transaction) du Ticket + Premier message
    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.supportTicket.create({
        data: {
          title,
          priority,
          companyId: user.companyId,
          createdById: user.id,
        },
      });

      const message = await tx.supportTicketMessage.create({
        data: {
          content,
          ticketId: ticket.id,
          senderId: user.id,
        },
      });

      return { ticket, message };
    });

    res.status(201).json({
      message: "Ticket support créé avec succès",
      ticket: result.ticket,
      initialMessage: result.message
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Données invalides", errors: error.issues });
    }
    res.status(500).json({ message: "Erreur lors de la création du ticket", error: error.message });
  }
};

/**
 * 2. Liste de tous les Tickets
 * Filtré par entreprise si COMPANY_ADMIN, complet pour SUPER_ADMIN
 */
export const getTickets = async (req: any, res: Response) => {
  try {
    const user = req.user;
    let whereClause: any = {};

    if (user.role !== "SUPER_ADMIN") {
      whereClause.companyId = user.companyId;
    }

    const tickets = await prisma.supportTicket.findMany({
      where: whereClause,
      include: {
        company: {
          select: { name: true, plan: true }
        },
        createdBy: {
          select: { firstName: true, lastName: true, email: true }
        },
        _count: {
          select: { messages: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json(tickets);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la récupération des tickets", error: error.message });
  }
};

/**
 * 3. Détails d'un Ticket + Fil de discussion
 */
export const getTicketDetails = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        company: {
          select: { name: true, plan: true }
        },
        createdBy: {
          select: { firstName: true, lastName: true, email: true }
        },
        messages: {
          include: {
            sender: {
              select: { firstName: true, lastName: true, role: true }
            }
          },
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ message: "Ticket introuvable." });
    }

    // Vérification droits d'accès
    if (user.role !== "SUPER_ADMIN" && ticket.companyId !== user.companyId) {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à voir ce ticket." });
    }

    res.json(ticket);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la lecture du ticket", error: error.message });
  }
};

/**
 * 4. Répondre à un Ticket
 */
export const replyToTicket = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = replyTicketSchema.parse(req.body);
    const user = req.user;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id }
    });

    if (!ticket) {
      return res.status(404).json({ message: "Ticket introuvable." });
    }

    // Droit d'accès
    if (user.role !== "SUPER_ADMIN" && ticket.companyId !== user.companyId) {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à répondre à ce ticket." });
    }

    // Ajouter le message
    const message = await prisma.supportTicketMessage.create({
      data: {
        content,
        ticketId: id,
        senderId: user.id,
      },
      include: {
        sender: {
          select: { firstName: true, lastName: true, role: true }
        }
      }
    });

    // Mettre à jour le statut automatique
    let updateData: any = { updatedAt: new Date() };
    if (user.role === "SUPER_ADMIN") {
      updateData.status = "IN_PROGRESS"; // Passe en cours quand le support répond
    }

    await prisma.supportTicket.update({
      where: { id },
      data: updateData
    });

    res.status(201).json(message);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Données invalides", errors: error.issues });
    }
    res.status(500).json({ message: "Erreur lors de l'envoi de la réponse", error: error.message });
  }
};

/**
 * 5. Modifier le Statut d'un Ticket
 */
export const updateTicketStatus = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // OPEN, IN_PROGRESS, RESOLVED, CLOSED
    const user = req.user;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id }
    });

    if (!ticket) {
      return res.status(404).json({ message: "Ticket introuvable." });
    }

    // Droit d'accès
    if (user.role !== "SUPER_ADMIN" && ticket.companyId !== user.companyId) {
      return res.status(403).json({ message: "Non autorisé." });
    }

    const updatedTicket = await prisma.supportTicket.update({
      where: { id },
      data: { 
        status, 
        updatedAt: new Date() 
      }
    });

    res.json({
      message: `Statut du ticket mis à jour vers ${status}`,
      ticket: updatedTicket
    });
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la mise à jour du statut", error: error.message });
  }
};

// ==========================================================
// --- SECTION CHAT EN DIRECT (FORMULES LOUBA & KORO) ---
// ==========================================================

const createChatMessageSchema = z.object({
  content: z.string().min(1, "Le message ne peut pas être vide"),
});

/**
 * 6. Récupérer ou Créer le salon de Chat de l'entreprise (COMPANY_ADMIN)
 */
export const getOrCreateChatRoom = async (req: any, res: Response) => {
  try {
    const user = req.user;

    if (!user.companyId) {
      return res.status(400).json({ message: "Compte non associé à une entreprise." });
    }

    // 1. Vérifier le plan de l'entreprise
    const company = await prisma.company.findUnique({
      where: { id: user.companyId }
    });

    if (!company) {
      return res.status(404).json({ message: "Entreprise introuvable." });
    }

    if (company.plan === "FITINI" && user.role !== "SUPER_ADMIN") {
      return res.status(403).json({
        code: "USE_TICKETS",
        message: "Votre formule (FITINI) n'inclut pas le Chat en direct. Veuillez ouvrir un ticket support."
      });
    }

    // 2. Rechercher si le salon existe
    let room = await prisma.supportChatRoom.findUnique({
      where: { companyId: user.companyId },
      include: {
        messages: {
          take: 50, // 50 derniers messages
          orderBy: { createdAt: "desc" },
          include: {
            sender: { select: { firstName: true, lastName: true, role: true } }
          }
        }
      }
    });

    // 3. Si inexistant, le créer
    if (!room) {
      room = await prisma.supportChatRoom.create({
        data: {
          companyId: user.companyId
        },
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            include: {
              sender: { select: { firstName: true, lastName: true, role: true } }
            }
          }
        }
      }) as any;
    }

    // Inverser l'ordre des messages pour qu'ils soient chronologiques (du plus ancien au plus récent)
    if (room && room.messages) {
      room.messages = room.messages.reverse() as any;
    }

    res.json(room);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la récupération du salon de chat", error: error.message });
  }
};

/**
 * 7. Récupérer tous les salons de Chat actifs (SUPER_ADMIN)
 */
export const getAllChatRooms = async (req: any, res: Response) => {
  try {
    const rooms = await prisma.supportChatRoom.findMany({
      include: {
        company: {
          select: { name: true, plan: true, logoUrl: true }
        },
        messages: {
          take: 1, // Juste le dernier message pour l'aperçu
          orderBy: { createdAt: "desc" },
          include: {
            sender: { select: { firstName: true, lastName: true } }
          }
        },
        _count: {
          select: {
            messages: {
              where: {
                isRead: false,
                sender: { role: { not: "SUPER_ADMIN" } } // Seulement les messages non lus provenant du client
              }
            }
          }
        }
      },
      orderBy: { updatedAt: "desc" } // Le plus récemment actif en haut
    });

    res.json(rooms);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la récupération des salons de chat", error: error.message });
  }
};

/**
 * 8. Détails et historique complet d'un salon (SUPER_ADMIN & COMPANY_ADMIN)
 */
export const getChatRoomDetails = async (req: any, res: Response) => {
  try {
    const { roomId } = req.params;
    const user = req.user;

    const room = await prisma.supportChatRoom.findUnique({
      where: { id: roomId },
      include: {
        company: {
          select: { name: true, plan: true }
        },
        messages: {
          orderBy: { createdAt: "asc" }, // Ordre chronologique pour le chat
          include: {
            sender: { select: { firstName: true, lastName: true, role: true } }
          }
        }
      }
    });

    if (!room) {
      return res.status(404).json({ message: "Salon de chat introuvable." });
    }

    // Droit d'accès
    if (user.role !== "SUPER_ADMIN" && room.companyId !== user.companyId) {
      return res.status(403).json({ message: "Accès refusé." });
    }

    res.json(room);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la récupération des messages", error: error.message });
  }
};

/**
 * 9. Envoyer un Message dans le Chat
 */
export const sendChatMessage = async (req: any, res: Response) => {
  try {
    const { roomId } = req.params;
    const { content } = createChatMessageSchema.parse(req.body);
    const user = req.user;

    const room = await prisma.supportChatRoom.findUnique({
      where: { id: roomId }
    });

    if (!room) {
      return res.status(404).json({ message: "Salon de chat introuvable." });
    }

    // Droit d'accès
    if (user.role !== "SUPER_ADMIN" && room.companyId !== user.companyId) {
      return res.status(403).json({ message: "Accès refusé." });
    }

    // Enregistrement atomique : création message + mise à jour "updatedAt" du salon
    const result = await prisma.$transaction(async (tx) => {
      const message = await tx.supportChatMessage.create({
        data: {
          content,
          roomId,
          senderId: user.id,
          isRead: false
        },
        include: {
          sender: { select: { firstName: true, lastName: true, role: true } }
        }
      });

      await tx.supportChatRoom.update({
        where: { id: roomId },
        data: { updatedAt: new Date() }
      });

      return message;
    });

    res.status(201).json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Données invalides", errors: error.issues });
    }
    res.status(500).json({ message: "Erreur lors de l'envoi du message", error: error.message });
  }
};

/**
 * 10. Marquer les messages du salon comme LUS
 */
export const markChatAsRead = async (req: any, res: Response) => {
  try {
    const { roomId } = req.params;
    const user = req.user;

    const room = await prisma.supportChatRoom.findUnique({
      where: { id: roomId }
    });

    if (!room) {
      return res.status(404).json({ message: "Salon de chat introuvable." });
    }

    if (user.role !== "SUPER_ADMIN" && room.companyId !== user.companyId) {
      return res.status(403).json({ message: "Accès refusé." });
    }

    // On marque comme lu tous les messages qui ne proviennent pas de l'utilisateur actuel
    const updateResult = await prisma.supportChatMessage.updateMany({
      where: {
        roomId,
        senderId: { not: user.id },
        isRead: false
      },
      data: { isRead: true }
    });

    res.json({
      message: "Messages marqués comme lus",
      count: updateResult.count
    });
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la mise à jour du statut de lecture", error: error.message });
  }
};
