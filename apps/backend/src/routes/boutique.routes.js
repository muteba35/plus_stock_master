import express from "express";
import {
  createBoutique,
  deleteBoutique,
  getBoutiques,
  requestBoutiqueDeletionCode,
  setActiveBoutique,
  updateBoutique,
  getCurrencySettings,
  updateCurrencySettings,
} from "../controllers/boutique.controller.js";
import { checkAnyPermission, checkPermission, protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.route("/settings/exchange-rates")
  .get(checkAnyPermission("VOIR_BOUTIQUES", "MODIFIER_BOUTIQUE", "EFFECTUER_VENTE", "VOIR_HISTORIQUE_VENTES", "VOIR_MES_VENTES"), getCurrencySettings)
  .put(checkPermission("CHANGER_DEVISE"), updateCurrencySettings);

router.route("/")
  .get(checkPermission("VOIR_BOUTIQUES"), getBoutiques)
  .post(checkPermission("CREER_BOUTIQUE"), createBoutique);

router.post("/:id/delete-code", checkPermission("SUPPRIMER_BOUTIQUE"), requestBoutiqueDeletionCode);

router.route("/:id")
  .put(checkPermission("MODIFIER_BOUTIQUE"), updateBoutique)
  .delete(checkPermission("SUPPRIMER_BOUTIQUE"), deleteBoutique);

router.patch("/:id/active", checkPermission("ACTIVER_BOUTIQUE"), setActiveBoutique);

export default router;

