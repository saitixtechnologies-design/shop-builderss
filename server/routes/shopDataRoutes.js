import express from "express";
import { getOrderDetails, getShopCustomers, getShopOrders, updateOrderStatus } from "../controllers/adminDataController.js";
import { authenticateToken, requireShopAccess, requireShopType } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(authenticateToken, requireShopAccess, requireShopType("Ecommerce"));
router.get("/orders", getShopOrders);
router.get("/orders/:id", getOrderDetails);
router.patch("/orders/:id/status", updateOrderStatus);
router.get("/customers", getShopCustomers);

export default router;
