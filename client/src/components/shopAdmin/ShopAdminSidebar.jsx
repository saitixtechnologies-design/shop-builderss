import {
    LayoutDashboard,
    Tags,
    Award,
    Package,
    Wrench,
    ShoppingCart,
    UserRound,
    TicketPercent,
    BarChart3,
    Settings,
    LogOut,
    X,
    Store,
    Image,
    Briefcase,
    Eye,
    FileText,
    CircleHelp,
} from "lucide-react";

import { useLocation, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { getShopAdminLanguage, readShopAdminUser } from "../../lib/shopAdminLanguage.js";

import "../../styles/shop-admin/shop-admin-sidebar.css";

function ShopAdminSidebar({ isOpen, onClose }) {
    const navigate = useNavigate();
    const location = useLocation();
    const shopUser = (() => {
        try { return JSON.parse(localStorage.getItem("shopAdminUser") || "null"); }
        catch { return null; }
    })();
    const shopType = String(shopUser?.shop?.shopType || shopUser?.shop?.ShopType || "Ecommerce").toLowerCase();
    const isServiceShop = shopType === "service";
    const [language, setLanguage] = useState(() => getShopAdminLanguage(shopUser));
    useEffect(() => {
        const syncLanguage = (event) => {
            if (!event.detail || getShopAdminLanguage(readShopAdminUser()) === event.detail.language) {
                setLanguage(getShopAdminLanguage(readShopAdminUser()));
            }
        };
        window.addEventListener("shop-admin-language-change", syncLanguage);
        return () => window.removeEventListener("shop-admin-language-change", syncLanguage);
    }, []);
    const hindiLabels = {
        Dashboard: "डैशबोर्ड", "Live Preview": "लाइव प्रीव्यू", "Shop Editor": "शॉप एडिटर",
        Products: "उत्पाद", Services: "सेवाएँ", Categories: "श्रेणियाँ", Brands: "ब्रांड",
        Banners: "बैनर", Portfolio: "पोर्टफ़ोलियो", Orders: "ऑर्डर", Customers: "ग्राहक",
        Coupons: "कूपन", Reports: "रिपोर्ट", "Shop Settings": "दुकान की सेटिंग्स", Help: "मदद",
    };
    const hinglishLabels = {
        Dashboard: "Dashboard", "Live Preview": "Live Preview", "Shop Editor": "Shop Editor",
        Products: "Products", Services: "Services", Categories: "Categories", Brands: "Brands",
        Banners: "Banners", Portfolio: "Portfolio", Orders: "Orders", Customers: "Customers",
        Coupons: "Coupons", Reports: "Reports", "Shop Settings": "Shop Settings",
        Help: "Madad / Help",
    };

    const menuItems = [
        {
            label: "Dashboard",
            icon: LayoutDashboard,
            path: "/shop-admin/dashboard",
        },
        {
            label: "Live Preview",
            icon: Eye,
            path: "/shop-admin/live-preview",
        },
        {
            label: "Shop Editor",
            icon: FileText,
            path: "/shop-admin/website-editor",
        },
        {
            label: "Products",
            icon: Package,
            path: "/shop-admin/products",
        },
        {
            label: "Services",
            icon: Wrench,
            path: "/shop-admin/services",
        },
        {
            label: "Categories",
            icon: Tags,
            path: "/shop-admin/categories",
        },
        {
            label: "Brands",
            icon: Award,
            path: "/shop-admin/brands",
        },
        {
            label: "Banners",
            icon: Image,
            path: "/shop-admin/banners",
        },
        {
            label: "Portfolio",
            icon: Briefcase,
            path: "/shop-admin/portfolio",
        },
        {
            label: "Orders",
            icon: ShoppingCart,
            path: "/shop-admin/orders",
        },
        {
            label: "Customers",
            icon: UserRound,
            path: "/shop-admin/customers",
        },
        {
            label: "Coupons",
            icon: TicketPercent,
            path: "/shop-admin/coupons",
        },
        {
            label: "Reports",
            icon: BarChart3,
            path: "/shop-admin/reports",
        },
        {
            label: "Shop Settings",
            icon: Settings,
            path: "/shop-admin/settings",
        },
        {
            label: "Help",
            icon: CircleHelp,
            path: "/shop-admin/help",
        },
    ];
    const visibleMenuItems = isServiceShop
        ? menuItems.filter((item) => ![
              "/shop-admin/products",
              "/shop-admin/categories",
              "/shop-admin/brands",
              "/shop-admin/orders",
              "/shop-admin/customers",
              "/shop-admin/coupons",
              "/shop-admin/reports",
          ].includes(item.path))
        : menuItems;

    const handleNavigation = (path) => {
        navigate(path);

        if (window.innerWidth <= 900 && onClose) {
            onClose();
        }
    };

    const handleLogout = () => {
        ["token", "user", "adminToken", "adminUser", "superAdminToken", "superAdminUser", "shopToken", "shopAdminToken", "shopAdminUser", "shopBuilderToken", "shopBuilderUser"].forEach((key) => localStorage.removeItem(key));

        navigate("/shop/login", {
            replace: true,
        });
    };

    const isActive = (path) => {
        if (path === "/shop-admin/dashboard") {
            return location.pathname === path;
        }

        return location.pathname.startsWith(path);
    };

    const shopName =
        shopUser?.shop?.shopName || "My Shop";

    const fullName =
        shopUser?.fullName || "Shop Admin";

    const email =
        shopUser?.email || "admin@shopbuilder.com";

    const initials = fullName
        .split(" ")
        .map((name) => name.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase();

    return (
        <aside
            className={`shop-admin-sidebar ${
                isOpen ? "sidebar-open" : ""
            }`}
        >
            {/* =====================================
                SIDEBAR HEADER
            ====================================== */}

            <div className="shop-sidebar-header">
                <button type="button" className="shop-sidebar-brand-button" onClick={() => handleNavigation(isServiceShop ? "/shop-admin/dashboard" : "/shop-admin/welcome")} aria-label="Open ShopBuilder home">
                <div className="shop-sidebar-brand">
                    <div className="shop-brand-icon">
                        <Store
                            size={22}
                            strokeWidth={2.4}
                        />
                    </div>

                    <div className="shop-brand-text">
                        <h2>ShopBuilder</h2>
                        <span>{language === "hi" ? "शॉप एडमिन" : "Shop Admin"}</span>
                    </div>
                </div>
                </button>

                <button
                    type="button"
                    className="shop-sidebar-close"
                    onClick={onClose}
                    aria-label="Close sidebar"
                >
                    <X size={22} />
                </button>
            </div>

            {/* =====================================
                SHOP INFORMATION
            ====================================== */}

            <div className="shop-info-card">
                <div className="shop-info-icon">
                    <Store size={20} />
                </div>

                <div className="shop-info-text">
                    <strong>{shopName}</strong>

                    <span>
                        {language === "hi" ? "शॉप एडमिन पैनल" : "Shop Admin Panel"}
                    </span>
                </div>
            </div>

            {/* =====================================
                SECTION TITLE
            ====================================== */}

            <div className="shop-sidebar-section-title">
                    {language === "hi"
                        ? (isServiceShop ? "सेवा वेबसाइट" : "दुकान प्रबंधन")
                        : (isServiceShop ? "SERVICE WEBSITE" : "SHOP MANAGEMENT")}
            </div>

            {/* =====================================
                NAVIGATION
            ====================================== */}

            <nav className="shop-sidebar-nav">
                {visibleMenuItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);

                    return (
                        <button
                            key={item.label}
                            type="button"
                            className={`shop-sidebar-nav-item ${
                                active ? "active" : ""
                            }`}
                            aria-current={active ? "page" : undefined}
                            onClick={() =>
                                handleNavigation(
                                    item.path
                                )
                            }
                        >
                            <span className="shop-sidebar-nav-icon">
                                <Icon
                                    size={19}
                                    strokeWidth={2}
                                />
                            </span>

                            <span className="shop-sidebar-nav-label">
                                {language === "hi" ? hindiLabels[item.label] : language === "hinglish" ? hinglishLabels[item.label] : item.label}
                            </span>

                            {active && (
                                <span className="shop-active-indicator" />
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* =====================================
                SIDEBAR FOOTER
            ====================================== */}

            <div className="shop-sidebar-footer">
                <div className="shop-admin-profile">
                    <div className="shop-admin-avatar">
                        {initials || "SA"}
                    </div>

                    <div className="shop-admin-profile-info">
                        <strong>
                            {fullName}
                        </strong>

                        <span>
                            {email}
                        </span>
                    </div>
                </div>

                <button
                    type="button"
                    className="shop-sidebar-logout"
                    onClick={handleLogout}
                >
                    <LogOut size={18} />

                    <span>
                        {language === "hi" ? "लॉग आउट" : "Logout"}
                    </span>
                </button>
            </div>
        </aside>
    );
}

export default ShopAdminSidebar;
