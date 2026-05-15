import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import {
  createTicket,
  getTickets,
  getTicketDetails,
  replyToTicket,
  updateTicketStatus,
  getOrCreateChatRoom,
  getAllChatRooms,
  getChatRoomDetails,
  sendChatMessage,
  markChatAsRead
} from "../controllers/support.controller.js";

const router = Router();

// Autorise uniquement l'administrateur de l'entreprise (COMPANY_ADMIN) ou l'équipe Support (SUPER_ADMIN)
const restrictToSupportRoles = authorize(["COMPANY_ADMIN", "SUPER_ADMIN"]);
const restrictToSuperAdmin = authorize(["SUPER_ADMIN"]);

// =======================================
// --- ROUTES TICKETS (Formule FITINI) ---
// =======================================
router.post("/tickets", authenticate, restrictToSupportRoles, createTicket);
router.get("/tickets", authenticate, restrictToSupportRoles, getTickets);
router.get("/tickets/:id", authenticate, restrictToSupportRoles, getTicketDetails);
router.post("/tickets/:id/messages", authenticate, restrictToSupportRoles, replyToTicket);
router.patch("/tickets/:id/status", authenticate, restrictToSupportRoles, updateTicketStatus);

// ==========================================
// --- ROUTES CHAT DIRECT (LOUBA & KORO) ---
// ==========================================

// Récupérer/Créer le salon personnel de l'entreprise
router.get("/chat/room", authenticate, restrictToSupportRoles, getOrCreateChatRoom);

// Récupérer tous les salons actifs (Super Admin uniquement)
router.get("/chat/rooms", authenticate, restrictToSuperAdmin, getAllChatRooms);

// Historique et détails d'un salon spécifique
router.get("/chat/rooms/:roomId", authenticate, restrictToSupportRoles, getChatRoomDetails);

// Envoyer un message instantané
router.post("/chat/rooms/:roomId/messages", authenticate, restrictToSupportRoles, sendChatMessage);

// Marquer les messages non lus comme LUS
router.patch("/chat/rooms/:roomId/read", authenticate, restrictToSupportRoles, markChatAsRead);

export default router;
