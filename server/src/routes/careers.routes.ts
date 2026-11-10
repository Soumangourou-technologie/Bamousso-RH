import { Router } from "express";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import { z } from "zod";
import { authenticateAccount, authorize, type AuthRequest } from "../middleware/auth.js";
import prisma from "../utils/prisma.js";

const router = Router();
const personal = Router();
const company = Router();
const limit = 24;
const field = (max: number) => z.string().trim().min(1).max(max);
const querySchema = z.object({
  q: z.string().trim().max(100).default(""),
  page: z.coerce.number().int().min(1).max(1000).default(1),
});
const match = (q: string) => ({ contains: q.replace(/[\\%_]/g, "\\$&"), mode: "insensitive" as const });
const publicJob = {
  id: true, title: true, location: true, description: true, email: true, createdAt: true,
  company: { select: { name: true } },
} as const;
const upload = multer({ limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 0 } }).single("cv");

router.get("/jobs", async (req, res) => {
  const query = querySchema.safeParse(req.query);
  if (!query.success) return res.sendStatus(400);
  const { q, page } = query.data;
  const rows = await prisma.jobOffer.findMany({
    where: {
      published: true, company: { isActive: true, isLocked: false },
      ...(q && { OR: [{ title: match(q) }, { location: match(q) }, { company: { name: match(q) } }] }),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * limit, take: limit + 1, select: publicJob,
  });
  res.json({ rows: rows.slice(0, limit), hasMore: rows.length > limit && page < 1000 });
});

router.use(authenticateAccount, (_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
router.use("/me", authorize(["PERSONAL"]), personal);
router.use("/company", authorize(["COMPANY_ADMIN"]), company);

personal.get("/", async (req: AuthRequest, res) => {
  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: req.user!.id }, select: { headline: true, city: true, visible: true },
  });
  const hasCv = profile && await prisma.candidateProfile.count({ where: { userId: req.user!.id, cv: { not: null } } });
  res.json({ headline: profile?.headline ?? "", city: profile?.city ?? "", visible: profile?.visible ?? false, hasCv: Boolean(hasCv) });
});

personal.put("/", async (req: AuthRequest, res) => {
  const data = z.object({ headline: field(140), city: field(100), visible: z.boolean() }).safeParse(req.body);
  if (!data.success) return res.status(400).json({ message: "Indiquez le métier recherché et votre ville." });
  const userId = req.user!.id;
  await prisma.candidateProfile.upsert({ where: { userId }, update: data.data, create: { ...data.data, userId } });
  res.sendStatus(204);
});

personal.put("/cv", (req, res, next) => {
  upload(req, res, error => {
    if (error) return res.status(400).json({ message: "Envoyez un seul CV au format PDF de 2 Mo maximum." });
    next();
  });
}, async (req: AuthRequest, res) => {
  if (!req.file || (await fileTypeFromBuffer(req.file.buffer).catch(() => undefined))?.mime !== "application/pdf") {
    return res.status(400).json({ message: "Le fichier doit être un PDF." });
  }
  const result = await prisma.candidateProfile.updateMany({ where: { userId: req.user!.id }, data: { cv: req.file.buffer } });
  if (!result.count) return res.status(409).json({ message: "Enregistrez votre profil avant de déposer un CV." });
  res.sendStatus(204);
});

personal.delete("/cv", async (req: AuthRequest, res) => {
  await prisma.candidateProfile.updateMany({ where: { userId: req.user!.id }, data: { cv: null } });
  res.sendStatus(204);
});

function sendCv(res: import("express").Response, cv: Uint8Array | null | undefined) {
  if (!cv) return res.sendStatus(404);
  res.set("X-Content-Type-Options", "nosniff").attachment("CV.pdf").type("application/pdf").send(Buffer.from(cv));
}

personal.get("/cv", async (req: AuthRequest, res) => {
  const profile = await prisma.candidateProfile.findUnique({ where: { userId: req.user!.id }, select: { cv: true } });
  sendCv(res, profile?.cv);
});

company.get("/jobs", async (req: AuthRequest, res) => {
  const query = querySchema.safeParse(req.query);
  if (!query.success) return res.sendStatus(400);
  const { page } = query.data;
  const rows = await prisma.jobOffer.findMany({
    where: { companyId: req.user!.companyId! }, orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * limit, take: limit + 1, select: { ...publicJob, published: true },
  });
  res.json({ rows: rows.slice(0, limit), hasMore: rows.length > limit && page < 1000 });
});

company.post("/jobs", async (req: AuthRequest, res) => {
  const data = z.object({ title: field(140), location: field(100), description: field(5000), email: z.string().trim().email().max(254) }).safeParse(req.body);
  if (!data.success) return res.status(400).json({ message: "Complétez l’annonce et l’adresse e-mail de candidature." });
  await prisma.jobOffer.create({ data: { ...data.data, companyId: req.user!.companyId! } });
  res.sendStatus(201);
});

company.delete("/jobs/:id", async (req: AuthRequest, res) => {
  const result = await prisma.jobOffer.updateMany({
    where: { id: String(req.params.id), companyId: req.user!.companyId! }, data: { published: false },
  });
  res.sendStatus(result.count ? 204 : 404);
});

const sharedCandidate = {
  visible: true, cv: { not: null }, user: { role: "PERSONAL", companyId: null, status: "ACTIVE" },
} as const;
company.get("/candidates", async (req, res) => {
  const query = querySchema.safeParse(req.query);
  if (!query.success) return res.sendStatus(400);
  const { q, page } = query.data;
  const rows = await prisma.candidateProfile.findMany({
    where: { ...sharedCandidate, ...(q && { OR: [{ headline: match(q) }, { city: match(q) }] }) },
    orderBy: [{ headline: "asc" }, { userId: "asc" }], skip: (page - 1) * limit, take: limit + 1,
    select: { userId: true, headline: true, city: true, user: { select: { firstName: true, lastName: true, email: true } } },
  });
  res.json({ rows: rows.slice(0, limit), hasMore: rows.length > limit && page < 1000 });
});

company.get("/candidates/:id/cv", async (req, res) => {
  const profile = await prisma.candidateProfile.findFirst({ where: { ...sharedCandidate, userId: req.params.id }, select: { cv: true } });
  sendCv(res, profile?.cv);
});

export default router;
