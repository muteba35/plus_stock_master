import express from "express";
import { createProduit, deleteProduit, getProduitById, getProduits, importProduits, updateProduit } from "../controllers/produit.controller.js";
import { checkPermission, protect } from "../middlewares/authMiddleware.js";
import { attachSubscription, enforceProductLimit, requireFeature } from "../middlewares/subscriptionMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(attachSubscription);
router.route("/")
  .get(checkPermission("VOIR_LISTE_PRODUITS"), getProduits)
  .post(checkPermission("AJOUTER_PRODUIT"), enforceProductLimit(1), createProduit);

router.post("/import", requireFeature("EXCEL_IMPORTS", "Pro"), checkPermission("AJOUTER_PRODUIT"), enforceProductLimit((req) => Array.isArray(req.body?.produits) ? req.body.produits.length : Array.isArray(req.body?.rows) ? req.body.rows.length : 1), importProduits);

router.route("/:id")
  .get(checkPermission("VOIR_LISTE_PRODUITS"), getProduitById)
  .put(checkPermission("MODIFIER_PRODUIT"), updateProduit)
  .delete(checkPermission("SUPPRIMER_PRODUIT"), deleteProduit);

export default router;
