import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import {
  createTicket,
  getTickets,
  getTicketDetails,
  replyToTicket,
  updateTicketStatus
} from "../controllers/support.controller.js";

const router = Router();

// Autorise uniquement l'administrateur de l'entreprise (COMPANY_ADMIN) ou l'équipe Support (SUPER_ADMIN)
const restrictToSupportRoles = authorize(["COMPANY_ADMIN", "SUPER_ADMIN"]);

// Routes pour les tickets (Formule FITINI)
router.post("/tickets", authenticate, restrictToSupportRoles, createTicket);
router.get("/tickets", authenticate, restrictToSupportRoles, getTickets);
router.get("/tickets/:id", authenticate, restrictToSupportRoles, getTicketDetails);
router.post("/tickets/:id/messages", authenticate, restrictToSupportRoles, replyToTicket);
router.patch("/tickets/:id/status", authenticate, restrictToSupportRoles, updateTicketStatus);

export default router;
