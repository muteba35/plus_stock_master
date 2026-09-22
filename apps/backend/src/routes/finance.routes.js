import express from "express";
import { createFinanceCharge, deleteFinanceCharge, getFinanceCharges, updateFinanceCharge } from "../controllers/finance.controller.js";
import { checkAnyPermission, checkPermission, protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);

router
  .route("/charges")
  .get(checkAnyPermission("VOIR_CHARGES_FINANCE", "GERER_CHARGES_FINANCE", "VOIR_BENEFICES", "VOIR_CHIFFRE_AFFAIRE"), getFinanceCharges)
  .post(checkPermission("GERER_CHARGES_FINANCE"), createFinanceCharge);

router
  .route("/charges/:id")
  .put(checkPermission("GERER_CHARGES_FINANCE"), updateFinanceCharge)
  .delete(checkPermission("GERER_CHARGES_FINANCE"), deleteFinanceCharge);

export default router;
