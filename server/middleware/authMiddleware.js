import jwt from "jsonwebtoken";

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
// SHOP ADMIN ACCESS
// =====================================================

export const requireShopAccess = (
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

export const requireWebsiteEditorAccess = (req, res, next) => {
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

    // The server-side tenant identity overrides any ShopID supplied by the browser.
    if (req.method === "POST") {
        req.body = req.body || {};
        req.body.shopId = shopID;
    }
    next();
};
