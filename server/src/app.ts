/**
 * Point d'entrée principal de l'application Express.
 * Configure les middlewares, les routes et la politique de sécurité.
 */
import express from "express";
import path from "node:path";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { apiLimiter, authLimiter } from "./middleware/rateLimit.js";
import errorHandler from "./middleware/errorHandler.js";



// Importation des routes
import authRoutes from "./routes/auth.routes.js";
import companyRoutes from "./routes/company.routes.js";
import userRoutes from "./routes/user.routes.js";
import leaveRoutes from "./routes/leave.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";
import documentRoutes from "./routes/document.routes.js";
import announcementRoutes from "./routes/announcement.routes.js";
import departmentRoutes from "./routes/department.routes.js";
import notificationRoutes from "./routes/notification.routes.js";

import paymentRoutes from "./routes/payment.routes.js";
import superAdminRoutes from "./routes/superadmin.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import cronRoutes from "./routes/cron.routes.js";
import salariesRoutes from "./routes/salaries.routes.js";
import suggestionsRoutes from "./routes/suggestions.routes.js";
import explanationRoutes from "./routes/explanation.routes.js";
import taskRoutes from "./routes/task.routes.js";
import messageRoutes from "./routes/message.routes.js";
import rolesRoutes from "./routes/roles.routes.js";
import conflictsRoutes from "./routes/conflicts.routes.js";
import clientRegistrationRoutes from "./routes/clientRegistration.routes.js";

// Chargement des variables d'environnement
dotenv.config();

const app = express();

// Nécessaire pour le rate limiting sur Vercel (détection correcte de l'IP derrière le proxy)
app.set('trust proxy', 1);

// --- Configuration des Middlewares ---

// Configuration de CORS : Autorise les requêtes provenant du frontend uniquement
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL || 'https://bamousso-client.vercel.app'] 
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true
}));

// Sécurisation des headers HTTP avec Helmet
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Désactivé temporairement pour diagnostic
}));

// Journalisation des requêtes HTTP en mode développement
app.use(morgan("dev"));

// Analyse du corps des requêtes en format JSON
// On conserve le corps brut (rawBody) pour la vérification des signatures de Webhooks (GeniusPay)
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  }
}));

// --- Gestion des fichiers statiques ---
// Note : Pour Vercel, les fichiers locaux ne persistent pas. 
// La migration vers Supabase Storage est privilégiée pour la production.
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// --- Définition des Routes API ---
app.use("/api/auth", authLimiter, authRoutes);           // Authentification (Login, Register) avec protection accrue
app.use("/api/companies", apiLimiter, companyRoutes);     // Gestion des entreprises
app.use("/api/employees", apiLimiter, userRoutes);         // Annuaire employés (CRUD)
app.use("/api/departments", apiLimiter, departmentRoutes);       // Départements
app.use("/api/notifications", apiLimiter, notificationRoutes); // Notifications et annonces

app.use("/api/leaves", apiLimiter, leaveRoutes);            // Gestion des congés
app.use("/api/attendances", apiLimiter, attendanceRoutes);  // Pointage
app.use("/api/documents", apiLimiter, documentRoutes);      // Fiches de paie / Contrats
app.use("/api/announcements", apiLimiter, announcementRoutes); // Communications internes
app.use("/api/payment", authLimiter, paymentRoutes);           // Paiements et Webhooks (limité car sensible)
app.use("/api/admin", apiLimiter, superAdminRoutes);               // SUPER_ADMIN & changement de mot de passe
app.use("/api/analytics", apiLimiter, analyticsRoutes);            // Analytics RH (Bamousso+)
app.use("/api/cron", apiLimiter, cronRoutes);                      // Tâches planifiées (Subscription check)
app.use("/api/salaries", apiLimiter, salariesRoutes);
app.use("/api/suggestions", apiLimiter, suggestionsRoutes);
app.use("/api/explanations", apiLimiter, explanationRoutes);
app.use("/api/tasks", apiLimiter, taskRoutes);
app.use("/api/messages", apiLimiter, messageRoutes);
app.use("/api/roles", apiLimiter, rolesRoutes);
app.use("/api/conflicts", apiLimiter, conflictsRoutes);
app.use("/api/client-registrations", apiLimiter, clientRegistrationRoutes);

// Route de test pour vérifier que l'API est en ligne
app.get("/", (req, res) => {
  res.json({ message: "API Bamousso is running" });
});

// Middleware global de gestion des erreurs (doit être après les routes)
app.use(errorHandler);

export default app;
