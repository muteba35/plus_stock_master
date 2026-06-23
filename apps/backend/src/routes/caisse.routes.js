import express from "express";
import { createVente, getVentes } from "../controllers/caisse.controller.js";
import { checkPermission, protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);

router
  .route("/ventes")
  .get(checkPermission("VOIR_HISTORIQUE_VENTES"), getVentes)
  .post(checkPermission("EFFECTUER_VENTE"), createVente);

export default router;
