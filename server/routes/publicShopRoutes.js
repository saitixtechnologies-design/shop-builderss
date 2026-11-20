import express from "express";
import { createPublicShopOrder, getPublicShopfront } from "../controllers/publicShopController.js";
import { createPublicShopServiceEnquiry } from "../controllers/shopServiceEnquiryController.js";
import { resolveShopByDomain } from "../controllers/shopDomainController.js";

const router = express.Router();

// Which shop a web address belongs to (free subdomain or the shop's own verified domain).
router.get("/by-domain/:host", resolveShopByDomain);
router.get("/:slug", getPublicShopfront);
router.post("/:slug/orders", createPublicShopOrder);
router.post("/:slug/enquiries", createPublicShopServiceEnquiry);

export default router;
