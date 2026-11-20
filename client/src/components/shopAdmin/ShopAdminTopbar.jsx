import {
    Menu,
    Bell,
    ChevronDown,
    Store,
    User,
    LogOut,
} from "lucide-react";

import { useEffect, useRef, useState } from "react";
import { getShopAdminLanguage, getShopAdminTenantId, readShopAdminUser, setShopAdminLanguage } from "../../lib/shopAdminLanguage.js";

import "../../styles/shop-admin/shop-admin-topbar.css";

function ShopAdminTopbar({ onMenuClick }) {

    // ==========================================
    // USER DATA
    // ==========================================

    let user = null;

    try {
        user = JSON.parse(
            localStorage.getItem("shopAdminUser") ||
            localStorage.getItem("shopBuilderUser") ||
            localStorage.getItem("user") ||
            "null"
        );
    } catch (error) {
        console.error(
            "User data parse error:",
            error
        );
    }

    const shop = user?.shop || {};

    const shopName =
        shop.shopName ||
        user?.shopName ||
        "My Shop";

    const userName =
        user?.fullName ||
        "Shop Admin";

    const userEmail =
        user?.email ||
        "admin@shopbuilder.com";

    const [language, setLanguage] = useState(() => getShopAdminLanguage(user));
    const tenantId = getShopAdminTenantId(user);

    useEffect(() => {
        const syncLanguage = (event) => {
            if (!event.detail || String(event.detail.tenantId) === String(tenantId)) {
                setLanguage(getShopAdminLanguage(readShopAdminUser()));
            }
        };
        window.addEventListener("shop-admin-language-change", syncLanguage);
        return () => window.removeEventListener("shop-admin-language-change", syncLanguage);
    }, [tenantId]);

    const changeLanguage = (nextLanguage) => {
        setShopAdminLanguage(user, nextLanguage);
        setLanguage(nextLanguage);
    };


    // ==========================================
    // PROFILE DROPDOWN
    // ==========================================

    const [profileOpen, setProfileOpen] =
        useState(false);

    const profileRef = useRef(null);


    // ==========================================
    // CLOSE DROPDOWN OUTSIDE CLICK
    // ==========================================

    useEffect(() => {

        const handleOutsideClick = (event) => {

            if (
                profileRef.current &&
                !profileRef.current.contains(
                    event.target
                )
            ) {
                setProfileOpen(false);
            }
        };

        document.addEventListener(
            "mousedown",
            handleOutsideClick
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handleOutsideClick
            );
        };

    }, []);


    // ==========================================
    // LOGOUT
    // ==========================================

    const handleLogout = () => {

        const confirmLogout =
            window.confirm(
                "Are you sure you want to logout?"
            );

        if (!confirmLogout) {
            return;
        }

        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("shopAdminToken");
        localStorage.removeItem("shopAdminUser");
        localStorage.removeItem("shopBuilderToken");
        localStorage.removeItem("shopBuilderUser");

        window.location.href =
            "/shop/login";
    };


    // ==========================================
    // PROFILE INITIALS
    // ==========================================

    const getInitials = (name) => {

        if (!name) {
            return "SA";
        }

        const words =
            name.trim().split(/\s+/);

        if (words.length === 1) {
            return words[0]
                .substring(0, 2)
                .toUpperCase();
        }

        return (
            words[0][0] +
            words[words.length - 1][0]
        ).toUpperCase();
    };


    const initials =
        getInitials(userName);


    return (
        <header className="shop-admin-topbar">

            {/* =====================================
                LEFT SECTION
            ====================================== */}

            <div className="shop-topbar-left">

                {/* Mobile Menu */}

                <button
                    type="button"
                    className="shop-topbar-menu-btn"
                    onClick={onMenuClick}
                    aria-label="Open navigation menu"
                >
                    <Menu size={22} />
                </button>


                {/* Shop Info */}

                <div className="shop-topbar-shop">

                    <div className="shop-topbar-shop-icon">
                        <Store
                            size={18}
                            strokeWidth={2.2}
                        />
                    </div>

                    <div className="shop-topbar-shop-info">

                        <strong>
                            {shopName}
                        </strong>

                        <span>
                            {language === "hi" ? "शॉप एडमिन पैनल" : "Shop Admin Panel"}
                        </span>

                    </div>

                </div>

            </div>


            {/* =====================================
                RIGHT SECTION
            ====================================== */}

            <div className="shop-topbar-right">

                <div className="shop-language-switch" role="group" aria-label="Dashboard language">
                    <button type="button" className={language === "en" ? "active" : ""} aria-pressed={language === "en"} onClick={() => changeLanguage("en")}>English</button>
                    <button type="button" className={language === "hi" ? "active" : ""} aria-pressed={language === "hi"} onClick={() => changeLanguage("hi")}>हिन्दी</button>
                    <button type="button" className={language === "hinglish" ? "active" : ""} aria-pressed={language === "hinglish"} onClick={() => changeLanguage("hinglish")}>Hinglish</button>
                </div>

                {/* Notification */}

                <button
                    type="button"
                    className="shop-topbar-icon-btn"
                    aria-label="Notifications"
                    title="Notifications"
                >

                    <Bell size={19} />

                    <span className="notification-dot" />

                </button>


                {/* Divider */}

                <div className="shop-topbar-divider" />


                {/* Profile */}

                <div
                    className="shop-topbar-profile-wrapper"
                    ref={profileRef}
                >

                    <button
                        type="button"
                        className={`shop-topbar-profile ${
                            profileOpen
                                ? "open"
                                : ""
                        }`}
                        onClick={() =>
                            setProfileOpen(
                                (prev) => !prev
                            )
                        }
                        aria-expanded={
                            profileOpen
                        }
                    >

                        <div className="shop-topbar-avatar">
                            {initials}
                        </div>

                        <div className="shop-topbar-user-info">

                            <strong>
                                {userName}
                            </strong>

                            <span>
                                {language === "hi" ? "शॉप एडमिन" : "Shop Admin"}
                            </span>

                        </div>

                        <ChevronDown
                            size={16}
                            className="profile-chevron"
                        />

                    </button>


                    {/* =================================
                        PROFILE DROPDOWN
                    ================================== */}

                    {profileOpen && (

                        <div className="shop-topbar-dropdown">

                            {/* Dropdown Header */}

                            <div className="shop-dropdown-header">

                                <div className="shop-dropdown-avatar">
                                    {initials}
                                </div>

                                <div className="shop-dropdown-user">

                                    <strong>
                                        {userName}
                                    </strong>

                                    <span>
                                        {userEmail}
                                    </span>

                                </div>

                            </div>


                            <div className="shop-dropdown-divider" />


                            {/* Account */}

                            <button
                                type="button"
                                className="shop-dropdown-item"
                                onClick={() => {
                                    setProfileOpen(
                                        false
                                    );

                                    window.history.pushState(
                                        {},
                                        "",
                                        "/shop-admin/settings"
                                    );

                                    window.dispatchEvent(
                                        new PopStateEvent(
                                            "popstate"
                                        )
                                    );
                                }}
                            >

                                <User size={17} />

                                <span>
                                    {language === "hi" ? "दुकान की सेटिंग्स" : "Shop Settings"}
                                </span>

                            </button>


                            {/* Logout */}

                            <button
                                type="button"
                                className="shop-dropdown-item logout"
                                onClick={
                                    handleLogout
                                }
                            >

                                <LogOut size={17} />

                                <span>
                                    {language === "hi" ? "लॉग आउट" : "Logout"}
                                </span>

                            </button>

                        </div>

                    )}

                </div>

            </div>

        </header>
    );
}

export default ShopAdminTopbar;
