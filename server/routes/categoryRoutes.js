import express from "express";
import { authenticateToken, requireSuperAdmin } from "../middleware/authMiddleware.js";

import {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory
} from "../controllers/categoryController.js";

const router = express.Router();
router.use(authenticateToken, requireSuperAdmin);

// =====================================================
// CATEGORY CRUD
// =====================================================

// CREATE
// POST /api/categories
router.post("/", createCategory);

// GET ALL
// GET /api/categories
// GET /api/categories?shopID=7
router.get("/", getAllCategories);

// GET SINGLE
// GET /api/categories/:id
router.get("/:id", getCategoryById);

// UPDATE
// PUT /api/categories/:id
router.put("/:id", updateCategory);

// DELETE
// DELETE /api/categories/:id
router.delete("/:id", deleteCategory);

export default router;
