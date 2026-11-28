import express from "express";
import { authenticateToken, requireShopAccess } from "../middleware/authMiddleware.js";
import { getShopNotifications } from "../controllers/shopNotificationController.js";

// Shop Admin notifications (the bell): /api/shop-notifications. Online and service shops.
const router = express.Router();

router.use(authenticateToken, requireShopAccess);
router.get("/", getShopNotifications);

export default router;
