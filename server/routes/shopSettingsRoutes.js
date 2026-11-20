import express from "express";

import {
    getShopSettings,
    updateShopSettings,
    getMyShopSettings,
    updateMyShopSettings
} from "../controllers/shopSettingsController.js";

import {
    getMyDomain,
    saveMyDomain,
    verifyMyDomain,
    removeMyDomain
} from "../controllers/shopDomainController.js";

import {
    authenticateToken,
    requireShopAccess
} from "../middleware/authMiddleware.js";

const router = express.Router();


// =====================================================
// SHOP ADMIN — MY WEB ADDRESS (free subdomain + own domain)
// =====================================================

router.get("/me/domain", authenticateToken, requireShopAccess, getMyDomain);
router.put("/me/domain", authenticateToken, requireShopAccess, saveMyDomain);
router.post("/me/domain/verify", authenticateToken, requireShopAccess, verifyMyDomain);
router.delete("/me/domain", authenticateToken, requireShopAccess, removeMyDomain);


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