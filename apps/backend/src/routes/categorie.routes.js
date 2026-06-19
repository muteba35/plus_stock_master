import express from "express";
import { createCategorie, deleteCategorie, getCategories, updateCategorie } from "../controllers/categorie.controller.js";
import { checkPermission, protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.route("/")
  .get(checkPermission("VOIR_CATEGORIES"), getCategories)
  .post(checkPermission("CREER_CATEGORIE"), createCategorie);

router.route("/:id")
  .put(checkPermission("MODIFIER_CATEGORIE"), updateCategorie)
  .delete(checkPermission("SUPPRIMER_CATEGORIE"), deleteCategorie);

export default router;
