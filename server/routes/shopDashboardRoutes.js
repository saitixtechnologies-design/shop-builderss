import express from "express";

import {
    getShopDashboard
} from "../controllers/shopDashboardController.js";

import {
    authenticateToken,
    requireShopAccess,
    requireShopType
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
    "/",
    authenticateToken,
    requireShopAccess,
    requireShopType("Ecommerce"),
    getShopDashboard
);

export default router;
