import express from "express";

import {
    getShopBrands,
    getShopBrandById,
    createShopBrand,
    updateShopBrand,
    deleteShopBrand,
    toggleShopBrandStatus
} from "../controllers/shopBrandController.js";

import {
    authenticateToken,
    requireShopAccess,
    requireShopType
} from "../middleware/authMiddleware.js";

const router = express.Router();

// GET ALL
router.get(
    "/",
    authenticateToken,
    requireShopAccess,
    requireShopType("Ecommerce"),
    getShopBrands
);

// GET SINGLE
router.get(
    "/:id",
    authenticateToken,
    requireShopAccess,
    requireShopType("Ecommerce"),
    getShopBrandById
);

// CREATE
router.post(
    "/",
    authenticateToken,
    requireShopAccess,
    requireShopType("Ecommerce"),
    createShopBrand
);

// UPDATE
router.put(
    "/:id",
    authenticateToken,
    requireShopAccess,
    requireShopType("Ecommerce"),
    updateShopBrand
);

// DELETE
router.delete(
    "/:id",
    authenticateToken,
    requireShopAccess,
    requireShopType("Ecommerce"),
    deleteShopBrand
);

// TOGGLE STATUS
router.patch(
    "/:id/toggle-status",
    authenticateToken,
    requireShopAccess,
    requireShopType("Ecommerce"),
    toggleShopBrandStatus
);

export default router;
