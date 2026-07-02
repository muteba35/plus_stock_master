import express from "express";
import { createMouvement, getMouvements } from "../controllers/mouvementStock.controller.js";
import { protect } from "../middlewares/authMiddleware.js";
import { attachSubscription, requireFeature } from "../middlewares/subscriptionMiddleware.js";

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

const checkMovementReadPermission = (req, res, next) => {
  const permissions = req.user?.permissions || [];
  if (
    req.user?.isOwner ||
    permissions.includes("VOIR_MOUVEMENTS_STOCK") ||
    permissions.includes("VOIR_MES_OPERATIONS_INVENTAIRE")
  ) return next();

  return res.status(403).json({
    success: false,
    message: "Acces interdit. Une permission de consultation des mouvements est requise.",
  });
};

router.use(protect);
router.use(attachSubscription);
router.route("/")
  .get(requireFeature("STOCK_MOVEMENTS", "Starter"), checkMovementReadPermission, getMouvements)
  .post(requireFeature("STOCK_MOVEMENTS", "Starter"), checkMovementPermission, createMouvement);

export default router;
