import express from "express";
import { getAlertesStock, reapprovisionnerProduit } from "../controllers/alerteStock.controller.js";
import { checkPermission, protect } from "../middlewares/authMiddleware.js";

const router = express.Router();
router.use(protect);
router.get("/", checkPermission("VOIR_ALERTES_STOCK"), getAlertesStock);
router.post("/:productId/reapprovisionner", checkPermission("REAPPROVISIONNER_STOCK"), reapprovisionnerProduit);

export default router;
