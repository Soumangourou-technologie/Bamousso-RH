import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import {
  createClientRegistration,
  getMyRegistrations,
  getAllRegistrations,
  getRegistrationById,
  addDocument,
  deleteClientRegistration,
} from "../controllers/clientRegistration.controller.js";
import { upload, validateFileType } from "../middleware/upload.js";

const router = Router();

router.use(authenticate);

// Commercial : ses propres enregistrements
router.get("/my", authorize(["COMMERCIAL"]), getMyRegistrations);

// Admin/HR : tous les enregistrements groupés par commercial
router.get("/", authorize(["COMPANY_ADMIN", "HR_MANAGER", "HR_ASSISTANT", "RH"]), getAllRegistrations);

// Détail d'un enregistrement (commercial owner ou admin)
router.get("/:id", getRegistrationById);

// Supprimer un enregistrement (Admin/HR uniquement)
router.delete("/:id", authorize(["COMPANY_ADMIN", "HR_MANAGER", "SUPER_ADMIN"]), deleteClientRegistration);

// Créer un enregistrement (COMMERCIAL uniquement)
// Accepte : idDocumentRecto, idDocumentVerso, idDocument (pièce d'identité) + documents[] (pièces légales additionnelles)
router.post(
  "/",
  authorize(["COMMERCIAL"]),
  upload.fields([
    { name: "idDocumentRecto", maxCount: 1 },
    { name: "idDocumentVerso", maxCount: 1 },
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

