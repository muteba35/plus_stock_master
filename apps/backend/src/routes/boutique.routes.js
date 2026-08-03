import express from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import {
  createBoutique,
  deleteBoutique,
  getBoutiques,
  requestBoutiqueDeletionCode,
  setActiveBoutique,
  updateBoutique,
  getCurrencySettings,
  syncCurrencySettings,
  updateCurrencySettings,
} from "../controllers/boutique.controller.js";
import { checkAnyPermission, checkPermission, protect } from "../middlewares/authMiddleware.js";
import { boutiqueValidation } from "../middlewares/securityMiddleware.js";
import { attachSubscription, enforceBoutiqueLimit } from "../middlewares/subscriptionMiddleware.js";

const router = express.Router();

const fifteenMinutes = 15 * 60 * 1000;
const oneHour = 60 * 60 * 1000;

const connectedUserKey = (req) => {
  const userId = req.user?._id?.toString?.() || req.user?.id || "sans-user";
  return `${ipKeyGenerator(req.ip)}:${userId}`;
};

const boutiqueActionKey = (req) => `${connectedUserKey(req)}:${req.params?.id || "sans-boutique"}`;

const createLimiter = ({ windowMs, max, message, keyGenerator = connectedUserKey, skipSuccessfulRequests = false }) =>
  rateLimit({
    windowMs,
    max,
    keyGenerator,
    skipSuccessfulRequests,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        status: "blocked",
        message,
      });
    },
  });

const createBoutiqueLimiter = createLimiter({
  windowMs: oneHour,
  max: 8,
  message: "Trop de créations de boutiques depuis ce compte. Réessayez dans 1 heure.",
});

const currencyUpdateLimiter = createLimiter({
  windowMs: fifteenMinutes,
  max: 20,
  message: "Trop de changements de devise/taux. Réessayez dans 15 minutes.",
});

const requestDeletionCodeLimiter = createLimiter({
  windowMs: fifteenMinutes,
  max: 3,
  keyGenerator: boutiqueActionKey,
  message: "Trop de demandes de code de suppression pour cette boutique. Réessayez dans 15 minutes.",
});

const confirmDeletionLimiter = createLimiter({
  windowMs: fifteenMinutes,
  max: 5,
  keyGenerator: boutiqueActionKey,
  skipSuccessfulRequests: true,
  message: "Trop de tentatives de suppression pour cette boutique. Réessayez dans 15 minutes.",
});

router.use(protect);
router.use(attachSubscription);

router.post("/settings/exchange-rates/sync", checkPermission("CHANGER_DEVISE"), currencyUpdateLimiter, syncCurrencySettings);

router.route("/settings/exchange-rates")
  .get(checkAnyPermission("VOIR_BOUTIQUES", "MODIFIER_BOUTIQUE", "EFFECTUER_VENTE", "VOIR_HISTORIQUE_VENTES", "VOIR_MES_VENTES"), getCurrencySettings)
  .put(checkPermission("CHANGER_DEVISE"), currencyUpdateLimiter, boutiqueValidation.currency, updateCurrencySettings);

router.route("/")
  .get(checkPermission("VOIR_BOUTIQUES"), getBoutiques)
  .post(checkPermission("CREER_BOUTIQUE"), createBoutiqueLimiter, enforceBoutiqueLimit, boutiqueValidation.create, createBoutique);

router.post("/:id/delete-code", checkPermission("SUPPRIMER_BOUTIQUE"), requestDeletionCodeLimiter, requestBoutiqueDeletionCode);

router.route("/:id")
  .put(checkPermission("MODIFIER_BOUTIQUE"), boutiqueValidation.update, updateBoutique)
  .delete(checkPermission("SUPPRIMER_BOUTIQUE"), confirmDeletionLimiter, boutiqueValidation.deleteCode, deleteBoutique);

router.patch("/:id/active", checkAnyPermission("ACTIVER_BOUTIQUE", "DESACTIVER_BOUTIQUE"), setActiveBoutique);

export default router;
