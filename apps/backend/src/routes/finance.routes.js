import express from "express";
import { createFinanceCharge, deleteFinanceCharge, getFinanceCharges, updateFinanceCharge } from "../controllers/finance.controller.js";
import { checkAnyPermission, checkPermission, protect } from "../middlewares/authMiddleware.js";
import { attachSubscription, requireFeature } from "../middlewares/subscriptionMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(attachSubscription);

router
  .route("/charges")
  .get(requireFeature("FINANCE", "Pro"), checkAnyPermission("VOIR_CHARGES_FINANCE", "GERER_CHARGES_FINANCE", "VOIR_BENEFICES", "VOIR_CHIFFRE_AFFAIRE"), getFinanceCharges)
  .post(requireFeature("FINANCE", "Pro"), checkPermission("GERER_CHARGES_FINANCE"), createFinanceCharge);

router
  .route("/charges/:id")
  .put(requireFeature("FINANCE", "Pro"), checkPermission("GERER_CHARGES_FINANCE"), updateFinanceCharge)
  .delete(requireFeature("FINANCE", "Pro"), checkPermission("GERER_CHARGES_FINANCE"), deleteFinanceCharge);

export default router;
