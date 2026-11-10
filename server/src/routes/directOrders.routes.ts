import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { authenticate, authorize, type AuthRequest } from "../middleware/auth.js";
import prisma from "../utils/prisma.js";

const router = Router();
router.use(authenticate, authorize(["COMPANY_ADMIN"]), (req: AuthRequest, res, next) => {
  if (!req.user?.companyId) return res.status(403).json({ message: "Entreprise non associée." });
  res.set("Cache-Control", "no-store");
  next();
});

const orderInput = z.object({
  id: z.uuid(),
  supplierId: z.string().min(1).max(128),
  productId: z.string().min(1).max(128),
  quantity: z.number().int().min(1).max(1000000),
  deliveryAddress: z.string().trim().min(3).max(250),
  expectedPrice: z.number().nonnegative().max(999999999999),
  expectedVat: z.number().min(0).max(100),
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
  const orders = await prisma.directSupplierOrder.findMany({
    where: direction === "sent" ? { buyerId: companyId } : { supplierId: companyId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * size,
    take: size + 1,
  });
  res.json({ orders: orders.slice(0, size), hasMore: page < 1000 && orders.length > size });
});

router.post("/", async (req: AuthRequest, res) => {
  const input = orderInput.safeParse(req.body);
  if (!input.success) return res.status(400).json({ message: "Vérifiez la quantité et l’adresse de livraison." });
  const buyerId = req.user!.companyId!;
  const { id, supplierId, productId, quantity, deliveryAddress, expectedPrice, expectedVat } = input.data;
  if (supplierId === buyerId) return res.status(400).json({ message: "Choisissez un autre fournisseur." });

  const sameOrder = {
    id, buyerId, supplierId, productId, quantity, deliveryAddress, unitPrice: expectedPrice, vatRate: expectedVat,
  };
  const existing = await prisma.directSupplierOrder.findFirst({ where: sameOrder });
  if (existing) return res.json(existing);

  const [buyer, product] = await Promise.all([
    prisma.company.findUnique({ where: { id: buyerId }, select: { name: true } }),
    prisma.product.findFirst({
      where: { id: productId, companyId: supplierId, directoryPublished: true, directoryPriceOnQuote: false,
        company: { isActive: true, supplierProfile: { published: true } } },
      select: { name: true, price: true, vatRate: true, stock: true, company: { select: { name: true } } },
    }),
  ]);
  if (!buyer || !product) return res.status(404).json({ message: "Cet article ne peut plus être commandé." });
  if (product.stock !== null && product.stock < quantity) {
    return res.status(409).json({ message: "La quantité demandée n’est pas disponible." });
  }
  if (product.price !== expectedPrice || product.vatRate !== expectedVat) {
    return res.status(409).json({ message: "Le prix a changé. Rechargez le catalogue avant de commander." });
  }
  const unitPrice = new Prisma.Decimal(product.price);
  const vatRate = new Prisma.Decimal(product.vatRate);
  const total = unitPrice.mul(quantity).mul(vatRate.div(100).add(1)).toDecimalPlaces(2);
  if (unitPrice.decimalPlaces() > 2 || vatRate.decimalPlaces() > 2 || total.gt("999999999999.99")) {
    return res.status(400).json({ message: "Le montant dépasse les limites de la commande directe." });
  }

  const created = await prisma.directSupplierOrder.createMany({
    data: [{ id, buyerId, supplierId, productId, quantity, deliveryAddress, unitPrice, vatRate, total,
      buyerName: buyer.name, supplierName: product.company.name, productName: product.name }],
    skipDuplicates: true,
  });
  const saved = await prisma.directSupplierOrder.findFirst({ where: sameOrder });
  if (!saved) return res.status(409).json({ message: "Cette référence de commande est déjà utilisée." });
  res.status(created.count ? 201 : 200).json(saved);
});

router.put("/:id/decision", async (req: AuthRequest, res) => {
  const id = z.uuid().safeParse(req.params.id);
  const decision = z.object({
    status: z.enum(["CONFIRMED", "DECLINED"]),
    response: z.string().trim().min(3).max(500),
  }).safeParse(req.body);
  if (!id.success || !decision.success) {
    return res.status(400).json({ message: "Indiquez un délai de livraison ou un motif de refus." });
  }
  const supplierId = req.user!.companyId;
  const result = await prisma.directSupplierOrder.updateMany({
    where: { id: id.data, supplierId, status: "PENDING" },
    data: decision.data,
  });
  if (!result.count) return res.status(409).json({ message: "Cette commande a déjà été traitée ou est indisponible." });
  res.json({ status: decision.data.status });
});

export default router;
