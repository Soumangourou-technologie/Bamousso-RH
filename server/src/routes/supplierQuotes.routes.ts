import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize, type AuthRequest } from "../middleware/auth.js";
import prisma from "../utils/prisma.js";

const router = Router();
router.use(authenticate, authorize(["COMPANY_ADMIN"]), (req: AuthRequest, res, next) => {
  if (!req.user?.companyId) return res.status(403).json({ message: "Entreprise non associée." });
  res.set("Cache-Control", "no-store");
  next();
});

const requestInput = z.object({
  id: z.uuid(),
  supplierId: z.string().min(1).max(128),
  need: z.string().trim().min(5).max(2000),
  quantity: z.number().int().min(1).max(1000000),
  location: z.string().trim().min(1).max(180),
  requestedBy: z.string().trim().min(1).max(180),
});

const responseInput = z.object({
  totalFcfa: z.number().int().min(1).max(2147483647),
  terms: z.string().trim().min(5).max(2000),
  validDays: z.number().int().min(1).max(90),
});

router.get("/", async (req: AuthRequest, res) => {
  const query = z.object({
    direction: z.enum(["sent", "received"]).default("sent"),
    page: z.coerce.number().int().min(1).max(1000).default(1),
  }).safeParse(req.query);
  if (!query.success) return res.status(400).json({ message: "Liste invalide." });

  const { direction, page } = query.data;
  const companyId = req.user!.companyId;
  const size = 20;
  const quotes = await prisma.supplierQuote.findMany({
    where: direction === "sent" ? { buyerId: companyId } : { supplierId: companyId },
    include: {
      order: { select: { id: true, createdAt: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * size,
    take: size + 1,
  });
  res.json({ quotes: quotes.slice(0, size), hasMore: page < 1000 && quotes.length > size });
});

router.post("/", async (req: AuthRequest, res) => {
  const input = requestInput.safeParse(req.body);
  if (!input.success) return res.status(400).json({ message: "Vérifiez le besoin, la quantité, le lieu et le délai." });

  const buyerId = req.user!.companyId!;
  const { id, supplierId } = input.data;
  if (supplierId === buyerId) return res.status(400).json({ message: "Choisissez une autre entreprise." });

  const [buyer, supplier] = await Promise.all([
    prisma.company.findUnique({ where: { id: buyerId }, select: { name: true } }),
    prisma.supplierProfile.findFirst({
      where: { companyId: supplierId, published: true, company: { isActive: true } },
      select: { company: { select: { name: true } } },
    }),
  ]);
  if (!buyer || !supplier) return res.status(404).json({ message: "Cette entreprise est indisponible." });

  const created = await prisma.supplierQuote.createMany({
    data: [{ ...input.data, buyerId, buyerName: buyer.name, supplierName: supplier.company.name }],
    skipDuplicates: true,
  });
  if (created.count === 0) {
    const existing = await prisma.supplierQuote.findFirst({
      where: { ...input.data, buyerId },
      select: { id: true },
    });
    if (!existing) return res.status(409).json({ message: "Cette référence de demande est déjà utilisée." });
  }
  res.status(created.count ? 201 : 200).json({ id });
});

router.put("/:id/response", async (req: AuthRequest, res) => {
  const id = z.uuid().safeParse(req.params.id);
  const input = responseInput.safeParse(req.body);
  if (!id.success || !input.success) return res.status(400).json({ message: "Vérifiez le prix, les conditions et la durée de validité." });

  const { validDays, ...offer } = input.data;
  const updated = await prisma.supplierQuote.updateMany({
    where: { id: id.data, supplierId: req.user!.companyId, status: "REQUESTED" },
    data: { ...offer, status: "QUOTED", validUntil: new Date(Date.now() + validDays * 86400000) },
  });
  if (!updated.count) return res.status(409).json({ message: "Cette demande ne peut plus recevoir de devis." });
  res.json({ status: "QUOTED" });
});

router.post("/:id/accept", async (req: AuthRequest, res) => {
  const id = z.uuid().safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ message: "Référence invalide." });
  const buyerId = req.user!.companyId!;
  const order = await prisma.$transaction(async (tx) => {
    const accepted = await tx.supplierQuote.updateMany({
      where: { id: id.data, buyerId, status: "QUOTED", supplierId: { not: null }, validUntil: { gt: new Date() } },
      data: { status: "ACCEPTED" },
    });
    if (accepted.count) return tx.supplierOrder.create({ data: { quoteId: id.data } });
    return tx.supplierOrder.findFirst({ where: { quoteId: id.data, quote: { buyerId } } });
  });
  if (!order) return res.status(409).json({ message: "Ce devis est expiré ou indisponible." });
  res.json(order);
});

router.post("/:id/decline", async (req: AuthRequest, res) => {
  const id = z.uuid().safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ message: "Référence invalide." });
  const companyId = req.user!.companyId;
  const updated = await prisma.supplierQuote.updateMany({
    where: { id: id.data, OR: [
      { buyerId: companyId, status: "QUOTED", validUntil: { gt: new Date() } },
      { supplierId: companyId, status: "REQUESTED" },
    ] },
    data: { status: "DECLINED" },
  });
  if (!updated.count) return res.status(409).json({ message: "Ce dossier ne peut plus être refusé." });
  res.json({ status: "DECLINED" });
});

export default router;
