/**
 * Routes SUPER_ADMIN : gestion globale de la plateforme.
 */
import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import {
  getAllCompanies,
  getPlatformStats,
  createSuperAdmin,
  toggleCompanyLock,
  changePassword,
  updateCompanyPlan,
  deleteCompany,
  getSystemLogs,
  getAllPayments,
  getPaymentInvoice,
  createOfflineCompany,
  renewOfflineSubscription,
  changeOfflinePlan,
  getSystemSettings,
  updateSystemSettings,
  sendBroadcastMessage,
  getBroadcastHistory
} from "../controllers/superadmin.controller.js";
import { upload, validateFileType } from "../middleware/upload.js";

const router = Router();

// Toutes les routes nécessitent d'être connecté
router.use(authenticate);

// ─── Routes SUPER_ADMIN uniquement ───────────────────────────────────────────
router.get("/companies", authorize(["SUPER_ADMIN"]), getAllCompanies);
router.get("/stats", authorize(["SUPER_ADMIN"]), getPlatformStats);
router.post("/super-admins", authorize(["SUPER_ADMIN"]), createSuperAdmin);
router.patch("/companies/:id/toggle-lock", authorize(["SUPER_ADMIN"]), toggleCompanyLock);
router.patch("/companies/:id/plan", authorize(["SUPER_ADMIN"]), updateCompanyPlan);
router.delete("/companies/:id", authorize(["SUPER_ADMIN"]), deleteCompany);

// Routes pour les clients hors-ligne
router.post("/companies/offline", authorize(["SUPER_ADMIN"]), createOfflineCompany);
router.patch("/companies/offline/:id/renew", authorize(["SUPER_ADMIN"]), renewOfflineSubscription);
router.patch("/companies/offline/:id/plan", authorize(["SUPER_ADMIN"]), changeOfflinePlan);

// Routes Broadcast & Notifications Super Admin
router.post(
  "/broadcast",
  authorize(["SUPER_ADMIN"]),
  upload.single("attachment"),
  validateFileType,
  sendBroadcastMessage
);
router.get("/broadcasts", authorize(["SUPER_ADMIN"]), getBroadcastHistory);

router.get("/logs", authorize(["SUPER_ADMIN"]), getSystemLogs);
router.get("/payments", authorize(["SUPER_ADMIN"]), getAllPayments);
router.get("/payments/:id/invoice", authorize(["SUPER_ADMIN"]), getPaymentInvoice);

router.get("/settings", authorize(["SUPER_ADMIN"]), getSystemSettings);
router.put("/settings", authorize(["SUPER_ADMIN"]), updateSystemSettings);


// ─── Route accessible à tous les rôles (changer son propre mot de passe) ─────
router.patch("/change-password", changePassword);

export default router;
