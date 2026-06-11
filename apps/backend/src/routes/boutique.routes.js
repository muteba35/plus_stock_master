import express from "express";
import {
  createBoutique,
  getBoutiques,
  setActiveBoutique,
} from "../controllers/boutique.controller.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.route("/")
  .get(getBoutiques)
  .post(createBoutique);
          
router.patch("/:id/active", setActiveBoutique);

export default router;
