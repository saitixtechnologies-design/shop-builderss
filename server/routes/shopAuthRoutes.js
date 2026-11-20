import express from "express";

import {
    shopAdminLogin
} from "../controllers/shopAuthController.js";

const router = express.Router();

/*
    POST /api/shop-auth/login
*/
router.post(
    "/login",
    shopAdminLogin
);

export default router;