import express from "express";
import { getNotifications } from "../controllers/notification.controller.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getNotifications);

export default router;
