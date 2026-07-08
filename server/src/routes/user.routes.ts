import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { createUser, getUsers, updateUser, deleteUser, updateUserPassword, suspendUser, activateUser, updateLocation } from "../controllers/user.controller.js";
import { checkEmployeeLimit } from "../middleware/planGate.js";

const router = Router();

// SUPER_ADMIN can manage all users
router.use(authenticate);

router.put("/me/location", updateLocation);

router.post("/", authorize(["SUPER_ADMIN", "COMPANY_ADMIN", "HR_MANAGER", "HR_ASSISTANT", "RH"]), checkEmployeeLimit, createUser);
router.put("/:id", authorize(["SUPER_ADMIN", "COMPANY_ADMIN", "HR_MANAGER", "HR_ASSISTANT", "RH"]), updateUser);
router.put("/:id/password", authorize(["SUPER_ADMIN", "COMPANY_ADMIN", "HR_MANAGER"]), updateUserPassword);
router.post("/:id/suspend", authorize(["SUPER_ADMIN", "COMPANY_ADMIN", "HR_MANAGER"]), suspendUser);
router.post("/:id/activate", authorize(["SUPER_ADMIN", "COMPANY_ADMIN", "HR_MANAGER"]), activateUser);
router.delete("/:id", authorize(["SUPER_ADMIN", "COMPANY_ADMIN", "HR_MANAGER"]), deleteUser);
router.get("/", authorize(["SUPER_ADMIN", "COMPANY_ADMIN", "HR_MANAGER", "HR_ASSISTANT", "RH"]), getUsers);

export default router;
