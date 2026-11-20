import express from "express";

import {
    createShop,
    getAllShops,
    getShopById,
    updateShop,
    toggleShopStatus,
    deleteShop
} from "../controllers/shopController.js";
import { authenticateToken, requireSuperAdmin } from "../middleware/authMiddleware.js";


const router = express.Router();
router.use(authenticateToken, requireSuperAdmin);


// GET ALL SHOPS
router.get("/", getAllShops);


// GET SINGLE SHOP
router.get("/:id", getShopById);


// CREATE SHOP
router.post("/", createShop);


// UPDATE SHOP
router.put("/:id", updateShop);


// TOGGLE ACTIVE / INACTIVE
router.patch("/:id/status", toggleShopStatus);


// DELETE SHOP
router.delete("/:id", deleteShop);


export default router;
