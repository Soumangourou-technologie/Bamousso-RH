import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import {
  createClientRegistration,
  getMyRegistrations,
  getAllRegistrations,
  getRegistrationById,
  addDocument,
} from "../controllers/clientRegistration.controller.js";
import { upload, validateFileType } from "../middleware/upload.js";

const router = Router();

router.use(authenticate);

// Commercial : ses propres enregistrements
router.get("/my", authorize(["COMMERCIAL"]), getMyRegistrations);

// Admin/HR : tous les enregistrements groupés par commercial
router.get("/", authorize(["COMPANY_ADMIN", "HR_MANAGER", "HR_ASSISTANT"]), getAllRegistrations);

// Détail d'un enregistrement (commercial owner ou admin)
router.get("/:id", getRegistrationById);

// Créer un enregistrement (COMMERCIAL uniquement)
// Accepte : idDocument (pièce d'identité) + documents[] (pièces légales additionnelles)
router.post(
  "/",
  authorize(["COMMERCIAL"]),
  upload.fields([
    { name: "idDocument", maxCount: 1 },
    { name: "documents", maxCount: 5 },
  ]),
  createClientRegistration
);

// Ajouter un document à un enregistrement existant
router.post(
  "/:id/documents",
  authorize(["COMMERCIAL"]),
  upload.single("document"),
  validateFileType,
  addDocument
);

export default router;
