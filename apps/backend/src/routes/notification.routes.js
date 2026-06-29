import express from "express";
import {
  getNotificationPreferences,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
  updateNotificationPreferences,
} from "../controllers/notification.controller.js";
import { checkAnyPermission, checkPermission, protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", protect, checkAnyPermission("VOIR_NOTIFICATIONS", "VOIR_NOTIFICATIONS_STOCK", "VOIR_NOTIFICATIONS_CAISSE", "VOIR_NOTIFICATIONS_FINANCE"), getNotifications);
router.patch("/read-all", protect, checkAnyPermission("VOIR_NOTIFICATIONS", "VOIR_NOTIFICATIONS_STOCK", "VOIR_NOTIFICATIONS_CAISSE", "VOIR_NOTIFICATIONS_FINANCE"), markAllNotificationsRead);
router.patch("/:id/read", protect, checkAnyPermission("VOIR_NOTIFICATIONS", "VOIR_NOTIFICATIONS_STOCK", "VOIR_NOTIFICATIONS_CAISSE", "VOIR_NOTIFICATIONS_FINANCE"), markNotificationRead);
router.patch("/:id/unread", protect, checkAnyPermission("VOIR_NOTIFICATIONS", "VOIR_NOTIFICATIONS_STOCK", "VOIR_NOTIFICATIONS_CAISSE", "VOIR_NOTIFICATIONS_FINANCE"), markNotificationUnread);
router.get("/preferences", protect, checkPermission("GERER_NOTIFICATIONS"), getNotificationPreferences);
router.put("/preferences", protect, checkPermission("GERER_NOTIFICATIONS"), updateNotificationPreferences);

export default router;
