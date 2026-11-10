import { Router } from "express";
import { z } from "zod";
import { completion, courseInput, enrollment, publishedCourse } from "../academy/courses.js";
import { authenticate, authorize, type AuthRequest } from "../middleware/auth.js";
import prisma from "../utils/prisma.js";

const router = Router();
const admin = Router();
const company = Router();
router.use(authenticate, (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

router.use("/admin", authorize(["SUPER_ADMIN"]), admin);
admin.get("/", async (_req, res) => {
  res.json(await prisma.academyCourse.findMany({ orderBy: { updatedAt: "desc" } }));
});

admin.post("/", async (req, res) => {
  const input = courseInput.safeParse(req.body);
  if (!input.success) return res.status(400).json({ message: "Vérifiez le contenu des leçons et du quiz." });
  res.status(201).json(await prisma.academyCourse.create({ data: { content: input.data } }));
});

admin.put("/:id", async (req, res) => {
  const input = courseInput.safeParse(req.body);
  if (!input.success) return res.status(400).json({ message: "Vérifiez le contenu des leçons et du quiz." });
  const result = await prisma.academyCourse.updateMany({
    where: { id: req.params.id, published: false }, data: { content: input.data },
  });
  if (!result.count) return res.status(409).json({ message: "Cette formation n’est plus modifiable." });
  res.sendStatus(204);
});

admin.post("/:id/publish", async (req, res) => {
  const result = await prisma.academyCourse.updateMany({ where: { id: req.params.id }, data: { published: true } });
  if (!result.count) return res.sendStatus(404);
  res.sendStatus(204);
});

router.use("/company", authorize(["COMPANY_ADMIN"]), (req: AuthRequest, res, next) => {
  if (!req.user?.companyId) return res.sendStatus(403);
  next();
}, company);

const listInput = z.object({ courseId: z.string().min(1).max(100), page: z.coerce.number().int().min(1).max(1000).default(1) });
const pageSize = 30;
company.get("/", async (req: AuthRequest, res) => {
  const input = listInput.safeParse(req.query);
  if (!input.success) return res.sendStatus(400);
  const { courseId, page } = input.data;
  const course = await publishedCourse(courseId);
  if (!course) return res.sendStatus(404);
  const companyId = req.user!.companyId!;
  const marker = `company:${companyId}`;
  const users = await prisma.user.findMany({
    where: { companyId, status: "ACTIVE", role: { not: "SUPER_ADMIN" } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { id: "asc" }],
    skip: (page - 1) * pageSize, take: pageSize + 1,
    select: {
      id: true, firstName: true, lastName: true,
      academyProgress: { where: { courseId }, select: { activity: true } },
    },
  });
  const employees = users.slice(0, pageSize).map(({ academyProgress, ...user }) => {
    const activities = new Set(academyProgress.map(row => row.activity));
    const assigned = activities.has(marker);
    return {
      ...user, assigned,
      completed: assigned ? course.lessons.filter(lesson => activities.has(lesson.id)).length : null,
      passed: assigned && activities.has(completion),
    };
  });
  res.json({ employees, lessonCount: course.lessons.length, hasMore: users.length > pageSize && page < 1000 });
});

company.post("/assign", async (req: AuthRequest, res) => {
  const input = z.object({ courseId: z.string().min(1).max(100), userId: z.string().min(1).max(100) }).safeParse(req.body);
  if (!input.success) return res.sendStatus(400);
  const { courseId, userId } = input.data;
  if (!await publishedCourse(courseId)) return res.sendStatus(404);
  const companyId = req.user!.companyId!;
  const assigned = await prisma.$transaction(async tx => {
    const employee = await tx.user.findFirst({
      where: { id: userId, companyId, status: "ACTIVE", role: { not: "SUPER_ADMIN" } }, select: { id: true },
    });
    if (!employee) return false;
    await tx.academyProgress.createMany({
      data: [enrollment, `company:${companyId}`].map(activity => ({ userId, courseId, activity })),
      skipDuplicates: true,
    });
    return true;
  });
  if (!assigned) return res.status(404).json({ message: "Collaborateur introuvable dans cette entreprise." });
  res.sendStatus(204);
});

export default router;
