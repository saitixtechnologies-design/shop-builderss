import express from "express";
import { authenticateToken, requireSuperAdmin } from "../middleware/authMiddleware.js";

import {
    createBrand,
    getAllBrands,
    getBrandById,
    updateBrand,
    deleteBrand,
    toggleBrandStatus
} from "../controllers/brandController.js";

const router = express.Router();
router.use(authenticateToken, requireSuperAdmin);

router.get("/", getAllBrands);

router.get("/:id", getBrandById);

router.post("/", createBrand);

router.put("/:id", updateBrand);

router.delete("/:id", deleteBrand);

router.patch("/:id/toggle-status", toggleBrandStatus);

export default router;
