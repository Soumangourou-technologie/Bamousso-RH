import express from "express";
import { 
  createProduct, 
  getProducts, 
  updateProduct, 
  deleteProduct,
  checkout,
  getSalesHistory
} from "../controllers/sales.controller.js";
import { authenticate, authorize, requirePermission } from "../middleware/auth.js";

const router = express.Router();

// L'accès au module de vente est réservé au COMPANY_ADMIN et au COMMERCIAL
const allowedRoles = ["COMPANY_ADMIN", "COMMERCIAL"];

// Routes Catalogue Produits
router.get("/products", authenticate, getProducts);
router.post("/products", authenticate, requirePermission('manage_products'), createProduct);
router.put("/products/:id", authenticate, requirePermission('manage_products'), updateProduct);
router.delete("/products/:id", authenticate, requirePermission('manage_products'), deleteProduct);

// Routes Ventes & Encaissement
router.post("/checkout", authenticate, requirePermission('use_pos'), checkout);
router.get("/history", authenticate, requirePermission('view_sales'), getSalesHistory);

export default router;
