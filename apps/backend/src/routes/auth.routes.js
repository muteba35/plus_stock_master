import express from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { protect } from "../middlewares/authMiddleware.js";
import { authValidation } from "../middlewares/securityMiddleware.js";

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
  updatePassword,
} from "../controllers/auth.controller.js";

const router = express.Router();

const fifteenMinutes = 15 * 60 * 1000;
const oneHour = 60 * 60 * 1000;

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const ipKey = (req) => ipKeyGenerator(req.ip);
const keyByIpAndEmail = (req) => `${ipKey(req)}:${normalizeEmail(req.body?.email) || "sans-email"}`;
const keyByIpAndResetToken = (req) => `${ipKey(req)}:${String(req.params?.token || "sans-token").slice(0, 24)}`;
const keyByConnectedUser = (req) => `${ipKey(req)}:${req.user?._id?.toString?.() || req.user?.id || "sans-user"}`;

const createLimiter = ({ windowMs, max, message, keyGenerator = ipKey, skipSuccessfulRequests = false }) =>
  rateLimit({
    windowMs,
    max,
    keyGenerator,
    skipSuccessfulRequests,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        status: "blocked",
        message,
      });
    },
  });

/**
 * Limiteurs de sécurité ciblés.
 * Les actions d'authentification sont limitées par IP + email quand c'est possible,
 * afin d'éviter qu'une boutique entière soit bloquée par une seule erreur sur un Wi-Fi partagé.
 */
const registerLimiter = createLimiter({
  windowMs: oneHour,
  max: 10,
  keyGenerator: keyByIpAndEmail,
  message: "Trop de créations de comptes depuis cette connexion. Réessayez dans 1 heure.",
});

const loginLimiter = createLimiter({
  windowMs: fifteenMinutes,
  max: 8,
  keyGenerator: keyByIpAndEmail,
  skipSuccessfulRequests: true,
  message: "Trop de tentatives de connexion échouées. Réessayez dans 15 minutes.",
});

const verifyOTPLimiter = createLimiter({
  windowMs: fifteenMinutes,
  max: 6,
  keyGenerator: keyByIpAndEmail,
  skipSuccessfulRequests: true,
  message: "Trop de codes OTP incorrects. Accès suspendu pendant 15 minutes.",
});

const resendOTPLimiter = createLimiter({
  windowMs: fifteenMinutes,
  max: 5,
  keyGenerator: keyByIpAndEmail,
  message: "Trop de demandes de renvoi OTP. Attendez 15 minutes avant de recommencer.",
});

const forgotPasswordLimiter = createLimiter({
  windowMs: fifteenMinutes,
  max: 5,
  keyGenerator: keyByIpAndEmail,
  message: "Trop de demandes de récupération de mot de passe. Réessayez dans 15 minutes.",
});

const resetPasswordLimiter = createLimiter({
  windowMs: fifteenMinutes,
  max: 5,
  keyGenerator: keyByIpAndResetToken,
  skipSuccessfulRequests: true,
  message: "Trop de tentatives de réinitialisation de mot de passe. Réessayez dans 15 minutes.",
});

const updatePasswordLimiter = createLimiter({
  windowMs: fifteenMinutes,
  max: 8,
  keyGenerator: keyByConnectedUser,
  skipSuccessfulRequests: true,
  message: "Trop de tentatives de changement de mot de passe. Réessayez dans 15 minutes.",
});

const meLimiter = createLimiter({
  windowMs: fifteenMinutes,
  max: 600,
  message: "Trop de requêtes de synchronisation réseau. Ralentissez.",
});

const profileUpdateLimiter = createLimiter({
  windowMs: fifteenMinutes,
  max: 30,
  keyGenerator: keyByConnectedUser,
  message: "Trop de mises à jour de profil. Réessayez plus tard.",
});

router.post("/register", registerLimiter, authValidation.register, register);
router.post("/login", loginLimiter, authValidation.login, login);

router.get("/verify-email/:token", verifyEmail);
router.post("/resend-verification", registerLimiter, authValidation.email, resendVerification);

router.post("/verify-otp", verifyOTPLimiter, authValidation.otp, verifyOTP);
router.post("/resend-otp", resendOTPLimiter, authValidation.email, resendOTP);

router.post("/forgot-password", forgotPasswordLimiter, authValidation.email, forgotPassword);
router.post("/resend-forgot-password", forgotPasswordLimiter, authValidation.email, resendForgotPassword);
router.post("/reset-password/:token", resetPasswordLimiter, authValidation.resetPassword, resetPassword);

router.get("/me", protect, meLimiter, getMe);
router.get("/profile", protect, getProfile);
router.put("/profile", protect, profileUpdateLimiter, updateProfile);
router.put("/update-password", protect, updatePasswordLimiter, authValidation.updatePassword, updatePassword);

export default router;
