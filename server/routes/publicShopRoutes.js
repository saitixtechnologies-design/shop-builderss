import express from "express";
import { createPublicShopOrder, getPublicShopfront } from "../controllers/publicShopController.js";
import { createPublicShopServiceEnquiry } from "../controllers/shopServiceEnquiryController.js";

const router = express.Router();

router.get("/:slug", getPublicShopfront);
router.post("/:slug/orders", createPublicShopOrder);
router.post("/:slug/enquiries", createPublicShopServiceEnquiry);

export default router;
