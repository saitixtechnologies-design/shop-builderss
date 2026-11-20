import express from "express";
import {
    getAdminCustomers,
    getAdminDashboard,
    getAdminOrders,
    getAdminUsers,
    getOrderDetails,
    updateOrderStatus
} from "../controllers/adminDataController.js";
import { authenticateToken, requireSuperAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(authenticateToken, requireSuperAdmin);
router.get("/dashboard", getAdminDashboard);
router.get("/users", getAdminUsers);
router.get("/orders", getAdminOrders);
router.get("/orders/:id", getOrderDetails);
router.patch("/orders/:id/status", updateOrderStatus);
router.get("/customers", getAdminCustomers);

export default router;
