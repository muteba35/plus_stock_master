import express from "express";
import rateLimit from "express-rate-limit";
import { register, login, verifyEmail } from "../controllers/auth.controller.js";

const router = express.Router();

/**
 * CONFIGURATION DE LA SÉCURITÉ (Rate Limiting)
 * Protection contre les attaques par force brute (OWASP)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limite à 5 tentatives pour l'auth
  message: { message: "Trop de tentatives. Veuillez réessayer dans 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// --- ROUTE 1 : INSCRIPTION (Register) ---
// Envoie les données et déclenche l'envoi de l'email de confirmation
router.post("/register", authLimiter, register);

// --- ROUTE 2 : CONNEXION (Login) ---
// Vérifie les identifiants et si le compte est activé (isActive: true)
router.post("/login", authLimiter, login);

// --- ROUTE 3 : VÉRIFICATION DU LIEN (Email Confirmation) ---
// Appelée par le Frontend React pour valider le token reçu dans le mail
router.post("/verify-email", authLimiter, verifyEmail);

export default router;