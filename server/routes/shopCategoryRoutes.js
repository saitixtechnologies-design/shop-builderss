import express from "express";

import {
    getShopCategories,
    getShopCategoryById,
    createShopCategory,
    updateShopCategory,
    deleteShopCategory
} from "../controllers/shopCategoryController.js";

import {
    authenticateToken,
    requireShopAccess,
    requireShopType
} from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(authenticateToken, requireShopAccess, requireShopType("Ecommerce"));


// =====================================================
// GET ALL SHOP CATEGORIES
// GET /api/shop-categories
// =====================================================

router.get(
    "/",
    getShopCategories
);


// =====================================================
// GET SINGLE SHOP CATEGORY
// GET /api/shop-categories/:id
// =====================================================

router.get(
    "/:id",
    getShopCategoryById
);


// =====================================================
// CREATE SHOP CATEGORY
// POST /api/shop-categories
// =====================================================

router.post(
    "/",
    createShopCategory
);


// =====================================================
// UPDATE SHOP CATEGORY
// PUT /api/shop-categories/:id
// =====================================================

router.put(
    "/:id",
    updateShopCategory
);


// =====================================================
// DELETE SHOP CATEGORY
// DELETE /api/shop-categories/:id
// =====================================================

router.delete(
    "/:id",
    deleteShopCategory
);


export default router;
