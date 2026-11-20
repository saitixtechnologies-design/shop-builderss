import express from "express";
import cors from "cors";

import shopAuthRoutes from "./routes/shopAuthRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import shopRoutes from "./routes/shopRoutes.js";

import categoryRoutes from "./routes/categoryRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import brandRoutes from "./routes/brandRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";

import shopDashboardRoutes from "./routes/shopDashboardRoutes.js";
import shopProductRoutes from "./routes/shopProductRoutes.js";
import shopServiceRoutes from "./routes/shopServiceRoutes.js";
import shopServiceEnquiryRoutes from "./routes/shopServiceEnquiryRoutes.js";
import shopCategoryRoutes from "./routes/shopCategoryRoutes.js";
import shopBrandRoutes from "./routes/shopBrandRoutes.js";
import shopSettingsRoutes from "./routes/shopSettingsRoutes.js";

import bannerRoutes from "./routes/bannerRoutes.js";
import couponRoutes from "./routes/couponRoutes.js";
import shopBannerRoutes from "./routes/shopBannerRoutes.js";
import shopPortfolioRoutes from "./routes/shopPortfolioRoutes.js";
import shopCouponRoutes from "./routes/shopCouponRoutes.js";
import adminDataRoutes from "./routes/adminDataRoutes.js";
import shopDataRoutes from "./routes/shopDataRoutes.js";
import publicShopRoutes from "./routes/publicShopRoutes.js";
import mediaRoutes from "./routes/mediaRoutes.js";
import shopWebsiteRoutes from "./routes/shopWebsiteRoutes.js";
import shopPasswordRoutes from "./routes/shopPasswordRoutes.js";
import passwordRoutes from "./routes/passwordRoutes.js";
import { fileURLToPath } from "node:url";
import { loginLimiter, passwordLimiter, publicFormLimiter } from "./middleware/rateLimit.js";

const app = express();

// =====================================================
// MIDDLEWARE
// =====================================================

// Behind Render / Vercel the real visitor IP is in X-Forwarded-For. TRUST_PROXY = number of proxies.
const trustProxy = process.env.TRUST_PROXY ?? (process.env.NODE_ENV === "production" ? "1" : "");
if (trustProxy) app.set("trust proxy", /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy);

// CORS_ORIGINS = comma-separated list of allowed sites (admin panel and storefront), e.g.
// "https://admin.example.com,https://shop.example.com". Empty = allow all (local development).
const allowedOrigins = String(process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);

app.disable("x-powered-by");
// Public shop data (/api/public/...) is read by storefronts on any address, including shops'
// own domains, and uses no sign-in cookies, so every origin may call it. Admin APIs stay limited.
app.use(cors((req, callback) => {
    const isPublic = req.path.startsWith("/api/public/");
    callback(null, {
        origin: isPublic || !allowedOrigins.length
            ? true
            : (origin, done) => done(null, !origin || allowedOrigins.includes(origin))
    });
}));
app.use((req, res, next) => {
    res.set({ "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin" });
    next();
});

// Slow down password guessing and form spam.
app.use(["/api/auth/login", "/api/shop-auth/login"], loginLimiter);
app.use(["/api/password", "/api/shop-password"], passwordLimiter);
app.post(["/api/public/shops/:slug/orders", "/api/public/shops/:slug/enquiries"], publicFormLimiter);
app.use(express.json({ limit: "12mb" }));
app.use("/uploads", express.static(fileURLToPath(new URL("../uploads/", import.meta.url)), {
    fallthrough: false,
    maxAge: "7d",
    immutable: true
}));

// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Shop Builder SaaS API is running",
    });
});

// =====================================================
// AUTH ROUTES
// =====================================================

app.use("/api/auth", authRoutes);
app.use("/api/shop-auth", shopAuthRoutes);
app.use("/api/admin", adminDataRoutes);
app.use("/api/shop-data", shopDataRoutes);
app.use("/api/public/shops", publicShopRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/shop-website", shopWebsiteRoutes);

// =====================================================
// SHOP DASHBOARD
// =====================================================

app.use("/api/shop-dashboard", shopDashboardRoutes);

// =====================================================
// SHOP PRODUCT ROUTES
// =====================================================

app.use("/api/shop-products", shopProductRoutes);

// =====================================================
// SHOP SERVICE ROUTES
// =====================================================

app.use("/api/shop-services", shopServiceRoutes);
app.use("/api/shop-enquiries", shopServiceEnquiryRoutes);

// =====================================================
// SHOP CATEGORY ROUTES
// =====================================================

app.use("/api/shop-categories", shopCategoryRoutes);

// =====================================================
// SHOP BRAND ROUTES
// =====================================================

app.use("/api/shop-brands", shopBrandRoutes);

// =====================================================
// SHOP SETTINGS
// =====================================================

app.use("/api/shop-settings", shopSettingsRoutes);

// =====================================================
// SHOP ROUTES
// =====================================================

app.use("/api/shops", shopRoutes);

// =====================================================
// SUPER ADMIN CATEGORY ROUTES
// =====================================================

app.use("/api/categories", categoryRoutes);
app.use(
    "/api/password",
    passwordRoutes
);

app.use(
    "/api/shop-password",
    shopPasswordRoutes
);

// =====================================================
// SUPER ADMIN PRODUCT ROUTES
// =====================================================

app.use("/api/products", productRoutes);

// =====================================================
// SUPER ADMIN BRAND ROUTES
// =====================================================

app.use("/api/brands", brandRoutes);

// =====================================================
// BANNER ROUTES
// =====================================================

app.use("/api/banners", bannerRoutes);

// =====================================================
// COUPON ROUTES
// =====================================================

app.use("/api/coupons", couponRoutes);

// =====================================================
// SHOP BANNER ROUTES
// =====================================================

app.use("/api/shop-banners", shopBannerRoutes);
app.use("/api/shop-portfolio", shopPortfolioRoutes);

// =====================================================
// SHOP COUPON ROUTES
// =====================================================

app.use("/api/shop-coupons", shopCouponRoutes);

// =====================================================
// SUPER ADMIN SERVICE ROUTES
// =====================================================

app.use("/api/services", serviceRoutes);

// =====================================================
// 404 API HANDLER
// =====================================================

app.use("/api", (req, res) => {
    res.status(404).json({
        success: false,
        message: `API route not found: ${req.method} ${req.originalUrl}`,
    });
});

// =====================================================
// EXPORT APP
// =====================================================

export default app;
