import express from "express";
import { authenticateToken, requireSuperAdmin } from "../middleware/authMiddleware.js";

import {
    getCoupons,
    getCouponById,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    toggleCouponStatus
} from "../controllers/couponController.js";

const router = express.Router();
router.use(authenticateToken, requireSuperAdmin);

router.get("/", getCoupons);

router.get("/:id", getCouponById);

router.post("/", createCoupon);

router.put("/:id", updateCoupon);

router.delete("/:id", deleteCoupon);

router.patch("/:id/status", toggleCouponStatus);

export default router; 
