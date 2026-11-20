import express from "express";
import {
    createShopWebsitePage,
    deleteShopWebsitePage,
    getShopWebsitePage,
    getShopWebsitePages,
    updateShopWebsitePage,
    updateShopWebsitePageStatus
} from "../controllers/shopWebsiteController.js";
import { authenticateToken, requireWebsiteEditorAccess } from "../middleware/authMiddleware.js";

const router = express.Router();

// Super Admin can select any shop; Shop Admin requests are constrained to JWT ShopID.
router.use(authenticateToken, requireWebsiteEditorAccess);

router.post("/pages", createShopWebsitePage);
router.get("/pages/:shopId", getShopWebsitePages);
router.get("/pages/:shopId/:pageId", getShopWebsitePage);
router.put("/pages/:shopId/:pageId", updateShopWebsitePage);
router.delete("/pages/:shopId/:pageId", deleteShopWebsitePage);
router.patch("/pages/:shopId/:pageId/status", updateShopWebsitePageStatus);

export default router;
