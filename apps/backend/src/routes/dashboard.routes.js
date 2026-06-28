import express from "express";
import { getDashboardOverview } from "../controllers/dashboard.controller.js";
import { checkPermission, protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/overview", protect, checkPermission("VOIR_RESUME_VENTES"), getDashboardOverview);

export default router;
