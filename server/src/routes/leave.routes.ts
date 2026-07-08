import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { requestLeave, getLeaves, reviewLeave } from "../controllers/leave.controller.js";

const router = Router();

router.use(authenticate);

// Tout le monde peut voir ses congés et faire une demande
router.get("/", getLeaves);
router.post("/", requestLeave);

// Seuls les admins et RH peuvent valider/refuser
router.put("/:id/status", authorize(["COMPANY_ADMIN", "HR_MANAGER", "HR_ASSISTANT", "RH"]), reviewLeave);

export default router;
