import express from "express";

import {
    getShopCoupons,
    getShopCouponById,
    createShopCoupon,
    updateShopCoupon,
    deleteShopCoupon,
    toggleShopCouponStatus,
} from "../controllers/shopCouponController.js";

import {
    authenticateToken,
    requireShopAccess,
    requireShopType,
} from "../middleware/authMiddleware.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| SHOP ADMIN COUPON ROUTES
|--------------------------------------------------------------------------
| ShopID is taken from the authenticated JWT.
| Frontend cannot choose another ShopID.
|--------------------------------------------------------------------------
*/

// Get all coupons of logged-in shop
router.get(
    "/",
    authenticateToken,
    requireShopAccess,
    requireShopType("Ecommerce"),
    getShopCoupons
);

// Get single coupon
router.get(
    "/:id",
    authenticateToken,
    requireShopAccess,
    requireShopType("Ecommerce"),
    getShopCouponById
);

// Create coupon
router.post(
    "/",
    authenticateToken,
    requireShopAccess,
    requireShopType("Ecommerce"),
    createShopCoupon
);

// Update coupon
router.put(
    "/:id",
    authenticateToken,
    requireShopAccess,
    requireShopType("Ecommerce"),
    updateShopCoupon
);

// Delete coupon
router.delete(
    "/:id",
    authenticateToken,
    requireShopAccess,
    requireShopType("Ecommerce"),
    deleteShopCoupon
);

// Toggle Active / Inactive
router.patch(
    "/:id/status",
    authenticateToken,
    requireShopAccess,
    requireShopType("Ecommerce"),
    toggleShopCouponStatus
);

export default router;
