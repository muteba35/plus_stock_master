import express from "express";
import { createVente, getVentes } from "../controllers/caisse.controller.js";
import { checkAnyPermission, checkPermission, protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);

router
  .route("/ventes")
  .get(checkAnyPermission("VOIR_HISTORIQUE_VENTES", "VOIR_MES_VENTES"), getVentes)
  .post(checkPermission("EFFECTUER_VENTE"), createVente);

export default router;
