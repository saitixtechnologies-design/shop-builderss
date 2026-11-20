import express from "express";
import { uploadImage } from "../controllers/mediaController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();
router.post("/image", authenticateToken, uploadImage);
export default router;
