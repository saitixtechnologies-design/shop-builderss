import express from "express";

import {
    forgotPassword,
    verifyPasswordOTP,
    resetPassword,
    changePassword,
} from "../controllers/passwordController.js";

import {
    authenticateToken,
    requireSuperAdmin,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/forgot", forgotPassword);

router.post(
    "/verify-otp",
    verifyPasswordOTP
);

router.post(
    "/reset",
    resetPassword
);

router.post(
    "/change",
    authenticateToken,
    requireSuperAdmin,
    changePassword
);

export default router;