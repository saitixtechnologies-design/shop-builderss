
import express from "express";

import {
    createShopProduct,
    getShopProducts,
    getShopProductOptions,
    getShopProductById,
    updateShopProduct,
    deleteShopProduct
} from "../controllers/shopProductController.js";

import {
    authenticateToken,
    requireShopAccess,
    requireShopType
} from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(authenticateToken, requireShopAccess, requireShopType("Ecommerce"));

/* =====================================================
   SHOP PRODUCTS
===================================================== */

/* =====================================================
   OPTIONS
   GET /api/shop-products/options

   IMPORTANT:
   This must come before /:id
===================================================== */

router.get(
    "/options",
    getShopProductOptions
);

/* =====================================================
   GET ALL PRODUCTS
   GET /api/shop-products
===================================================== */

router.get(
    "/",
    getShopProducts
);

/* =====================================================
   GET SINGLE PRODUCT
   GET /api/shop-products/:id
===================================================== */

router.get(
    "/:id",
    getShopProductById
);

/* =====================================================
   CREATE PRODUCT
   POST /api/shop-products
===================================================== */

router.post(
    "/",
    createShopProduct
);

/* =====================================================
   UPDATE PRODUCT
   PUT /api/shop-products/:id
===================================================== */

router.put(
    "/:id",
    updateShopProduct
);

/* =====================================================
   DELETE PRODUCT
   DELETE /api/shop-products/:id
===================================================== */

router.delete(
    "/:id",
    deleteShopProduct
);

export default router;
