import express from "express";
import { authenticateToken, requireSuperAdmin } from "../middleware/authMiddleware.js";

import {
    getServices,
    getServiceById,
    createService,
    updateService,
    deleteService,
    toggleServiceStatus
} from "../controllers/serviceController.js";

const router = express.Router();
router.use(authenticateToken, requireSuperAdmin);

/* =========================================================
   SERVICE ROUTES
   ========================================================= */

// GET all services
router.get("/", getServices);

// GET single service
router.get("/:id", getServiceById);

// CREATE service
router.post("/", createService);

// UPDATE service
router.put("/:id", updateService);

// DELETE service
router.delete("/:id", deleteService);

// TOGGLE service status
router.patch("/:id/status", toggleServiceStatus);

export default router;
