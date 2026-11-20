import express from "express";

import {
    getShopServices,
    getShopServiceById,
    createShopService,
    updateShopService,
    deleteShopService,
    toggleShopServiceStatus
} from "../controllers/shopServiceController.js";

import {
    authenticateToken,
    requireShopAccess
} from "../middleware/authMiddleware.js";

const router = express.Router();

// =====================================================
// GET ALL SHOP SERVICES
// GET /api/shop-services
// =====================================================

router.get(
    "/",
    authenticateToken,
    requireShopAccess,
    getShopServices
);

// =====================================================
// GET SINGLE SHOP SERVICE
// GET /api/shop-services/:id
// =====================================================

router.get(
    "/:id",
    authenticateToken,
    requireShopAccess,
    getShopServiceById
);

// =====================================================
// CREATE SHOP SERVICE
// POST /api/shop-services
// =====================================================

router.post(
    "/",
    authenticateToken,
    requireShopAccess,
    createShopService
);

// =====================================================
// UPDATE SHOP SERVICE
// PUT /api/shop-services/:id
// =====================================================

router.put(
    "/:id",
    authenticateToken,
    requireShopAccess,
    updateShopService
);

// =====================================================
// DELETE SHOP SERVICE
// DELETE /api/shop-services/:id
// =====================================================

router.delete(
    "/:id",
    authenticateToken,
    requireShopAccess,
    deleteShopService
);

// =====================================================
// TOGGLE SHOP SERVICE STATUS
// PATCH /api/shop-services/:id/status
// =====================================================

router.patch(
    "/:id/status",
    authenticateToken,
    requireShopAccess,
    toggleShopServiceStatus
);

export default router;
