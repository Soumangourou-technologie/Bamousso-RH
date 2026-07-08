import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { createPayrollItem, getPayrollItems, deletePayrollItem } from "../controllers/payrollItem.controller.js";

const router = Router();

router.use(authenticate);

router.post("/", authorize(["COMPANY_ADMIN", "HR_MANAGER"]), createPayrollItem);
router.get("/", authorize(["COMPANY_ADMIN", "HR_MANAGER", "HR_ASSISTANT", "RH"]), getPayrollItems);
router.delete("/:id", authorize(["COMPANY_ADMIN", "HR_MANAGER"]), deletePayrollItem);

export default router;
