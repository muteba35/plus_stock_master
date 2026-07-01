import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { activateMockSubscription, getCurrentSubscription, getSubscriptionPlans } from "../controllers/subscription.controller.js";

const router = express.Router();

router.use(protect);

router.get("/plans", getSubscriptionPlans);
router.get("/current", getCurrentSubscription);
router.post("/activate-test", activateMockSubscription);

export default router;
