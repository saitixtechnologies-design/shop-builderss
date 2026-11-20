import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import {
    Package,
    Wrench,
    FolderTree,
    Award,
    Users,
    ShoppingCart,
    Clock3,
    CheckCircle2,
    Truck,
    XCircle,
    RefreshCw,
    ArrowRight,
    Store,
    TrendingUp,

    CircleDollarSign,
    AlertTriangle,
    BarChart3,
    Eye,
    Plus,
    ChevronRight,
} from "lucide-react";

import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    BarChart,
    Bar,
    Cell,
} from "recharts";

import { toast } from "react-toastify";
import { getShopAdminLanguage, getShopAdminTenantId, readShopAdminUser } from "../../lib/shopAdminLanguage.js";

import "../../styles/shop-admin/shop-admin-dashboard.css";
import { API_ORIGIN } from "../../lib/api.js";


/* =========================================================
   API
========================================================= */

const API_URL =
    `${API_ORIGIN}/api/shop-dashboard`;


/* =========================================================
   HELPERS
========================================================= */

const formatNumber = (value) =>
    Number(value || 0).toLocaleString("en-IN");


const formatCurrency = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN")}`;




const formatDateTime = (date) => {
    if (!date) return "-";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
        return "-";
    }

    return parsedDate.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
};


