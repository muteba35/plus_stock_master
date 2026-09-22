import express from "express";
import { createProduit, deleteProduit, getProduitById, getProduits, importProduits, updateProduit } from "../controllers/produit.controller.js";
import { checkPermission, protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.route("/")
  .get(checkPermission("VOIR_LISTE_PRODUITS"), getProduits)
  .post(checkPermission("AJOUTER_PRODUIT"), createProduit);

router.post("/import", checkPermission("AJOUTER_PRODUIT"), importProduits);

router.route("/:id")
  .get(checkPermission("VOIR_LISTE_PRODUITS"), getProduitById)
  .put(checkPermission("MODIFIER_PRODUIT"), updateProduit)
  .delete(checkPermission("SUPPRIMER_PRODUIT"), deleteProduit);

export default router;
