import express from "express";
import { getAuditLogs } from "../controllers/audit.controller.js";
import { checkPermission, protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", protect, checkPermission("VOIR_AUDIT_GLOBAL"), getAuditLogs);

export default router;
