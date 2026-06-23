import express from "express";
import { createRetour, createVente, getFactures, getRetours, getVentes } from "../controllers/caisse.controller.js";
import { checkAnyPermission, checkPermission, protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);

router
  .route("/factures")
  .get(checkAnyPermission("IMPRIMER_FACTURE", "VOIR_HISTORIQUE_VENTES", "VOIR_MES_VENTES"), getFactures);

router
  .route("/retours")
  .get(checkPermission("ANNULER_VENTE"), getRetours)
  .post(checkPermission("ANNULER_VENTE"), createRetour);

router
  .route("/ventes")
  .get(checkAnyPermission("VOIR_HISTORIQUE_VENTES", "VOIR_MES_VENTES"), getVentes)
  .post(checkPermission("EFFECTUER_VENTE"), createVente);

export default router;
