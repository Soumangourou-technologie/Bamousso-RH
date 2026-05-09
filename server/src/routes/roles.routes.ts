import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { getRoles, createRole, updateRole, deleteRole } from "../controllers/roles.controller.js";

const router = Router();

// Toutes les routes ici sont protégées et ne sont accessibles qu'aux admins d'entreprise
router.use(authenticate);

router.get("/", getRoles);
router.post("/", createRole);
router.put("/:id", updateRole);
router.delete("/:id", deleteRole);

export default router;
