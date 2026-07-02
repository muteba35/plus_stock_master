import express from "express";
import { createCategorie, deleteCategorie, getCategories, importCategories, updateCategorie } from "../controllers/categorie.controller.js";
import { checkPermission, protect } from "../middlewares/authMiddleware.js";
import { attachSubscription } from "../middlewares/subscriptionMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(attachSubscription);
router.route("/")
  .get(checkPermission("VOIR_CATEGORIES"), getCategories)
  .post(checkPermission("CREER_CATEGORIE"), createCategorie);

router.post("/import", checkPermission("CREER_CATEGORIE"), importCategories);

router.route("/:id")
  .put(checkPermission("MODIFIER_CATEGORIE"), updateCategorie)
  .delete(checkPermission("SUPPRIMER_CATEGORIE"), deleteCategorie);

export default router;
