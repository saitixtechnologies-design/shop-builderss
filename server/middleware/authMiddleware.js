import jwt from "jsonwebtoken";
import { getDB } from "../config/db.js";

// =====================================================
// AUTHENTICATE JWT
// =====================================================

export const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Authorization token is required."
            });
        }

        const parts = authHeader.split(" ");

        if (
            parts.length !== 2 ||
            parts[0] !== "Bearer"
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid authorization format."
            });
        }

        const token = parts[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = decoded;

        next();

    } catch (error) {
        console.error(
            "Auth Middleware Error:",
            error.message
        );

        return res.status(401).json({
            success: false,
            message: "Invalid or expired token."
        });
    }
};

// =====================================================
// PLATFORM SUSPENSION
// The super admin can suspend a shop (Shops.Status = 'Inactive'). A suspended shop's owner is
// locked out of Shop Admin at once, even with a sign-in token issued earlier. The answer is
// cached for 30 seconds per shop; the super admin's toggle clears it immediately.
// =====================================================

const SHOP_STATUS_CACHE_MS = 30_000;
const shopStatusCache = new Map();

export const forgetShopStatus = (shopID) => shopStatusCache.delete(Number(shopID));

async function platformStatus(shopID) {
    const cached = shopStatusCache.get(shopID);
    if (cached && Date.now() - cached.at < SHOP_STATUS_CACHE_MS) return cached.status;
    const result = await getDB().request().input("ShopID", shopID)
        .query("SELECT Status FROM dbo.Shops WHERE ShopID = @ShopID");
    const status = result.recordset[0]?.Status || "Missing";
    shopStatusCache.set(shopID, { status, at: Date.now() });
    return status;
}

/** Sends the "suspended" answer and returns true when the shop may not be managed right now. */
async function blockedByPlatform(req, res) {
    const shopID = Number(req.user?.shopID ?? req.user?.ShopID);
    let status;
    try {
        status = await platformStatus(shopID);
    } catch {
        return false; // database unreachable: the request itself will report that
    }
    if (status === "Active") return false;
    res.status(403).json({
        success: false,
        code: "SHOP_SUSPENDED",
        message: status === "Missing"
            ? "This shop no longer exists."
            : "Your shop has been paused by the platform team. Please contact support to turn it back on."
    });
    return true;
}

// =====================================================
// SHOP ADMIN ACCESS
// =====================================================

export const requireShopAccess = async (
    req,
    res,
    next
) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        const role = String(req.user.role || "").toLowerCase().replace(/[ _-]/g, "");
        if (role !== "shopadmin") {
            return res.status(403).json({
                success: false,
                message:
                    "Shop Admin access required."
            });
        }

        if (!req.user.shopID) {
            return res.status(403).json({
                success: false,
                message:
                    "Shop ID not found in authentication token."
            });
        }

        if (await blockedByPlatform(req, res)) return;

        next();

    } catch (error) {
        console.error(
            "Shop Access Error:",
            error.message
        );

        return res.status(403).json({
            success: false,
            message: "Shop access denied."
        });
    }
};

export const requireShopType = (expectedType) => (req, res, next) => {
    const shopType = String(req.user?.shopType || "Ecommerce")
        .trim()
        .toLowerCase();

    if (shopType !== String(expectedType).trim().toLowerCase()) {
        return res.status(403).json({
            success: false,
            message: "This feature is not available for your shop type."
        });
    }

    next();
};

export const requireSuperAdmin = (req, res, next) => {
    const role = String(req.user?.role || "").toLowerCase().replace(/[ _-]/g, "");
    if (role !== "superadmin") {
        return res.status(403).json({
            success: false,
            message: "Super Admin access required."
        });
    }

    next();
};

export const requireWebsiteEditorAccess = async (req, res, next) => {
    const role = String(req.user?.role || "").toLowerCase().replace(/[ _-]/g, "");
    if (role === "superadmin") return next();
    if (role !== "shopadmin") {
        return res.status(403).json({ success: false, message: "Website Editor access denied." });
    }

    const shopID = Number(req.user?.shopID ?? req.user?.ShopID);
    if (!Number.isInteger(shopID) || shopID < 1) {
        return res.status(403).json({ success: false, message: "Shop ID is missing from your session." });
    }
    const shopPathMatch = req.path.match(/^\/pages\/(\d+)(?:\/|$)/);
    const requestedShopID = req.params.shopId ?? shopPathMatch?.[1];
    if (requestedShopID && Number(requestedShopID) !== shopID) {
        return res.status(403).json({ success: false, message: "You can edit website pages only for your shop." });
    }
    if (await blockedByPlatform(req, res)) return;

    // The server-side tenant identity overrides any ShopID supplied by the browser.
    if (req.method === "POST") {
        req.body = req.body || {};
        req.body.shopId = shopID;
    }
    next();
};
