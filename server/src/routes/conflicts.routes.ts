import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { getDisciplinaryCases, createDisciplinaryCase } from "../controllers/conflicts.controller.js";

const router = Router();

// Toutes les routes ici sont protégées
router.use(authenticate);

router.get("/", getDisciplinaryCases);
router.post("/", createDisciplinaryCase);

export default router;
