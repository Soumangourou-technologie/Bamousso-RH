import express from "express";
import { authenticate } from "../middleware/auth.js";
import {
  createMission,
  getMissions,
  validateMission
} from "../controllers/missions.controller.js";

const router = express.Router();

router.use(authenticate);

router.post("/", createMission);
router.get("/", getMissions);
router.put("/:id/validate", validateMission);

export default router;
