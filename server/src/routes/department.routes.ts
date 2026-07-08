import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import {
  createDepartment,
  getDepartments,
  deleteDepartment,
  updateDepartment,
} from "../controllers/department.controller.js";

const router = Router();

router.use(authenticate);

// Départements (RH)
router.post("/", authorize(["COMPANY_ADMIN", "HR_MANAGER", "HR_ASSISTANT", "RH"]), createDepartment);
router.put("/:id", authorize(["COMPANY_ADMIN", "HR_MANAGER", "HR_ASSISTANT", "RH"]), updateDepartment);
router.delete("/:id", authorize(["COMPANY_ADMIN", "HR_MANAGER", "HR_ASSISTANT", "RH"]), deleteDepartment);

// Lecture départements : tous les users de l'entreprise
router.get("/", getDepartments);

export default router;
