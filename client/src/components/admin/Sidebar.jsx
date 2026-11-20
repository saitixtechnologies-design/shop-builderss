import {
    LayoutDashboard,
    Store,
    Users,
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
    ShieldCheck,
    Image,
    Eye,
} from "lucide-react";

import "../../styles/admin-sidebar.css";

function Sidebar({ isOpen, onClose }) {

    const menuItems = [
        {
            label: "Dashboard",
            icon: LayoutDashboard,
            path: "/admin/dashboard",
        },
        {
            label: "Shops",
            icon: Store,
            path: "/admin/shops",
        },
        {
            label: "Shop Live Preview",
            icon: Eye,
            path: "/admin/live-preview",
        },
        {
            label: "Users",
            icon: Users,
            path: "/admin/users",
        },
        {
            label: "Categories",
            icon: Tags,
            path: "/admin/categories",
        },
        {
            label: "Brands",
            icon: Award,
            path: "/admin/brands",
        },
        {
            label: "Products",
            icon: Package,
            path: "/admin/products",
        },
        {
            label: "Services",
            icon: Wrench,
            path: "/admin/services",
        },
        {
    label: "Banners",
    icon: Image,
    path: "/admin/banners",
},
        {
            label: "Orders",
            icon: ShoppingCart,
            path: "/admin/orders",
        },
        {
            label: "Customers",
            icon: UserRound,
            path: "/admin/customers",
        },
        {
            label: "Coupons",
            icon: TicketPercent,
            path: "/admin/coupons",
        },
        {
            label: "Reports",
            icon: BarChart3,
            path: "/admin/reports",
        },
        {
            label: "Settings",
            icon: Settings,
            path: "/admin/settings",
        },
    ];

    const handleNavigation = (path) => {

        window.history.pushState({}, "", path);

        window.dispatchEvent(
            new PopStateEvent("popstate")
        );

        if (window.innerWidth <= 900) {
            onClose?.();
        }
    };

    const handleLogout = () => {
    // Clear all authentication/session data
    const authKeys = [
        "token",
        "user",
        "adminToken",
        "adminUser",
        "superAdminToken",
        "superAdminUser",
        "shopAdminToken",
        "shopAdminUser",
        "shopToken",
        "shopBuilderToken",
        "shopBuilderUser",
    ];

    authKeys.forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    });

    // Clear password-reset related sessions also
    sessionStorage.removeItem("passwordResetToken");
    sessionStorage.removeItem("passwordResetEmail");
    sessionStorage.removeItem("shopPasswordResetToken");
    sessionStorage.removeItem("shopPasswordResetEmail");

    // Redirect to Super Admin login
    window.location.replace("/admin/login");
};

    return (
        <aside
            id="admin-navigation"
            className={`admin-sidebar ${
                isOpen ? "sidebar-open" : ""
            }`}
            aria-label="Admin navigation"
        >

            {/* =========================
                SIDEBAR HEADER
            ========================== */}

            <div className="sidebar-header">

                <div className="sidebar-brand">

                    <div className="brand-icon">
                        <ShieldCheck
                            size={22}
                            strokeWidth={2.4}
                        />
                    </div>

                    <div className="brand-text">
                        <h2>ShopBuilder</h2>
                        <span>SaaS Platform</span>
                    </div>

                </div>

                {/* Mobile Close */}

                <button
                    type="button"
                    className="sidebar-close"
                    onClick={onClose}
                    aria-label="Close sidebar"
                >
                    <X size={22} />
                </button>

            </div>


            {/* =========================
                MAIN NAVIGATION
            ========================== */}

            <div className="sidebar-section-title">
                MAIN MENU
            </div>

            <nav className="sidebar-nav">

                {menuItems.map((item) => {

                    const Icon = item.icon;

                    const isActive =
                        window.location.pathname === item.path;

                    return (
                        <button
                            type="button"
                            key={item.label}
                            className={`sidebar-nav-item ${
                                isActive ? "active" : ""
                            }`}
                            onClick={() =>
                                handleNavigation(item.path)
                            }
                        >

                            <span className="sidebar-nav-icon">
                                <Icon
                                    size={19}
                                    strokeWidth={2}
                                />
                            </span>

                            <span className="sidebar-nav-label">
                                {item.label}
                            </span>

                            {isActive && (
                                <span className="active-indicator" />
                            )}

                        </button>
                    );
                })}

            </nav>


            {/* =========================
                SIDEBAR FOOTER
            ========================== */}

            <div className="sidebar-footer">

                <div className="admin-profile">

                    <div className="admin-avatar">
                        SA
                    </div>

                    <div className="admin-profile-info">

                        <strong>
                            Super Admin
                        </strong>

                        <span>
                            admin@shopbuilder.com
                        </span>

                    </div>

                </div>

                <button
                    type="button"
                    className="sidebar-logout"
                    onClick={handleLogout}
                >
                    <LogOut size={18} />

                    <span>
                        Logout
                    </span>
                </button>

            </div>

        </aside>
    );
}

export default Sidebar;
