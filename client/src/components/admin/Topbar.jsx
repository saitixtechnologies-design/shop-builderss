import {
    Menu,
    Search,
    Bell,
    ChevronDown,
    CalendarDays,
    UserRound,
    Settings,
    LockKeyhole,
    LogOut,
    X,
} from "lucide-react";

import {
    useEffect,
    useRef,
    useState,
} from "react";

import {
    useLocation,
    useNavigate,
} from "react-router";

import {
    getJson,
} from "../../lib/api";

import "../../styles/admin-topbar.css";


function Topbar({ onMenuClick, sidebarOpen = false }) {

    const { pathname } = useLocation();

    const navigate = useNavigate();

    const profileRef = useRef(null);

    const searchRef = useRef(null);


    // =====================================================
    // PROFILE STATE
    // =====================================================

    const [profile, setProfile] = useState({
        fullName: "Super Admin",
        email: "admin@shopbuilder.com",
        role: "Super Admin",
    });


    const [profileOpen, setProfileOpen] =
        useState(false);


    const [notificationOpen, setNotificationOpen] =
        useState(false);


    const [dateOpen, setDateOpen] =
        useState(false);


    const [dateRange, setDateRange] =
        useState("Last 30 Days");


    // =====================================================
    // PAGE NAME
    // =====================================================

    const pageName = {

        "/admin/dashboard": "Dashboard",

        "/admin/shops": "Shops",

        "/admin/live-preview": "Shop Live Preview",

        "/admin/users": "Users",

        "/admin/categories": "Categories",

        "/admin/brands": "Brands",

        "/admin/products": "Products",

        "/admin/services": "Services",

        "/admin/banners": "Banners",

        "/admin/orders": "Orders",

        "/admin/customers": "Customers",

        "/admin/coupons": "Coupons",

        "/admin/reports": "Reports",

        "/admin/settings": "Settings",

    }[pathname] ||
        (
            pathname.includes("/settings")
                ? "Shop Settings"
                : "Dashboard"
        );


    // =====================================================
    // LOAD SUPER ADMIN PROFILE
    // =====================================================

    useEffect(() => {

        const loadProfile = async () => {

            // First load local data immediately

            try {

                const storedUser =
                    localStorage.getItem(
                        "superAdminUser"
                    ) ||
                    localStorage.getItem(
                        "adminUser"
                    ) ||
                    localStorage.getItem(
                        "user"
                    );


                if (storedUser) {

                    const user =
                        JSON.parse(storedUser);


                    setProfile({
                        fullName:
                            user.fullName ||
                            user.FullName ||
                            "Super Admin",

                        email:
                            user.email ||
                            user.Email ||
                            "admin@shopbuilder.com",

                        role:
                            user.role ||
                            user.RoleName ||
                            "Super Admin",
                    });

                }

            } catch (error) {

                console.error(
                    "Topbar local profile error:",
                    error
                );

            }


            // Then load latest data from DB

            try {

                const {
                    response,
                    data
                } = await getJson(
                    "/api/auth/profile"
                );


                if (
                    response.ok &&
                    data?.success &&
                    data?.data?.user
                ) {

                    const user =
                        data.data.user;


                    const updatedProfile = {

                        fullName:
                            user.fullName ||
                            "Super Admin",

                        email:
                            user.email ||
                            "admin@shopbuilder.com",

                        role:
                            user.role ||
                            "Super Admin",

                    };


                    setProfile(
                        updatedProfile
                    );


                    // Keep local session updated

                    localStorage.setItem(
                        "superAdminUser",
                        JSON.stringify(user)
                    );

                    localStorage.setItem(
                        "adminUser",
                        JSON.stringify(user)
                    );

                    localStorage.setItem(
                        "user",
                        JSON.stringify(user)
                    );

                }

            } catch (error) {

                console.error(
                    "Topbar profile API error:",
                    error
                );

            }

        };


        loadProfile();

    }, [pathname]);


    // =====================================================
    // CLOSE DROPDOWNS ON OUTSIDE CLICK
    // =====================================================

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


    // =====================================================
    // KEYBOARD SEARCH SHORTCUT
    // =====================================================

    useEffect(() => {

        const handleKeyDown = (event) => {

            // Don't trigger while typing in input

            const target =
                event.target;

            const isTyping =
                target?.tagName === "INPUT" ||
                target?.tagName === "TEXTAREA" ||
                target?.isContentEditable;


            if (
                event.key === "/" &&
                !isTyping
            ) {

                event.preventDefault();

                searchRef.current?.focus();

            }


            // Escape

            if (event.key === "Escape") {

                setProfileOpen(false);

                setNotificationOpen(false);

                setDateOpen(false);

                searchRef.current?.blur();

            }

        };


        document.addEventListener(
            "keydown",
            handleKeyDown
        );


        return () => {

            document.removeEventListener(
                "keydown",
                handleKeyDown
            );

        };

    }, []);


    // =====================================================
    // INITIALS
    // =====================================================

    const getInitials = (name) => {

        if (!name) return "SA";


        return name
            .trim()
            .split(/\s+/)
            .map(
                (word) => word[0]
            )
            .join("")
            .slice(0, 2)
            .toUpperCase();

    };


    const initials =
        getInitials(
            profile.fullName
        );


    // =====================================================
    // LOGOUT
    // =====================================================

    const handleLogout = () => {

        const keysToRemove = [

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


        keysToRemove.forEach(
            (key) =>
                localStorage.removeItem(key)
        );


        // Clear reset sessions

        sessionStorage.removeItem(
            "passwordResetToken"
        );

        sessionStorage.removeItem(
            "passwordResetEmail"
        );


        setProfileOpen(false);


        window.location.href =
            "/admin/login";

    };


    // =====================================================
    // PROFILE NAVIGATION
    // =====================================================

    const openSettings = () => {

        setProfileOpen(false);

        navigate("/admin/settings");

    };


    // =====================================================
    // DATE RANGE
    // =====================================================

    const handleDateChange = (range) => {

        setDateRange(range);

        setDateOpen(false);

    };


    // =====================================================
    // NOTIFICATIONS
    // =====================================================

    const notifications = [
        {
            id: 1,
            title: "New order received",
            description:
                "A new order has been placed.",
            time: "Recently",
            unread: true,
        },
        {
            id: 2,
            title: "Shop activity",
            description:
                "Shop data has been updated.",
            time: "Today",
            unread: true,
        },
        {
            id: 3,
            title: "System notification",
            description:
                "Your admin panel is running normally.",
            time: "Today",
            unread: false,
        },
    ];


    const unreadCount =
        notifications.filter(
            (item) => item.unread
        ).length;


    return (

        <header className="admin-topbar">


            {/* =================================================
                LEFT SIDE
            ================================================= */}

            <div className="topbar-left">


                {/* MOBILE MENU */}

                <button
                    type="button"
                    className="mobile-menu-btn"
                    onClick={onMenuClick}
                    aria-label="Open menu"
                    aria-controls="admin-navigation"
                    aria-expanded={sidebarOpen}
                >

                    <Menu size={22} />

                </button>


                {/* PAGE INFO */}

                <div className="topbar-page-info">

                    <span className="topbar-page-label">

                        Admin Panel

                    </span>


                    <h1>

                        {pageName}

                    </h1>

                </div>

            </div>


            {/* =================================================
                SEARCH
            ================================================= */}

            <div className="topbar-search">

                <Search
                    size={18}
                    className="search-icon"
                />


                <input
                    ref={searchRef}
                    type="search"
                    placeholder="Search anything..."
                    aria-label="Search"
                />


                <span className="search-shortcut">

                    /

                </span>

            </div>


            {/* =================================================
                RIGHT SIDE
            ================================================= */}

            <div className="topbar-right">


                {/* =================================================
                    DATE
                ================================================= */}

                <div className="topbar-dropdown-wrapper">

                    <button
                        type="button"
                        className="topbar-date"
                        onClick={() => {

                            setDateOpen(
                                (prev) => !prev
                            );

                            setProfileOpen(false);

                            setNotificationOpen(false);

                        }}
                    >

                        <CalendarDays
                            size={17}
                        />

                        <span>
                            {dateRange}
                        </span>

                        <ChevronDown
                            size={15}
                        />

                    </button>


                    {dateOpen && (

                        <div className="topbar-date-menu">

                            <button
                                type="button"
                                onClick={() =>
                                    handleDateChange(
                                        "Today"
                                    )
                                }
                            >
                                Today
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    handleDateChange(
                                        "Yesterday"
                                    )
                                }
                            >
                                Yesterday
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    handleDateChange(
                                        "Last 7 Days"
                                    )
                                }
                            >
                                Last 7 Days
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    handleDateChange(
                                        "Last 30 Days"
                                    )
                                }
                            >
                                Last 30 Days
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    handleDateChange(
                                        "This Month"
                                    )
                                }
                            >
                                This Month
                            </button>

                        </div>

                    )}

                </div>


                {/* =================================================
                    NOTIFICATIONS
                ================================================= */}

                <div className="topbar-dropdown-wrapper">

                    <button
                        type="button"
                        className="notification-btn"
                        aria-label="Notifications"
                        onClick={() => {

                            setNotificationOpen(
                                (prev) => !prev
                            );

                            setProfileOpen(false);

                            setDateOpen(false);

                        }}
                    >

                        <Bell size={19} />


                        {unreadCount > 0 && (

                            <span className="notification-dot">

                                {unreadCount}

                            </span>

                        )}

                    </button>


                    {notificationOpen && (

                        <div className="notification-dropdown">

                            <div className="notification-header">

                                <div>

                                    <strong>
                                        Notifications
                                    </strong>

                                    <span>
                                        {unreadCount} unread
                                    </span>

                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setNotificationOpen(
                                            false
                                        )
                                    }
                                >
                                    <X size={16} />
                                </button>

                            </div>


                            <div className="notification-list">

                                {notifications.map(
                                    (notification) => (

                                        <div
                                            key={
                                                notification.id
                                            }
                                            className={
                                                notification.unread
                                                    ? "notification-item unread"
                                                    : "notification-item"
                                            }
                                        >

                                            <div className="notification-item-icon">

                                                <Bell
                                                    size={15}
                                                />

                                            </div>


                                            <div>

                                                <strong>

                                                    {
                                                        notification.title
                                                    }

                                                </strong>

                                                <p>

                                                    {
                                                        notification.description
                                                    }

                                                </p>

                                                <span>

                                                    {
                                                        notification.time
                                                    }

                                                </span>

                                            </div>

                                        </div>

                                    )
                                )}

                            </div>


                            <button
                                type="button"
                                className="view-all-notifications"
                                onClick={() =>
                                    setNotificationOpen(
                                        false
                                    )
                                }
                            >
                                View all notifications
                            </button>

                        </div>

                    )}

                </div>


                {/* =================================================
                    PROFILE
                ================================================= */}

                <div
                    className="topbar-profile-wrapper"
                    ref={profileRef}
                >

                    <button
                        type="button"
                        className="topbar-profile"
                        onClick={() => {

                            setProfileOpen(
                                (prev) => !prev
                            );

                            setNotificationOpen(false);

                            setDateOpen(false);

                        }}
                    >

                        <div className="topbar-avatar">

                            {initials}

                        </div>


                        <div className="topbar-profile-info">

                            <strong>

                                {profile.fullName}

                            </strong>

                            <span>

                                {profile.email}

                            </span>

                        </div>


                        <ChevronDown
                            size={16}
                            className={
                                profileOpen
                                    ? "profile-chevron rotated"
                                    : "profile-chevron"
                            }
                        />

                    </button>


                    {/* =================================================
                        PROFILE DROPDOWN
                    ================================================= */}

                    {profileOpen && (

                        <div className="profile-dropdown">


                            {/* PROFILE HEADER */}

                            <div className="profile-dropdown-header">

                                <div className="profile-dropdown-avatar">

                                    {initials}

                                </div>


                                <div>

                                    <strong>

                                        {profile.fullName}

                                    </strong>

                                    <span>

                                        {profile.email}

                                    </span>

                                    <small>

                                        ● Super Admin

                                    </small>

                                </div>

                            </div>


                            {/* MENU */}

                            <div className="profile-dropdown-menu">


                                <button
                                    type="button"
                                    onClick={
                                        openSettings
                                    }
                                >

                                    <UserRound
                                        size={17}
                                    />

                                    <span>
                                        My Profile
                                    </span>

                                </button>


                                <button
                                    type="button"
                                    onClick={
                                        openSettings
                                    }
                                >

                                    <Settings
                                        size={17}
                                    />

                                    <span>
                                        Account Settings
                                    </span>

                                </button>


                                <button
                                    type="button"
                                    onClick={
                                        openSettings
                                    }
                                >

                                    <LockKeyhole
                                        size={17}
                                    />

                                    <span>
                                        Change Password
                                    </span>

                                </button>

                            </div>


                            {/* LOGOUT */}

                            <div className="profile-dropdown-footer">

                                <button
                                    type="button"
                                    className="profile-logout"
                                    onClick={
                                        handleLogout
                                    }
                                >

                                    <LogOut
                                        size={17}
                                    />

                                    <span>
                                        Logout
                                    </span>

                                </button>

                            </div>

                        </div>

                    )}

                </div>

            </div>

        </header>

    );

}


export default Topbar;
