import express from "express";
import { createMouvement, getMouvements } from "../controllers/mouvementStock.controller.js";
import { checkPermission, protect } from "../middlewares/authMiddleware.js";

const router = express.Router();
const permissionByMovementType = {
  ENTREE: "CREER_ENTREE_STOCK",
  SORTIE: "CREER_SORTIE_STOCK",
  AJUSTEMENT: "CREER_AJUSTEMENT_STOCK",
};

const checkMovementPermission = (req, res, next) => {
  const type = String(req.body?.type || "").toUpperCase();
  const requiredPermission = permissionByMovementType[type];
  if (!requiredPermission) {
    return res.status(400).json({ success: false, message: "Type de mouvement invalide." });
  }
  if (req.user?.isOwner || req.user?.permissions?.includes(requiredPermission)) return next();
  return res.status(403).json({
    success: false,
    message: `Acces interdit. Permission requise : ${requiredPermission}.`,
  });
};

router.use(protect);
router.route("/")
  .get(checkPermission("VOIR_MOUVEMENTS_STOCK"), getMouvements)
  .post(checkMovementPermission, createMouvement);

export default router;
