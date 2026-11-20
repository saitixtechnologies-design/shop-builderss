import express from "express";
import { authenticateToken, requireSuperAdmin } from "../middleware/authMiddleware.js";

import {
    getBanners,
    getBannerById,
    createBanner,
    updateBanner,
    deleteBanner,
    toggleBannerStatus
} from "../controllers/bannerController.js";

const router = express.Router();
router.use(authenticateToken, requireSuperAdmin);

/* =====================================================
   GET ALL BANNERS
   GET /api/banners
   GET /api/banners?shopID=10
   ===================================================== */

router.get(
    "/",
    getBanners
);


/* =====================================================
   GET SINGLE BANNER
   GET /api/banners/:id
   ===================================================== */

router.get(
    "/:id",
    getBannerById
);


/* =====================================================
   CREATE BANNER
   POST /api/banners
   ===================================================== */

router.post(
    "/",
    createBanner
);


/* =====================================================
   UPDATE BANNER
   PUT /api/banners/:id
   ===================================================== */

router.put(
    "/:id",
    updateBanner
);


/* =====================================================
   DELETE BANNER
   DELETE /api/banners/:id
   ===================================================== */

router.delete(
    "/:id",
    deleteBanner
);


/* =====================================================
   TOGGLE BANNER STATUS
   PATCH /api/banners/:id/status
   ===================================================== */

router.patch(
    "/:id/status",
    toggleBannerStatus
);

export default router;
