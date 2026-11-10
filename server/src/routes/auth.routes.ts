/**
 * Définition des routes pour l'authentification.
 * Ces routes permettent aux utilisateurs de se connecter et de s'enregistrer.
 */
import { Router } from "express";
import {
  login,
  register,
  registerCompany,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  logout,
} from "../controllers/auth.controller.js";
import { authenticateAccount } from "../middleware/auth.js";

import { strictLimiter } from "../middleware/rateLimit.js";

const router = Router();

// Route pour l'utilisateur actuel (rafraîchissement)
router.get("/me", authenticateAccount, getCurrentUser);

// Route pour l'inscription d'un nouvel utilisateur
router.post("/register", strictLimiter, register);

// Création entreprise + 1er admin (self-serve)
router.post("/register-company", strictLimiter, registerCompany);

// Route pour la connexion
router.post("/login", login);

// Route pour la déconnexion
router.post("/logout", authenticateAccount, logout);

// Mot de passe oublié
router.post("/forgot-password", strictLimiter, forgotPassword);

// Reset mot de passe
router.post("/reset-password", strictLimiter, resetPassword);

export default router;
