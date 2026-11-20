import express from "express";

import {
    createSuperAdmin,
    loginUser,
    getSuperAdminProfile,
    updateSuperAdminProfile
} from "../controllers/authController.js";

import {
    authenticateToken,
    requireSuperAdmin
} from "../middleware/authMiddleware.js";


const router = express.Router();


// =====================================================
// CREATE SUPER ADMIN
// =====================================================

router.post(
    "/create-super-admin",
    createSuperAdmin
);


// =====================================================
// LOGIN
// =====================================================

router.post(
    "/login",
    loginUser
);


// =====================================================
// GET SUPER ADMIN PROFILE
// =====================================================

router.get(
    "/profile",
    authenticateToken,
    requireSuperAdmin,
    getSuperAdminProfile
);


// =====================================================
// UPDATE SUPER ADMIN PROFILE
// =====================================================

router.put(
    "/profile",
    authenticateToken,
    requireSuperAdmin,
    updateSuperAdminProfile
);


export default router;