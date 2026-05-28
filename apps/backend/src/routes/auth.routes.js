import express from "express";
import rateLimit from "express-rate-limit";
import { protect } from "../middlewares/authMiddleware.js";

import { 
  register, 
  login, 
  verifyEmail, 
  resendVerification, 
  verifyOTP, 
  resendOTP,
  forgotPassword,
  resendForgotPassword,
  resetPassword,
  getMe,
  getProfile,
  updateProfile,   
  updatePassword
} from "../controllers/auth.controller.js";

const router = express.Router();

/**
 * CONFIGURATION DE LA SÉCURITÉ (Rate Limiting par IP)
 * Adapté pour l'environnement multi-utilisateurs (Boutiques/Wi-Fi partagé)
 */

// Permet plusieurs inscriptions sur le même réseau (ex: formation d'équipe)
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 15, // Augmenté de 5 à 15
  handler: (_req, res) => {
    res.status(429).json({
      status: "blocked",
      message: "Trop de tentatives d'inscription depuis cette connexion. Réessayez dans 15 minutes."
    });
  }
});

// Évite le spam de demandes de récupération sur le réseau
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Augmenté de 3 à 10
  handler: (_req, res) => {
    res.status(429).json({
      status: "blocked",
      message: "Trop de demandes de récupération depuis cette connexion. Réessayez dans 15 minutes."
    });
  }
});

// Laisse de la marge si plusieurs employés demandent un renvoi de code en même temps
const resendOTPLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15, // Augmenté de 5 à 15
  handler: (_req, res) => {
    res.status(429).json({
      status: "blocked",
      message: "Trop de demandes de codes depuis cette connexion. Attendez 15 minutes."
    });
  }
});

// Crucial : Doit être supérieur à la limite DB (3 essais par compte) pour que la DB bloque le compte ciblé
// avant que l'Express Limiter ne bloque TOUTE la boutique !
const verifyOTPLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // Augmenté de 5 à 30 (Bloque les attaques par dictionnaire de codes, pas les humains)
  handler: (_req, res) => {
    res.status(429).json({
      status: "blocked",
      message: "Sécurité du réseau : Trop de validations de codes. Accès suspendu 15 minutes."
    });
  }
});

// Évite de bloquer la boutique le matin si 4 ou 5 employés se connectent en même temps et font des fautes de frappe
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // Augmenté de 10 à 30
  handler: (_req, res) => {
    res.status(429).json({
      status: "blocked",
      message: "Trop de connexions simultanées sur ce réseau. Accès suspendu pendant 15 minutes."
    });
  }
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 20, // Augmenté de 10 à 20
  handler: (_req, res) => {
    res.status(429).json({
      status: "blocked",
      message: "Trop de changements de mots de passe sur ce réseau. Attendez 15 minutes."
    });
  }
});

// Le endpoint /me est appelé à chaque rechargement de page ou changement de page majeur (Hydration du state).
// 100 requêtes c'est très vite atteint par un seul utilisateur actif, alors à plusieurs sur la même IP...
const meLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600, // Augmenté de 100 à 600 pour garantir la fluidité de l'application
  handler: (_req, res) => {
    res.status(429).json({
      status: "blocked",
      message: "Trop de requêtes de synchronisation réseau. Ralentissez."
    });
  }
});

const profileUpdateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 30, // Légèrement augmenté de 20 à 30
  handler: (_req, res) => {
    res.status(429).json({
      status: "blocked",
      message: "Trop de mises à jour de profil sur ce réseau. Réessayez plus tard."
    });
  }
});

// --- ROUTES ---

// 1. Inscription
router.post("/register", registerLimiter, register);

// 2. Connexion
router.post("/login", loginLimiter, login);

// 3. Vérification Email
router.get("/verify-email/:token", verifyEmail);

// 4. Renvoyer l'email de vérification
router.post("/resend-verification", registerLimiter, resendVerification);

// 5. Vérification de l'OTP (Géré par la DB pour le compte, et par verifyOTPLimiter pour l'IP)
router.post("/verify-otp", verifyOTPLimiter, verifyOTP);

// 6. Renvoi de l'OTP
router.post("/resend-otp", resendOTPLimiter, resendOTP);

// 7. Mot de passe oublié (Demande initiale)
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);

// 8. Renvoyer le lien de récupération
router.post("/resend-forgot-password", forgotPasswordLimiter, resendForgotPassword);

// 9. Réinitialisation du mot de passe
router.post("/reset-password/:token", resetPasswordLimiter, resetPassword);

// 10. Récupérer le profil de l'utilisateur connecté
router.get("/me", protect, meLimiter, getMe);

// 11. Déclaration de la route de récupération du profil
router.get('/profile', protect, getProfile);

// 12. Mettre à jour le profil
router.put('/profile', protect, profileUpdateLimiter, updateProfile);

// 13. Mettre à jour le mot de passe
router.put('/update-password', protect, resetPasswordLimiter, updatePassword);

export default router;