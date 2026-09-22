import express from "express";
import { createRetour, createVente, getFactures, getRapportsCaisse, getRetours, getVentes } from "../controllers/caisse.controller.js";
import { checkAnyPermission, checkPermission, protect } from "../middlewares/authMiddleware.js";
import { checkExportPermission } from "../middlewares/exportPermission.js";

const router = express.Router();

router.use(protect);

router
  .route("/rapports")
  .get(checkAnyPermission("VOIR_RAPPORTS_CAISSE", "VOIR_MES_RAPPORTS_CAISSE", "EXPORTER_RAPPORTS_CAISSE"), getRapportsCaisse);

router
  .route("/factures")
  .get(checkAnyPermission("VOIR_FACTURES", "VOIR_MES_FACTURES", "EXPORTER_FACTURES", "IMPRIMER_FACTURE", "VOIR_HISTORIQUE_VENTES", "VOIR_MES_VENTES"), checkExportPermission("EXPORTER_FACTURES", "EXPORTER_RAPPORTS"), getFactures);

router
  .route("/retours")
  .get(checkAnyPermission("VOIR_RETOURS_CLIENTS", "VOIR_MES_RETOURS_CLIENTS", "EXPORTER_RETOURS_CLIENTS", "ANNULER_VENTE"), checkExportPermission("EXPORTER_RETOURS_CLIENTS", "EXPORTER_RAPPORTS"), getRetours)
  .post(checkAnyPermission("CREER_RETOUR_CLIENT", "ANNULER_VENTE"), createRetour);

router
  .route("/ventes")
  .get(checkAnyPermission("VOIR_HISTORIQUE_VENTES", "VOIR_MES_VENTES", "EXPORTER_HISTORIQUE_VENTES"), checkExportPermission("EXPORTER_HISTORIQUE_VENTES", "EXPORTER_RAPPORTS"), getVentes)
  .post(checkPermission("EFFECTUER_VENTE"), createVente);

export default router;
