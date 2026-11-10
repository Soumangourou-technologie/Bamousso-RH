import { Router } from "express";
import PDFDocument from "pdfkit";
import { z } from "zod";
import { catalogue, completion, enrollment, pilot, publishedCourse } from "../academy/courses.js";
import { authenticateAccount, type AuthRequest } from "../middleware/auth.js";
import prisma from "../utils/prisma.js";

const router = Router();
type Course = NonNullable<Awaited<ReturnType<typeof publishedCourse>>>;

router.get("/catalogue", async (_req, res) => res.json(await catalogue()));

router.use(async (req, res, next) => {
  const id = z.string().min(1).max(100).safeParse(req.query.courseId ?? pilot.id);
  const course = id.success ? await publishedCourse(id.data) : null;
  if (!course) return res.status(404).json({ message: "Formation indisponible." });
  res.locals.course = course;
  next();
});

router.get("/", (_req, res) => {
  const { lessons, questions: _questions, ...summary } = res.locals.course as Course;
  res.json({ ...summary, lessons: lessons.map(({ id, title }) => ({ id, title })) });
});

router.use(authenticateAccount, (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

function learnerProgress(userId: string, courseId: string) {
  return prisma.academyProgress.findMany({ where: { userId, courseId } });
}

async function record(userId: string, courseId: string, activity: string) {
  await prisma.academyProgress.createMany({
    data: { userId, courseId, activity },
    skipDuplicates: true,
  });
}

router.get("/progress", async (req: AuthRequest, res) => {
  const course = res.locals.course as Course;
  const progress = await learnerProgress(req.user!.id, course.id);
  const enrolled = progress.some(({ activity }) => activity === enrollment);
  const passedAt = progress.find(({ activity }) => activity === completion)?.createdAt ?? null;
  res.json({
    enrolled,
    passedAt,
    completedLessons: course.lessons.filter(lesson => progress.some(row => row.activity === lesson.id)).map(lesson => lesson.id),
    lessons: enrolled ? course.lessons : [],
    questions: enrolled ? course.questions.map(({ prompt, options }) => ({ prompt, options })) : [],
  });
});

router.post("/enroll", async (req: AuthRequest, res) => {
  const course = res.locals.course as Course;
  await record(req.user!.id, course.id, enrollment);
  res.sendStatus(204);
});

router.put("/lessons/:lessonId", async (req: AuthRequest, res) => {
  const course = res.locals.course as Course;
  const userId = req.user!.id;
  if (!course.lessons.some(lesson => lesson.id === req.params.lessonId)) return res.sendStatus(404);
  const progress = await learnerProgress(userId, course.id);
  if (!progress.some(row => row.activity === enrollment)) {
    return res.status(409).json({ message: "Inscrivez-vous à la formation." });
  }
  await record(userId, course.id, String(req.params.lessonId));
  res.sendStatus(204);
});

router.post("/quiz", async (req: AuthRequest, res) => {
  const course = res.locals.course as Course;
  const quiz = course.questions;
  const input = z.object({ answers: z.array(z.number().int().min(0)).length(quiz.length) }).safeParse(req.body);
  if (!input.success || input.data.answers.some((answer, i) => answer >= quiz[i].options.length)) {
    return res.status(400).json({ message: "Répondez à toutes les questions." });
  }
  const userId = req.user!.id;
  const progress = await learnerProgress(userId, course.id);
  if (!course.lessons.every(lesson => progress.some(row => row.activity === lesson.id))) {
    return res.status(409).json({ message: "Terminez toutes les leçons avant de passer le quiz." });
  }
  const score = quiz.filter(({ answer }, i) => input.data.answers[i] === answer).length;
  const passed = score === quiz.length;
  if (passed) await record(userId, course.id, completion);
  res.json({ score, total: quiz.length, passed });
});

router.get("/certificate", async (req: AuthRequest, res) => {
  const course = res.locals.course as Course;
  const result = await prisma.academyProgress.findUnique({
    where: { userId_courseId_activity: { userId: req.user!.id, courseId: course.id, activity: completion } },
    include: { user: { select: { firstName: true, lastName: true } } },
  });
  if (!result) return res.status(404).json({ message: "Attestation disponible après réussite du quiz." });

  const pdf = new PDFDocument({ size: "A4", layout: "landscape", margin: 72 });
  res.attachment("attestation-bamousso-academie.pdf").type("application/pdf");
  pdf.pipe(res);
  pdf.fillColor("#134e4a").font("Helvetica-Bold").fontSize(18).text("BAMOUSSO ACADÉMIE", { align: "center" });
  pdf.moveDown(2).fillColor("#111827").fontSize(32).text("Attestation de fin de formation", { align: "center" });
  pdf.moveDown().font("Helvetica").fontSize(17).text("Cette attestation est délivrée à", { align: "center" });
  pdf.moveDown().font("Helvetica-Bold").fontSize(26).text(`${result.user.firstName} ${result.user.lastName}`, { align: "center" });
  pdf.moveDown().font("Helvetica").fontSize(17).text(`pour avoir terminé la formation « ${course.title} » et réussi le quiz final.`, { align: "center" });
  const date = new Intl.DateTimeFormat("fr-CI", { dateStyle: "long", timeZone: "Africa/Abidjan" }).format(result.createdAt);
  pdf.moveDown(2).fontSize(13).text(`Délivrée le ${date}`, { align: "center" });
  pdf.end();
});

export default router;
