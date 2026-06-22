import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { getSalaries, generatePayroll, getPayslips, getPayslipPdf, deletePayslip } from "../controllers/salaries.controller.js";

const router = Router();

router.use(authenticate);

router.get("/", authorize(["COMPANY_ADMIN", "HR_MANAGER"]), getSalaries);
router.post("/generate", authorize(["COMPANY_ADMIN", "HR_MANAGER"]), generatePayroll);
router.get("/payslips", authorize(["COMPANY_ADMIN", "HR_MANAGER", "EMPLOYEE"]), getPayslips);
router.get("/payslips/:id/pdf", authorize(["COMPANY_ADMIN", "HR_MANAGER", "EMPLOYEE"]), getPayslipPdf);
router.delete("/payslips/:id", authorize(["COMPANY_ADMIN", "HR_MANAGER"]), deletePayslip);

export default router;
