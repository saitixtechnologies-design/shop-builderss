import express from "express";

import {
    shopForgotPassword,
    verifyShopPasswordOTP,
    resetShopPassword,
    changeShopPassword,
} from "../controllers/shopPasswordController.js";

import {
    authenticateToken,
    requireShopAccess,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// =====================================================
// FORGOT PASSWORD
// =====================================================

router.post(
    "/forgot",
    shopForgotPassword
);

// =====================================================
// VERIFY OTP
// =====================================================

router.post(
    "/verify-otp",
    verifyShopPasswordOTP
);

// =====================================================
// RESET PASSWORD
// =====================================================

router.post(
    "/reset",
    resetShopPassword
);

// =====================================================
// CHANGE PASSWORD
// PROTECTED - SHOP ADMIN
// =====================================================

router.post(
    "/change",
    authenticateToken,
    requireShopAccess,
    changeShopPassword
);

export default router;