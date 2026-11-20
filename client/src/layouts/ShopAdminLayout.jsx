import { useState, useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router";

import ShopAdminSidebar from "../components/shopAdmin/ShopAdminSidebar";
import ShopAdminTopbar from "../components/shopAdmin/ShopAdminTopbar";
import ShopAdminContentLanguage from "../components/shopAdmin/ShopAdminContentLanguage";
import "../styles/shop-admin/shop-admin-layout.css";
import { getShopAdminToken } from "../lib/api.js";

function ShopAdminLayout() {
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    // Validate the persisted session once when entering the admin shell.
    // Re-checking JWT expiry on every child route change could send an already
    // open admin session to login just as the user navigates to a new section.
    const [hasShopAdminSession] = useState(() => Boolean(getShopAdminToken()));

    // ==========================================
    // CLOSE SIDEBAR WHEN ROUTE CHANGES
    // ==========================================

    useEffect(() => {
        const handleRouteChange = () => {
            if (window.innerWidth <= 900) {
                setSidebarOpen(false);
            }
        };

        window.addEventListener(
            "popstate",
            handleRouteChange
        );

        return () => {
            window.removeEventListener(
                "popstate",
                handleRouteChange
            );
        };
    }, []);


    // ==========================================
    // HANDLE WINDOW RESIZE
    // ==========================================

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 900) {
                setSidebarOpen(false);
            }
        };

        window.addEventListener(
            "resize",
            handleResize
        );

        return () => {
            window.removeEventListener(
                "resize",
                handleResize
            );
        };
    }, []);


    // ==========================================
    // BODY SCROLL LOCK ON MOBILE
    // ==========================================

    useEffect(() => {
        if (
            sidebarOpen &&
            window.innerWidth <= 900
        ) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }

        return () => {
            document.body.style.overflow = "";
        };
    }, [sidebarOpen]);

    if (!hasShopAdminSession) {
        return <Navigate to="/shop/login" replace state={{ from: location }} />;
    }

    let shopAdminUser = null;
    try {
        shopAdminUser = JSON.parse(localStorage.getItem("shopAdminUser") || "null");
    } catch { /* Keep the unauthenticated fallback when saved user data is invalid. */ }
    const isServiceShop = String(
        shopAdminUser?.shop?.shopType || shopAdminUser?.shop?.ShopType || "Ecommerce"
    ).toLowerCase() === "service";
    const ecommerceOnlyPaths = [
        "/shop-admin/products",
        "/shop-admin/categories",
        "/shop-admin/brands",
        "/shop-admin/orders",
        "/shop-admin/customers",
        "/shop-admin/coupons",
    ];
    if (isServiceShop && ecommerceOnlyPaths.some((path) => (
        location.pathname === path || location.pathname.startsWith(`${path}/`)
    ))) {
        return <Navigate to="/shop-admin/dashboard" replace />;
    }


    // ==========================================
    // CLOSE SIDEBAR
    // ==========================================

    const handleCloseSidebar = () => {
        setSidebarOpen(false);
    };


    // ==========================================
    // TOGGLE SIDEBAR
    // ==========================================

    const handleToggleSidebar = () => {
        setSidebarOpen((prev) => !prev);
    };


    return (
        <div className="shop-admin-layout">

            {/* =====================================
                SIDEBAR
            ====================================== */}

            <ShopAdminSidebar
                isOpen={sidebarOpen}
                onClose={handleCloseSidebar}
            />


            {/* =====================================
                MOBILE OVERLAY
            ====================================== */}

            {sidebarOpen && (
                <div
                    className="shop-admin-sidebar-overlay"
                    onClick={handleCloseSidebar}
                    aria-hidden="true"
                />
            )}


            {/* =====================================
                MAIN AREA
            ====================================== */}

            <div className="shop-admin-main">

                {/* =================================
                    TOPBAR
                ================================== */}

                <ShopAdminTopbar
                    onMenuClick={handleToggleSidebar}
                />


                {/* =================================
                    PAGE CONTENT
                ================================== */}

                <main className="shop-admin-content">

                    <ShopAdminContentLanguage />

                    <Outlet />

                </main>

            </div>

        </div>
    );
}

export default ShopAdminLayout;
