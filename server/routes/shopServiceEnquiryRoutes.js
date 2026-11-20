import express from "express";
import {
    getShopServiceEnquiries,
    updateShopServiceEnquiry
} from "../controllers/shopServiceEnquiryController.js";
import { authenticateToken, requireShopAccess, requireShopType } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(authenticateToken, requireShopAccess, requireShopType("Service"));
router.get("/", getShopServiceEnquiries);
router.patch("/:id", updateShopServiceEnquiry);

export default router;
