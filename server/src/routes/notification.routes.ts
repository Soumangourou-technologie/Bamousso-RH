import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { requirePlan } from "../middleware/planGate.js";
import {
  getNotifications,
  markAsRead,
  broadcastNotification,
  deleteNotification
} from "../controllers/notification.controller.js";

const router = Router();

router.use(authenticate);

router.get("/", getNotifications);
router.patch("/:id/read", markAsRead);
router.delete("/:id", deleteNotification);

// Broadcast : admin entreprise / RH + SUPER_ADMIN (support)
router.post("/broadcast", authorize(["SUPER_ADMIN", "COMPANY_ADMIN", "HR_MANAGER", "HR_ASSISTANT"]), broadcastNotification);

export default router;
