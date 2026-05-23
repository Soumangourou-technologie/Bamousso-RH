import { rateLimit } from 'express-rate-limit';

/**
 * Limiteur général pour toute l'API
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Augmenté à 1000 pour éviter de bloquer l'usage normal (SPA React)
  standardHeaders: true,
  legacyHeaders: false,
  message: "Trop de requêtes effectuées depuis cette adresse IP, veuillez réessayer plus tard.",
});

/**
 * Limiteur pour les actions d'authentification standards (Login)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Augmenté pour les tests
  standardHeaders: true,
  legacyHeaders: false,
  message: "Trop de tentatives de connexion, veuillez réessayer plus tard.",
});

/**
 * Limiteur strict pour les actions critiques (Reset password, Register Company)
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Augmenté pour éviter de bloquer l'inscription
  standardHeaders: true,
  legacyHeaders: false,
  message: "Trop de requêtes sensibles effectuées, veuillez réessayer plus tard.",
});
