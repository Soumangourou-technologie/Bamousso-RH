import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { createAnnouncement, getAnnouncements, createComment } from "../controllers/announcement.controller.js";
import { upload, validateFileType } from "../middleware/upload.js";

const router = Router();

router.use(authenticate);

router.get("/", getAnnouncements);
router.post("/", authorize(["COMPANY_ADMIN", "HR_MANAGER"]), upload.single('file'), validateFileType, createAnnouncement);
router.post("/:postId/comments", createComment);

export default router;
