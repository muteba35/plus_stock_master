import express from "express";
import { createRetour, createVente, getFactures, getRapportsCaisse, getRetours, getVentes } from "../controllers/caisse.controller.js";
import { checkAnyPermission, checkPermission, protect } from "../middlewares/authMiddleware.js";
import { attachSubscription, requireFeature } from "../middlewares/subscriptionMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(attachSubscription);

router
  .route("/rapports")
  .get(requireFeature("CASH_REPORTS", "Pro"), checkAnyPermission("VOIR_RAPPORTS_CAISSE", "VOIR_MES_RAPPORTS_CAISSE", "EXPORTER_RAPPORTS_CAISSE"), getRapportsCaisse);

router
  .route("/factures")
  .get(checkAnyPermission("VOIR_FACTURES", "VOIR_MES_FACTURES", "EXPORTER_FACTURES", "IMPRIMER_FACTURE", "VOIR_HISTORIQUE_VENTES", "VOIR_MES_VENTES"), getFactures);

router
  .route("/retours")
  .get(checkAnyPermission("VOIR_RETOURS_CLIENTS", "VOIR_MES_RETOURS_CLIENTS", "EXPORTER_RETOURS_CLIENTS", "ANNULER_VENTE"), getRetours)
  .post(requireFeature("RETURNS_BASIC", "Starter"), checkAnyPermission("CREER_RETOUR_CLIENT", "ANNULER_VENTE"), createRetour);

router
  .route("/ventes")
  .get(checkAnyPermission("VOIR_HISTORIQUE_VENTES", "VOIR_MES_VENTES", "EXPORTER_HISTORIQUE_VENTES"), getVentes)
  .post(checkPermission("EFFECTUER_VENTE"), createVente);

export default router;
