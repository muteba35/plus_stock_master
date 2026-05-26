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
  resendForgotPassword, // Nouvelle fonction à importer
  resetPassword,
  getMe,
  getProfile,
  updateProfile,   
  updatePassword

} from "../controllers/auth.controller.js";



const router = express.Router();

/**
 * CONFIGURATION DE LA SÉCURITÉ (Rate Limiting)
 */

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5, 
  handler: (_req, res) => {
    res.status(429).json({
      status: "blocked",
      message: "Trop de tentatives d'inscription. Accès suspendu pendant 15 minutes."
    });
  }
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3, 
  handler: (_req, res) => {
    res.status(429).json({
      status: "blocked",
      message: "Trop de demandes de récupération. Réessayez dans 15 minutes."
    });
  }
});

const resendOTPLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  handler: (_req, res) => {
    res.status(429).json({
      status: "blocked",
      message: "Trop de demandes de codes. Sécurité activée : attendez 15 minutes."
    });
  }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  handler: (_req, res) => {
    res.status(429).json({
      status: "blocked",
      message: "Trop de tentatives de connexion. Par sécurité, votre accès est bloqué pendant 15 minutes."
    });
  }
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 tentatives (plus large, car on peut se tromper dans les règles de mot de passe)
  handler: (_req, res) => {
    res.status(429).json({
      status: "blocked",
      message: "Trop de tentatives de mise à jour. Par sécurité, attendez 15 minutes."
    });
  }
});

// Un limiteur standard pour éviter le spam sur la récupération du profil si nécessaire
const meLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // Limite plus haute car appelée à chaque rafraîchissement d'écran
  handler: (_req, res) => {
    res.status(429).json({
      status: "blocked",
      message: "Trop de requêtes sur votre profil. Ralentissez."
    });
  }
});

const profileUpdateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, 
  handler: (_req, res) => {
    res.status(429).json({
      status: "blocked",
      message: "Trop de mises à jour de profil. Réessayez plus tard."
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

// 5. Vérification de l'OTP
router.post("/verify-otp", verifyOTP);

// 6. Renvoi de l'OTP
router.post("/resend-otp", resendOTPLimiter, resendOTP);

// 7. Mot de passe oublié (Demande initiale)
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);

// 8. Renvoyer le lien de récupération (Si expiré ou non reçu)
router.post("/resend-forgot-password", forgotPasswordLimiter, resendForgotPassword);

// 9. Réinitialisation du mot de passe (L'action finale)
// Note : On ajoute /:token pour que req.params.token fonctionne dans le contrôleur
router.post("/reset-password/:token", resetPasswordLimiter, resetPassword);

// 10. Récupérer le profil de l'utilisateur connecté
// On applique 'protect' pour s'assurer que l'utilisateur est authentifié
router.get("/me", protect, meLimiter, getMe);


// Déclaration de la route de récupération du profil
// On place "protect" avant "getProfile" pour intercepter la requête, 
// lire le token, et injecter l'ID dans req.user
router.get('/profile', protect, getProfile);

// 12. Mettre à jour le profil
router.put('/profile', protect, profileUpdateLimiter, updateProfile);

// 13. Mettre à jour le mot de passe
router.put('/update-password', protect, updatePassword);
export default router;