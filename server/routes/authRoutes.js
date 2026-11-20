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

// Open only for the very first super admin. Once one exists, the request must carry a
// super admin's token (checked here) and the controller refuses anonymous calls.
const superAdminIfSignedIn = (req, res, next) => {
    if (!req.headers.authorization) return next();
    return authenticateToken(req, res, () => requireSuperAdmin(req, res, next));
};

router.post(
    "/create-super-admin",
    superAdminIfSignedIn,
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