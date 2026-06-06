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

import { protect, checkPermission } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Toutes les routes employes necessitent une session valide
router.use(protect);

// Liste + creation
router
  .route("/")
  .get(checkPermission("VOIR_EMPLOYES"), getEmployes)
  .post(checkPermission("AJOUTER_EMPLOYE"), createEmploye);

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