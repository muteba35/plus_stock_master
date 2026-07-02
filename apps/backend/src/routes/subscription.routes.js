import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { activateMockSubscription, getCurrentSubscription, getSubscriptionPlans, initiateLabyrinthePayment, verifyLabyrinthePayment } from "../controllers/subscription.controller.js";

const router = express.Router();

router.use(protect);

router.get("/plans", getSubscriptionPlans);
router.get("/current", getCurrentSubscription);
router.post("/activate-test", activateMockSubscription);
router.post("/labyrinthe/initiate", initiateLabyrinthePayment);
router.post("/labyrinthe/verify", verifyLabyrinthePayment);

export default router;
