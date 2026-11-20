import express from "express";

import {
    getShopSettings,
    updateShopSettings,
    getMyShopSettings,
    updateMyShopSettings
} from "../controllers/shopSettingsController.js";

import {
    authenticateToken,
    requireShopAccess
} from "../middleware/authMiddleware.js";

const router = express.Router();


// =====================================================
// SHOP ADMIN — MY SHOP SETTINGS
// =====================================================
// IMPORTANT:
// /me must come BEFORE /:shopId
// =====================================================

router.get(
    "/me",
    authenticateToken,
    requireShopAccess,
    getMyShopSettings
);

router.put(
    "/me",
    authenticateToken,
    requireShopAccess,
    updateMyShopSettings
);


// =====================================================
// SUPER ADMIN — SHOP SETTINGS
// =====================================================

router.get(
    "/:shopId",
    authenticateToken,
    getShopSettings
);

router.put(
    "/:shopId",
    authenticateToken,
    updateShopSettings
);


export default router;