const getInitials = (name = "") => {
    const words = name
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (!words.length) return "SA";

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


/* =========================================================
   STATUS CLASS
========================================================= */

const getStatusClass = (status = "") =>
    status
        .toLowerCase()
        .replace(/\s+/g, "-");


/* =========================================================
   TOOLTIP
========================================================= */

const SalesTooltip = ({ active, payload, label }) => {

    if (!active || !payload?.length) {
        return null;
    }

    return (
        <div className="dashboard-chart-tooltip">

            <span>{label}</span>

            <strong>
                {formatCurrency(
                    payload[0]?.value
                )}
            </strong>

        </div>
    );
};


/* =========================================================
   COMPONENT
========================================================= */

function ShopAdminDashboardContent() {

    const navigate = useNavigate();
    const [language, setLanguage] = useState(() => getShopAdminLanguage(readShopAdminUser()));
    const tenantId = getShopAdminTenantId(readShopAdminUser());

    useEffect(() => {
        const syncLanguage = (event) => {
            if (!event.detail || String(event.detail.tenantId) === String(tenantId)) {
                setLanguage(getShopAdminLanguage(readShopAdminUser()));
            }
        };
        window.addEventListener("shop-admin-language-change", syncLanguage);
        return () => window.removeEventListener("shop-admin-language-change", syncLanguage);
    }, [tenantId]);

    const t = (english, hindi, hinglish = english) => language === "hi" ? hindi : language === "hinglish" ? hinglish : english;
    const statusLabel = (status) => {
        const hindiStatuses = {
            pending: "लंबित",
            confirmed: "पुष्ट",
            processing: "प्रक्रिया में",
            shipped: "भेज दिया गया",
            delivered: "डिलीवर हुआ",
            cancelled: "रद्द",
            active: "सक्रिय",
        };
        return language === "hi" ? (hindiStatuses[String(status || "").toLowerCase()] || status) : status;
    };

    const [dashboard, setDashboard] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    const [refreshing, setRefreshing] =
        useState(false);

    const [error, setError] =
        useState("");


    /* =====================================================
       STORED USER
    ===================================================== */

    const getStoredUser = () => {

        try {

            const stored =
                localStorage.getItem(
                    "shopAdminUser"
                );

            if (!stored) {
                return null;
            }

            return JSON.parse(stored);

        } catch (error) {

            console.error(
                "Stored user error:",
                error
            );

            return null;
        }
    };


    /* =====================================================
       FETCH DASHBOARD
    ===================================================== */

    const fetchDashboard = async (
        showRefresh = false
    ) => {

        try {

            if (showRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            setError("");


            const token =
                localStorage.getItem(
                    "shopAdminToken"
                );


            if (!token) {

                setError(
                    "Shop Admin session not found. Please login again."
                );

                return;
            }


            const response =
                await fetch(API_URL, {

                    method: "GET",

                    headers: {
                        "Content-Type":
                            "application/json",

                        Authorization:
                            `Bearer ${token}`,
                    },
                });


            let result = null;

            try {

                result =
                    await response.json();

            } catch {

                throw new Error(
                    "Invalid server response."
                );
            }


            if (response.status === 401) {

                localStorage.removeItem(
                    "shopAdminToken"
                );

                localStorage.removeItem(
                    "shopAdminUser"
                );

                toast.error(
                    "Your session has expired."
                );

                navigate(
                    "/shop/login",
                    { replace: true }
                );

                return;
            }


            if (
                response.status === 403
            ) {

                throw new Error(
                    result.message ||
                    "You don't have access to this dashboard."
                );
            }


            if (
                !response.ok ||
                !result.success
            ) {

                throw new Error(
                    result.message ||
                    "Failed to load dashboard."
                );
            }


            setDashboard(
                result.data || null
            );

        } catch (error) {

            console.error(
                "Shop Dashboard Error:",
                error
            );

            setError(
                error.message ||
                "Unable to load dashboard."
            );

        } finally {

            setLoading(false);
            setRefreshing(false);
        }
    };


    /* =====================================================
       INITIAL LOAD
    ===================================================== */

    useEffect(() => {

        fetchDashboard();

    }, []);


    /* =====================================================
       DATA
    ===================================================== */

    const storedUser =
        getStoredUser();


    const shop =
        dashboard?.shop ||
        storedUser?.shop ||
        {};

    const ownerName = shop?.OwnerName || storedUser?.fullName || "Shop Owner";
    const hour = new Date().getHours();
    const greeting = language === "hi"
        ? `नमस्कार ${ownerName} जी`
        : language === "hinglish"
            ? `Namaskar ${ownerName} ji`
            : `${hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"}, ${ownerName}`;


    const stats =
        dashboard?.stats || {};


    const recentOrders =
        Array.isArray(
            dashboard?.recentOrders
        )
            ? dashboard.recentOrders
            : [];


    const salesTrend =
        Array.isArray(
            dashboard?.salesTrend
        )
            ? dashboard.salesTrend
            : [];


    const orderStatuses =
        Array.isArray(
            dashboard?.orderStatuses
        )
            ? dashboard.orderStatuses
            : [];


    const topProducts =
        Array.isArray(
            dashboard?.topProducts
        )
            ? dashboard.topProducts
            : [];


    const lowStock =
        Array.isArray(
            dashboard?.lowStock
        )
            ? dashboard.lowStock
            : [];


    /* =====================================================
       STAT CARDS
    ===================================================== */

    const statCards = [

        {
            title: t("Products", "उत्पाद"),
            value:
                stats.totalProducts || 0,
            icon: Package,
            className: "blue",
            link: "/shop-admin/products",
            description: t("Products in catalogue", "कैटलॉग में उत्पाद"),
        },

        {
            title: t("Services", "सेवाएँ"),
            value:
                stats.totalServices || 0,
            icon: Wrench,
            className: "purple",
            link: "/shop-admin/services",
            description: t("Active services", "सक्रिय सेवाएँ"),
        },

        {
            title: t("Categories", "श्रेणियाँ"),
            value:
                stats.totalCategories || 0,
            icon: FolderTree,
            className: "orange",
            link: "/shop-admin/categories",
            description: t("Product categories", "उत्पाद श्रेणियाँ"),
        },

        {
            title: t("Brands", "ब्रांड"),
            value:
                stats.totalBrands || 0,
            icon: Award,
            className: "green",
            link: "/shop-admin/brands",
            description: t("Available brands", "उपलब्ध ब्रांड"),
        },

        {
            title: t("Customers", "ग्राहक"),
            value:
                stats.totalCustomers || 0,
            icon: Users,
            className: "cyan",
            link: "/shop-admin/customers",
            description: t("Registered customers", "पंजीकृत ग्राहक"),
        },

        {
            title: t("Orders", "ऑर्डर"),
            value:
                stats.totalOrders || 0,
            icon: ShoppingCart,
            className: "pink",
            link: "/shop-admin/orders",
            description: t("All shop orders", "दुकान के सभी ऑर्डर"),
        },

    ];


    /* =====================================================
       ORDER CARDS
    ===================================================== */

    const orderCards = [

        {
            title: t("Today's Orders", "आज के ऑर्डर"),
            value:
                stats.todayOrders || 0,
            icon: Clock3,
            className: "today",
        },

        {
            title: t("Pending", "लंबित"),
            value:
                stats.pendingOrders || 0,
            icon: Clock3,
            className: "pending",
        },

        {
            title: t("Confirmed", "पुष्ट"),
            value:
                stats.confirmedOrders || 0,
            icon: CheckCircle2,
            className: "confirmed",
        },

        {
            title: t("Delivered", "डिलीवर हुए"),
            value:
                stats.deliveredOrders || 0,
            icon: Truck,
            className: "delivered",
        },

        {
            title: t("Cancelled", "रद्द"),
            value:
                stats.cancelledOrders || 0,
            icon: XCircle,
            className: "cancelled",
        },

    ];


    /* =====================================================
       LOADING
    ===================================================== */

    if (loading) {

        return (
            <div className="shop-dashboard-page">

                <div className="shop-dashboard-loading">

                    <div className="dashboard-spinner">
                        <RefreshCw size={26} />
                    </div>

                    <h3>
                        {t("Loading your dashboard", "आपका डैशबोर्ड लोड हो रहा है")}
                    </h3>

                    <p>
                        {t("Fetching your shop data...", "आपकी दुकान का डेटा लाया जा रहा है...")}
                    </p>

                </div>

            </div>
        );
    }


    /* =====================================================
       ERROR
    ===================================================== */

    if (error) {

        return (
            <div className="shop-dashboard-page">

                <div className="shop-dashboard-error-card">

                    <div className="dashboard-error-icon">
                        <AlertTriangle size={30} />
                    </div>

                    <h2>
                        {t("Unable to load dashboard", "डैशबोर्ड लोड नहीं हो सका")}
                    </h2>

                    <p>
                        {error}
                    </p>

                    <div className="dashboard-error-actions">

                        <button
                            type="button"
                            onClick={() =>
                                fetchDashboard()
                            }
                        >
                            <RefreshCw size={17} />
                            {t("Try Again", "फिर से प्रयास करें")}
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                navigate(
                                    "/shop/login",
                                    {
                                        replace: true,
                                    }
                                )
                            }
                        >
                            {t("Login Again", "फिर से लॉग इन करें")}
                        </button>

                    </div>

                </div>

            </div>
        );
    }


    /* =====================================================
       RENDER
    ===================================================== */

    return (

        <div className="shop-dashboard-page">


            {/* =================================================
                HERO HEADER
            ================================================= */}

            <section className="shop-dashboard-hero">

                <div className="hero-glow hero-glow-one" />
                <div className="hero-glow hero-glow-two" />

                <div className="shop-dashboard-hero-content">

                    <div className="shop-dashboard-heading">

                        <div className="shop-dashboard-heading-icon">

                            {shop?.LogoURL ? (

                                <img
                                    src={shop.LogoURL}
                                    alt={
                                        shop.ShopName ||
                                        "Shop"
                                    }
                                />

                            ) : (

                                <Store size={28} />

                            )}

                        </div>


                        <div>

                            <span className="dashboard-eyebrow">
                                {t("SHOP ADMIN", "शॉप एडमिन")}
                            </span>

                            <h1>
                                {greeting}
                                <span> 👋</span>
                            </h1>

                            <p>
                                {t("Here's your complete business overview for today.", "आज के आपके पूरे व्यवसाय का सारांश यहाँ है।")}
                            </p>

                        </div>

                    </div>


                    <button
                        type="button"
                        className="dashboard-refresh-btn"
                        onClick={() =>
                            fetchDashboard(true)
                        }
                        disabled={refreshing}
                    >

                        <RefreshCw
                            size={17}
                            className={
                                refreshing
                                    ? "refresh-spinning"
                                    : ""
                            }
                        />

                        {refreshing
                            ? t("Refreshing...", "रीफ़्रेश हो रहा है...")
                            : t("Refresh Data", "डेटा रीफ़्रेश करें")}

                    </button>

                </div>


                {/* SHOP INFO */}

                <div className="hero-shop-info">

                    <div className="hero-shop-details">

                        <div className="hero-shop-logo">

                            {shop?.LogoURL ? (

                                <img
                                    src={shop.LogoURL}
                                    alt={
                                        shop.ShopName ||
                                        "Shop"
                                    }
                                />

                            ) : (

                                <Store size={22} />

                            )}

                        </div>


                        <div>

                            <strong>
                                {shop?.ShopName ||
                                    "My Shop"}
                            </strong>

                            <span>
                                {shop?.ShopSlug
                                    ? `/${shop.ShopSlug}`
                                    : t("Shop Admin Panel", "शॉप एडमिन पैनल")}
                            </span>

                        </div>

                    </div>


                    <div className="hero-shop-status">

                        <span className="live-dot" />

                        <span>
                            {shop?.Status ||
                                t("Active", "सक्रिय")}
                        </span>

                        <b>
                            {t("Shop", "दुकान")} #
                            {shop?.ShopID || "-"}
                        </b>

                    </div>

                </div>

            </section>


            {/* =================================================
                MAIN METRICS
            ================================================= */}

            <section className="dashboard-section">

                <div className="dashboard-section-header">

                    <div>

                        <span className="section-kicker">
                            {t("OVERVIEW", "अवलोकन")}
                        </span>

                        <h2>
                            {t("Everything at a glance", "सभी जानकारी एक नज़र में")}
                        </h2>

                        <p>
                            {t("Monitor your complete shop performance.", "अपनी दुकान का पूरा प्रदर्शन देखें।")}
                        </p>

                    </div>

                </div>


                <div className="shop-dashboard-stats-grid">

                    {statCards.map((card) => {

                        const Icon = card.icon;

                        return (

                            <div
                                className={`shop-stat-card ${card.className}`}
                                key={card.title}
                            >

                                <div className="shop-stat-top">

                                    <div className="shop-stat-icon">
                                        <Icon size={21} />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            navigate(
                                                card.link
                                            )
                                        }
                                        aria-label={
                                            `View ${card.title}`
                                        }
                                    >
                                        <ArrowRight
                                            size={16}
                                        />
                                    </button>

                                </div>


                                <div className="shop-stat-content">

                                    <span>
                                        {card.title}
                                    </span>

                                    <strong>
                                        {formatNumber(
                                            card.value
                                        )}
                                    </strong>

                                    <small>
                                        {card.description}
                                    </small>

                                </div>

                            </div>

                        );
                    })}

                </div>

            </section>


            {/* =================================================
                REVENUE CARDS
            ================================================= */}

            <section className="revenue-grid">

                <div className="revenue-main-card">

                    <div className="revenue-card-top">

                        <div>

                            <span>
                                {t("TOTAL REVENUE", "कुल बिक्री")}
                            </span>

                            <h2>
                                {formatCurrency(
                                    stats.totalSales ||
                                    stats.totalRevenue ||
                                    0
                                )}
                            </h2>

                        </div>

                        <div className="revenue-icon">
                            <CircleDollarSign
                                size={25}
                            />
                        </div>

                    </div>


                    <div className="revenue-bottom">

                        <div>

                            <span>
                                {t("Today's Sales", "आज की बिक्री")}
                            </span>

                            <strong>
                                {formatCurrency(
                                    stats.todaySales || 0
                                )}
                            </strong>

                        </div>


                        <div className="revenue-growth">

                            <TrendingUp size={15} />

                            <span>
                                {t("Live data", "लाइव डेटा")}
                            </span>

                        </div>

                    </div>

                </div>


                <div className="mini-revenue-card">

                    <div className="mini-card-icon">
                        <ShoppingCart size={20} />
                    </div>

                    <div>

                        <span>
                            {t("Average Order Value", "औसत ऑर्डर मूल्य")}
                        </span>

                        <strong>
                            {formatCurrency(
                                stats.averageOrderValue || 0
                            )}
                        </strong>

                    </div>

                </div>


                <div className="mini-revenue-card">

                    <div className="mini-card-icon purple">
                        <Users size={20} />
                    </div>

                    <div>

                        <span>
                            {t("New Customers", "नए ग्राहक")}
                        </span>

                        <strong>
                            {formatNumber(
                                stats.newCustomers ||
                                0
                            )}
                        </strong>

                    </div>

                </div>

            </section>


            {/* =================================================
                ORDER OVERVIEW
            ================================================= */}

            <section className="dashboard-section">

                <div className="dashboard-section-header">

                    <div>

                        <span className="section-kicker">
                            {t("ORDERS", "ऑर्डर")}
                        </span>

                        <h2>
                            {t("Order overview", "ऑर्डर का सारांश")}
                        </h2>

                        <p>
                            {t("Track today's order activity.", "आज के ऑर्डर की गतिविधि देखें।")}
                        </p>

                    </div>


                    <button
                        type="button"
                        className="view-all-dashboard-btn"
                        onClick={() =>
                            navigate(
                                "/shop-admin/orders"
                            )
                        }
                    >
                        {t("View All Orders", "सभी ऑर्डर देखें")}
                        <ArrowRight size={16} />
                    </button>

                </div>


                <div className="shop-order-stats-grid">

                    {orderCards.map((card) => {

                        const Icon = card.icon;

                        return (

                            <div
                                className={`shop-order-status-card ${card.className}`}
                                key={card.title}
                            >

                                <div className="order-status-icon">
                                    <Icon size={20} />
                                </div>

                                <div>

                                    <span>
                                        {card.title}
                                    </span>

                                    <strong>
                                        {formatNumber(
                                            card.value
                                        )}
                                    </strong>

                                </div>

                            </div>

                        );
                    })}

                </div>

            </section>


            {/* =================================================
                CHARTS
            ================================================= */}

            <section className="dashboard-chart-grid">


                {/* SALES CHART */}

                <div className="dashboard-panel chart-panel">

                    <div className="dashboard-panel-header">

                        <div>

                            <span className="panel-kicker">
                                {t("PERFORMANCE", "प्रदर्शन")}
                            </span>

                            <h2>
                                {t("Sales overview", "बिक्री का सारांश")}
                            </h2>

                            <p>
                                {t("Revenue performance over time.", "समय के साथ बिक्री का प्रदर्शन।")}
                            </p>

                        </div>

                        <div className="panel-icon sales">
                            <BarChart3 size={20} />
                        </div>

                    </div>


                    <div className="dashboard-chart">

                        {salesTrend.length ? (

                            <ResponsiveContainer
                                width="100%"
                                height="100%"
                            >

                                <AreaChart
                                    data={salesTrend}
                                    margin={{
                                        top: 10,
                                        right: 10,
                                        left: -20,
                                        bottom: 0,
                                    }}
                                >

                                    <defs>

                                        <linearGradient
                                            id="salesGradient"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >

                                            <stop
                                                offset="0%"
                                                stopOpacity={0.35}
                                            />

                                            <stop
                                                offset="100%"
                                                stopOpacity={0.02}
                                            />

                                        </linearGradient>

                                    </defs>

                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        vertical={false}
                                    />

                                    <XAxis
                                        dataKey="label"
                                        axisLine={false}
                                        tickLine={false}
                                    />

                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(value) =>
                                            `₹${value}`
                                        }
                                    />

                                    <Tooltip
                                        content={
                                            <SalesTooltip />
                                        }
                                    />

                                    <Area
                                        type="monotone"
                                        dataKey="sales"
                                        strokeWidth={3}
                                        fill="url(#salesGradient)"
                                    />

                                </AreaChart>

                            </ResponsiveContainer>

                        ) : (

                            <div className="chart-empty">

                                <BarChart3 size={30} />

                                <strong>
                                    {t("No sales data yet", "अभी बिक्री का डेटा नहीं है")}
                                </strong>

                                <span>
                                    {t("Sales analytics will appear here.", "बिक्री का विश्लेषण यहाँ दिखेगा।")}
                                </span>

                            </div>

                        )}

                    </div>

                </div>


                {/* ORDER CHART */}

                <div className="dashboard-panel chart-panel">

                    <div className="dashboard-panel-header">

                        <div>

                            <span className="panel-kicker">
                                {t("ORDER STATUS", "ऑर्डर स्थिति")}
                            </span>

                            <h2>
                                {t("Orders by status", "स्थिति के अनुसार ऑर्डर")}
                            </h2>

                            <p>
                                {t("Current order distribution.", "मौजूदा ऑर्डर का विवरण।")}
                            </p>

                        </div>

                        <div className="panel-icon orders">
                            <ShoppingCart size={20} />
                        </div>

                    </div>


                    <div className="dashboard-chart">

                        {orderStatuses.length ? (

                            <ResponsiveContainer
                                width="100%"
                                height="100%"
                            >

                                <BarChart
                                    data={orderStatuses}
                                    margin={{
                                        top: 10,
                                        right: 10,
                                        left: -20,
                                        bottom: 0,
                                    }}
                                >

                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        vertical={false}
                                    />

                                    <XAxis
                                        dataKey="status"
                                        axisLine={false}
                                        tickLine={false}
                                    />

                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                    />

                                    <Tooltip />

                                    <Bar
                                        dataKey="total"
                                        radius={[
                                            8,
                                            8,
                                            0,
                                            0,
                                        ]}
                                    >

                                        {orderStatuses.map(
                                            (_, index) => (
                                                <Cell
                                                    key={index}
                                                />
                                            )
                                        )}

                                    </Bar>

                                </BarChart>

                            </ResponsiveContainer>

                        ) : (

                            <div className="chart-empty">

                                <ShoppingCart size={30} />

                                <strong>
                                    {t("No order analytics", "ऑर्डर का विश्लेषण उपलब्ध नहीं है")}
                                </strong>

                                <span>
                                    {t("Order status data will appear here.", "ऑर्डर की स्थिति यहाँ दिखेगी।")}
                                </span>

                            </div>

                        )}

                    </div>

                </div>

            </section>


            {/* =================================================
                TOP PRODUCTS + LOW STOCK
            ================================================= */}

            <section className="dashboard-two-column">


                {/* TOP PRODUCTS */}

                <div className="dashboard-panel">

                    <div className="dashboard-panel-header">

                        <div>

                            <span className="panel-kicker">
                                {t("PRODUCTS", "उत्पाद")}
                            </span>

                            <h2>
                                {t("Top products", "प्रमुख उत्पाद")}
                            </h2>

                            <p>
                                {t("Best performing products.", "सबसे अच्छा प्रदर्शन करने वाले उत्पाद।")}
                            </p>

                        </div>

                        <button
                            type="button"
                            className="panel-view-btn"
                            onClick={() =>
                                navigate("/shop-admin/products")
                            }
                        >
                            {t("View all", "सभी देखें")}
                            <ChevronRight size={15} />
                        </button>

                    </div>


                    {topProducts.length ? (

                        <div className="top-products-list">

                            {topProducts
                                .slice(0, 5)
                                .map((product, index) => (

                                    <div
                                        className="top-product-row"
                                        key={
                                            product.ProductID ||
                                            index
                                        }
                                    >

                                        <div className="product-rank">
                                            {index + 1}
                                        </div>


                                        <div className="top-product-info">

                                            <strong>
                                                {
                                                    product.ProductName ||
                                                    "Product"
                                                }
                                            </strong>

                                            <span>
                                                {
                                                    product.CategoryName ||
                                                    "Product"
                                                }
                                            </span>

                                        </div>


                                        <div className="top-product-sales">

                                            <strong>
                                                {formatNumber(
                                                    product.SoldCount ||
                                                    product.TotalSold ||
                                                    0
                                                )}
                                            </strong>

                                            <span>
                                                sold
                                            </span>

                                        </div>

                                    </div>

                                ))}

                        </div>

                    ) : (

                        <div className="dashboard-empty-small">
                            <Package size={25} />
                            <span>
                                {t("No product sales yet.", "अभी उत्पाद की बिक्री नहीं हुई है।")}
                            </span>
                        </div>

                    )}

                </div>


                {/* LOW STOCK */}

                <div className="dashboard-panel">

                    <div className="dashboard-panel-header">

                        <div>

                            <span className="panel-kicker warning">
                                {t("INVENTORY", "इन्वेंटरी")}
                            </span>

                            <h2>
                                {t("Low stock alerts", "कम स्टॉक की चेतावनी")}
                            </h2>

                            <p>
                                {t("Products that need attention.", "ध्यान देने योग्य उत्पाद।")}
                            </p>

                        </div>

                        <div className="panel-icon warning">
                            <AlertTriangle size={20} />
                        </div>

                    </div>


                    {lowStock.length ? (

                        <div className="low-stock-list">

                            {lowStock
                                .slice(0, 5)
                                .map((product, index) => (

                                    <div
                                        className="low-stock-row"
                                        key={
                                            product.ProductID ||
                                            index
                                        }
                                    >

                                        <div className="low-stock-product">

                                            <div className="low-stock-icon">
                                                <Package size={17} />
                                            </div>

                                            <div>

                                                <strong>
                                                    {
                                                        product.ProductName ||
                                                        "Product"
                                                    }
                                                </strong>

                                                <span>
                                                    SKU:{" "}
                                                    {
                                                        product.SKU ||
                                                        "-"
                                                    }
                                                </span>

                                            </div>

                                        </div>


                                        <span className="stock-count">
                                            {formatNumber(
                                                product.StockQuantity ||
                                                product.Stock ||
                                                0
                                            )}{" "}
                                            left
                                        </span>

                                    </div>

                                ))}

                        </div>

                    ) : (

                        <div className="stock-good-state">

                            <CheckCircle2 size={25} />

                            <strong>
                                {t("Inventory looks good", "इन्वेंटरी ठीक है")}
                            </strong>

                            <span>
                                {t("No low-stock products.", "कम स्टॉक वाले उत्पाद नहीं हैं।")}
                            </span>

                        </div>

                    )}

                </div>

            </section>


            {/* =================================================
                RECENT ORDERS
            ================================================= */}

            <section className="dashboard-panel recent-orders-panel">

                <div className="dashboard-panel-header">

                    <div>

                        <span className="panel-kicker">
                            ORDERS
                        </span>

                        <h2>
                            {t("Recent orders", "हाल के ऑर्डर")}
                        </h2>

                        <p>
                            {t("Latest orders received by your shop.", "आपकी दुकान को मिले नए ऑर्डर।")}
                        </p>

                    </div>


                    <button
                        type="button"
                        className="view-all-dashboard-btn"
                        onClick={() =>
                            navigate(
                                "/shop-admin/orders"
                            )
                        }
                    >
                        {t("View all", "सभी देखें")}
                        <ArrowRight size={16} />
                    </button>

                </div>


                {recentOrders.length === 0 ? (

                    <div className="recent-orders-empty">

                        <div className="empty-icon">
                            <ShoppingCart size={26} />
                        </div>

                        <h3>
                            {t("No orders yet", "अभी कोई ऑर्डर नहीं है")}
                        </h3>

                        <p>
                            {t("New customer orders will appear here.", "ग्राहकों के नए ऑर्डर यहाँ दिखेंगे।")}
                        </p>

                    </div>

                ) : (

                    <div className="recent-orders-table-wrapper">

                        <table className="recent-orders-table">

                            <thead>

                                <tr>
                                    <th>{t("Order", "ऑर्डर")}</th>
                                    <th>{t("Customer", "ग्राहक")}</th>
                                    <th>{t("Amount", "राशि")}</th>
                                    <th>{t("Status", "स्थिति")}</th>
                                    <th>{t("Date", "तारीख")}</th>
                                    <th></th>
                                </tr>

                            </thead>


                            <tbody>

                                {recentOrders
                                    .slice(0, 8)
                                    .map((order) => {

                                        const orderID =
                                            order.OrderID;

                                        const orderNumber =
                                            order.OrderNumber ||
                                            `#${orderID}`;

                                        const customerName =
                                            order.CustomerName ||
                                            order.FullName ||
                                            "Customer";

                                        const amount =
                                            order.TotalAmount ||
                                            order.GrandTotal ||
                                            order.Total ||
                                            0;

                                        const status =
                                            order.Status ||
                                            order.OrderStatus ||
                                            "Pending";


                                        return (

                                            <tr
                                                key={
                                                    orderID ||
                                                    orderNumber
                                                }
                                            >

                                                <td>
                                                    <strong className="order-number">
                                                        {orderNumber}
                                                    </strong>
                                                </td>


                                                <td>

                                                    <div className="dashboard-customer">

                                                        <div className="customer-avatar">
                                                            {getInitials(
                                                                customerName
                                                            )}
                                                        </div>

                                                        <span>
                                                            {
                                                                customerName
                                                            }
                                                        </span>

                                                    </div>

                                                </td>


                                                <td>
                                                    <strong className="order-amount">
                                                        {formatCurrency(
                                                            amount
                                                        )}
                                                    </strong>
                                                </td>


                                                <td>

                                                    <span
                                                        className={
                                                            `order-status ${getStatusClass(
                                                                status
                                                            )}`
                                                        }
                                                    >
                                                        {statusLabel(status)}
                                                    </span>

                                                </td>


                                                <td>
                                                    {formatDateTime(
                                                        order.CreatedAt
                                                    )}
                                                </td>


                                                <td>

                                                    <button
                                                        type="button"
                                                        className="order-view-btn"
                                                        onClick={() => navigate("/shop-admin/orders")}
                                                        title={t("View order", "ऑर्डर देखें")}
                                                    >
                                                        <Eye
                                                            size={16}
                                                        />
                                                    </button>

                                                </td>

                                            </tr>

                                        );
                                    })}

                            </tbody>

                        </table>

                    </div>

                )}

            </section>


            {/* =================================================
                QUICK ACTIONS
            ================================================= */}

            <section className="quick-actions-section">

                <div className="dashboard-section-header">

                    <div>

                        <span className="section-kicker">
                            {t("SHORTCUTS", "शॉर्टकट")}
                        </span>

                        <h2>
                            {t("Quick actions", "त्वरित कार्य")}
                        </h2>

                    </div>

                </div>


                <div className="quick-actions-grid">

                    <button
                        type="button"
                        onClick={() =>
                            navigate("/shop-admin/products")
                        }
                    >
                        <Package size={19} />
                        <span>
                            {t("Manage Products", "उत्पाद प्रबंधित करें")}
                        </span>
                        <ArrowRight size={15} />
                    </button>


                    <button
                        type="button"
                        onClick={() =>
                           navigate("/shop-admin/services")
                        }
                    >
                        <Wrench size={19} />
                        <span>
                            {t("Manage Services", "सेवाएँ प्रबंधित करें")}
                        </span>
                        <ArrowRight size={15} />
                    </button>


                    <button
                        type="button"
                        onClick={() =>
                           navigate("/shop-admin/orders")
                        }
                    >
                        <ShoppingCart size={19} />
                        <span>
                            {t("Manage Orders", "ऑर्डर प्रबंधित करें")}
                        </span>
                        <ArrowRight size={15} />
                    </button>


                    <button
                        type="button"
                        onClick={() =>
                            navigate("/shop-admin/products")
                        }
                    >
                        <Plus size={19} />
                        <span>
                            {t("Add Product", "उत्पाद जोड़ें")}
                        </span>
                        <ArrowRight size={15} />
                    </button>


                    <button
                        type="button"
                        onClick={() =>
                           navigate("/shop-admin/settings")
                        }
                    >
                        <Store size={19} />
                        <span>
                            {t("Shop Settings", "दुकान की सेटिंग्स")}
                        </span>
                        <ArrowRight size={15} />
                    </button>

                </div>

            </section>


            {/* =================================================
                FOOTER
            ================================================= */}

            <div className="dashboard-footer-info">

                <div>
                    <Store size={16} />

                    <span>
                        {shop?.ShopName ||
                            "My Shop"}
                    </span>
                </div>

                <span>
                    {t("Shop ID", "दुकान आईडी")}: #
                    {shop?.ShopID || "-"}
                </span>

            </div>

        </div>
    );
}


export default ShopAdminDashboardContent;
