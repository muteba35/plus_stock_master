import express from "express";
import {
  createBoutique,
  deleteBoutique,
  getBoutiques,
  setActiveBoutique,
  updateBoutique,
} from "../controllers/boutique.controller.js";
import { checkPermission, protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.route("/")
  .get(checkPermission("VOIR_BOUTIQUES"), getBoutiques)
  .post(checkPermission("CREER_BOUTIQUE"), createBoutique);

router.route("/:id")
  .put(checkPermission("MODIFIER_BOUTIQUE"), updateBoutique)
  .delete(checkPermission("SUPPRIMER_BOUTIQUE"), deleteBoutique);

router.patch("/:id/active", checkPermission("ACTIVER_BOUTIQUE"), setActiveBoutique);

export default router;
