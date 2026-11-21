import express from "express";
import { authenticateToken, requireShopAccess, requireShopType } from "../middleware/authMiddleware.js";
import { updateOrderStatus } from "../controllers/adminDataController.js";
import {
    addOrderNote,
    exportOrders,
    getOrder,
    getOrderAlerts,
    getOrderSummary,
    listOrders
} from "../controllers/shopOrderController.js";

// Shop Admin orders and sales reports: /api/shop-orders (online shops only).
const router = express.Router();
router.use(authenticateToken, requireShopAccess, requireShopType("Ecommerce"));

router.get("/", listOrders);
router.get("/summary", getOrderSummary);
router.get("/export", exportOrders);
router.get("/alerts", getOrderAlerts);
router.get("/:id", getOrder);
router.patch("/:id/status", updateOrderStatus); // also gives stock back on cancel and records history
router.post("/:id/notes", addOrderNote);

export default router;
