import express from "express";
import { authenticateToken, requireSuperAdmin } from "../middleware/authMiddleware.js";

import {
    createProduct,
    getAllProducts,
    getProductById,
    updateProduct,
    deleteProduct,
} from "../controllers/productController.js";

const router = express.Router();
router.use(authenticateToken, requireSuperAdmin);

// =====================================================
// SUPER ADMIN PRODUCTS
// =====================================================

// CREATE PRODUCT
// POST /api/products
router.post("/", createProduct);

// GET ALL PRODUCTS
// GET /api/products
router.get("/", getAllProducts);

// GET PRODUCT BY ID
// GET /api/products/:id
router.get("/:id", getProductById);

// UPDATE PRODUCT
// PUT /api/products/:id
router.put("/:id", updateProduct);

// DELETE PRODUCT
// DELETE /api/products/:id
router.delete("/:id", deleteProduct);

export default router;
