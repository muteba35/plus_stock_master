import express from "express";
import { getVueGlobaleInventaire } from "../controllers/inventaire.controller.js";
import { checkPermission, protect } from "../middlewares/authMiddleware.js";
import categorieRoutes from "./categorie.routes.js";
import produitRoutes from "./produit.routes.js";
import mouvementStockRoutes from "./mouvementStock.routes.js";
import alerteStockRoutes from "./alerteStock.routes.js";

const router = express.Router();

router.use("/categories", categorieRoutes);
router.use("/produits", produitRoutes);
router.use("/mouvements", mouvementStockRoutes);
router.use("/alertes", alerteStockRoutes);
router.get("/", protect, checkPermission("VOIR_RESUME_INVENTAIRE"), getVueGlobaleInventaire);

export default router;
