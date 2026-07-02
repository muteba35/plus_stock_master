import express from "express";
import {
  createEmploye,
  getEmployes,
  getEmployeById,
  updateEmploye,
  toggleEmployeStatus,
  resetEmployePassword,
  deleteEmploye
} from "../controllers/employe.controller.js";

import { protect, checkPermission, checkAnyPermission } from "../middlewares/authMiddleware.js";
import { attachSubscription, enforceUserLimit, requireFeature } from "../middlewares/subscriptionMiddleware.js";

const router = express.Router();

// Toutes les routes employes necessitent une session valide
router.use(protect);
router.use(attachSubscription);

// Liste + creation
router
  .route("/")
  .get(checkAnyPermission("VOIR_EMPLOYES", "VOIR_EQUIPE"), getEmployes)
  .post(requireFeature("TEAM_LIMITED", "Starter"), checkPermission("AJOUTER_EMPLOYE"), enforceUserLimit, createEmploye);

// Detail + modification + suppression
router
  .route("/:id")
  .get(checkPermission("VOIR_EMPLOYES"), getEmployeById)
  .put(checkPermission("MODIFIER_EMPLOYE"), updateEmploye)
  .delete(checkPermission("SUPPRIMER_EMPLOYE"), deleteEmploye);

// Suspendre / reactiver un employe
router.patch(
  "/:id/status",
  checkPermission("SUSPENDRE_EMPLOYE"),
  toggleEmployeStatus
);

// Reinitialiser le mot de passe d'un employe
router.patch(
  "/:id/reset-password",
  checkPermission("RESET_PASSWORD_EMPLOYE"),
  resetEmployePassword
);

export default router;
