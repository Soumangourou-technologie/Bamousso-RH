import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { createWorkSchedule, getWorkSchedules, assignSchedule, deleteWorkSchedule, assignScheduleToDepartment } from "../controllers/workSchedule.controller.js";

const router = Router();

router.use(authenticate);

router.post("/", authorize(["COMPANY_ADMIN", "HR_MANAGER"]), createWorkSchedule);
router.get("/", authorize(["COMPANY_ADMIN", "HR_MANAGER", "HR_ASSISTANT", "RH"]), getWorkSchedules);
router.post("/assign", authorize(["COMPANY_ADMIN", "HR_MANAGER"]), assignSchedule);
router.post("/assign-department", authorize(["COMPANY_ADMIN", "HR_MANAGER"]), assignScheduleToDepartment);
router.delete("/:id", authorize(["COMPANY_ADMIN", "HR_MANAGER"]), deleteWorkSchedule);

export default router;
