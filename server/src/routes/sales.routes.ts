import express from "express";
import { 
  createProduct, 
  getProducts, 
  updateProduct, 
  deleteProduct,
  checkout,
  getSalesHistory
} from "../controllers/sales.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

// L'accès au module de vente est réservé au COMPANY_ADMIN et au COMMERCIAL
const allowedRoles = ["COMPANY_ADMIN", "COMMERCIAL"];

// Routes Catalogue Produits
router.get("/products", authenticate, getProducts);
router.post("/products", authenticate, authorize(['COMPANY_ADMIN']), createProduct);
router.put("/products/:id", authenticate, authorize(['COMPANY_ADMIN']), updateProduct);
router.delete("/products/:id", authenticate, authorize(['COMPANY_ADMIN']), deleteProduct);

// Routes Ventes & Encaissement
router.post("/checkout", authenticate, authorize(['COMPANY_ADMIN', 'COMMERCIAL', 'VENDEUR']), checkout);
router.get("/history", authenticate, authorize(['COMPANY_ADMIN', 'COMMERCIAL', 'VENDEUR']), getSalesHistory);

export default router;
