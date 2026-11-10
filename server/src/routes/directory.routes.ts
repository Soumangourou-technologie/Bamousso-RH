import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize, type AuthRequest } from "../middleware/auth.js";
import prisma from "../utils/prisma.js";

const router = Router();
const companyAdmin = authorize(["COMPANY_ADMIN"]);
const companyFields = { name: true };
const profileFields = {
  sector: true, city: true, description: true, address: true, email: true, phone: true,
};

const profileInput = z.object({
  sector: z.string().trim().max(100),
  city: z.string().trim().max(100),
  description: z.string().trim().max(1000),
  address: z.string().trim().max(250),
  email: z.string().trim().max(254).pipe(z.union([z.email(), z.literal("")])),
  phone: z.string().trim().max(35).regex(/^[+0-9 ().-]*$/),
  published: z.boolean(),
}).refine(
  (profile) => !profile.published || (profile.sector !== "" && profile.city !== ""),
  { message: "Renseignez le secteur et la ville avant de publier." },
);

router.get("/", async (req, res) => {
  const query = z.object({
    q: z.string().trim().max(100).default(""),
    page: z.coerce.number().int().min(1).max(1000).default(1),
  }).safeParse(req.query);
  if (!query.success) return res.status(400).json({ message: "Recherche invalide." });

  const { q, page } = query.data;
  const match = { contains: q.replace(/[\\%_]/g, "\\$&"), mode: "insensitive" as const };
  const pageSize = 24;
  const profiles = await prisma.supplierProfile.findMany({
    where: {
      published: true,
      company: { isActive: true },
      ...(q && { OR: [
        { sector: match },
        { city: match },
        { company: { name: match } },
        { company: { products: { some: { directoryPublished: true, name: match } } } },
      ] }),
    },
    select: { ...profileFields, companyId: true, company: { select: companyFields } },
    orderBy: [{ company: { name: "asc" } }, { companyId: "asc" }],
    skip: (page - 1) * pageSize,
    take: pageSize + 1,
  });
  res.set("Cache-Control", "no-store").json({ profiles: profiles.slice(0, pageSize), hasMore: page < 1000 && profiles.length > pageSize });
});

router.get("/my-profile", authenticate, companyAdmin, async (req: AuthRequest, res) => {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(403).json({ message: "Entreprise non associée." });
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { ...companyFields, supplierProfile: { select: { ...profileFields, published: true } } },
  });
  res.json(company);
});

router.put("/my-profile", authenticate, companyAdmin, async (req: AuthRequest, res) => {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(403).json({ message: "Entreprise non associée." });
  const profile = profileInput.safeParse(req.body);
  if (!profile.success) {
    return res.status(400).json({
      message: profile.error.issues.find((issue) => issue.code === "custom")?.message
        ?? "Vérifiez les coordonnées et la longueur des champs.",
    });
  }
  const savedProfile = await prisma.supplierProfile.upsert({
    where: { companyId },
    create: { ...profile.data, email: profile.data.email ?? "", companyId },
    update: profile.data,
    select: { ...profileFields, published: true },
  });
  res.json(savedProfile);
});

router.get("/:companyId/catalog", async (req, res) => {
  const params = z.string().min(1).max(128).safeParse(req.params.companyId);
  const page = z.coerce.number().int().min(1).max(1000).default(1).safeParse(req.query.page);
  if (!params.success || !page.success) {
    return res.status(400).json({ message: "Catalogue invalide." });
  }

  const pageSize = 24;
  const supplier = await prisma.supplierProfile.findFirst({
    where: { companyId: params.data, published: true, company: { isActive: true } },
    select: {
      company: { select: {
        products: {
          where: { directoryPublished: true },
          select: { id: true, name: true, description: true, price: true, stock: true,
            directoryPriceOnQuote: true, directoryImageUrl: true },
          orderBy: [{ name: "asc" }, { id: "asc" }],
          skip: (page.data - 1) * pageSize,
          take: pageSize + 1,
        },
      } },
    },
  });
  res.set("Cache-Control", "no-store");
  if (!supplier) return res.status(404).json({ message: "Catalogue indisponible." });

  const { products } = supplier.company;
  res.json({
    products: products.slice(0, pageSize).map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      imageUrl: product.directoryImageUrl,
      price: product.directoryPriceOnQuote || !Number.isFinite(product.price) || product.price < 0
        ? null : product.price,
      availability: product.stock === null ? "ON_REQUEST" : product.stock > 0 ? "AVAILABLE" : "UNAVAILABLE",
    })),
    hasMore: page.data < 1000 && products.length > pageSize,
  });
});

export default router;
