import express from "express";

import {
    getShopBanners,
    getShopBannerById,
    createShopBanner,
    updateShopBanner,
    deleteShopBanner,
    toggleShopBannerStatus,
} from "../controllers/shopBannerController.js";

import {
    authenticateToken,
    requireShopAccess,
} from "../middleware/authMiddleware.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| SHOP ADMIN BANNER ROUTES
|--------------------------------------------------------------------------
| All routes are protected.
| ShopID is taken from JWT, not from frontend request.
|--------------------------------------------------------------------------
*/

// Get all banners of logged-in shop
router.get(
    "/",
    authenticateToken,
    requireShopAccess,
    getShopBanners
);

// Get single banner
router.get(
    "/:id",
    authenticateToken,
    requireShopAccess,
    getShopBannerById
);

// Create banner
router.post(
    "/",
    authenticateToken,
    requireShopAccess,
    createShopBanner
);

// Update banner
router.put(
    "/:id",
    authenticateToken,
    requireShopAccess,
    updateShopBanner
);

// Delete banner
router.delete(
    "/:id",
    authenticateToken,
    requireShopAccess,
    deleteShopBanner
);

// Toggle Active / Inactive
router.patch(
    "/:id/status",
    authenticateToken,
    requireShopAccess,
    toggleShopBannerStatus
);

export default router;