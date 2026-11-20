import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
    Activity,
    ArrowUpRight,
    BarChart3,
    Bell,
    CheckCircle2,
    CircleDollarSign,
    Clock3,
    Copy,
    Gift,
    Layers3,
    Package,
    Percent,
    RefreshCw,
    Server,
    Settings2,
    ShoppingCart,
    Store,
    Tags,
    TrendingUp,
    Users,
    XCircle
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
    PieChart,
    Pie,
    Cell
} from "recharts";

import { apiUrl, getSuperAdminHeaders } from "../../lib/api";
import "../../styles/Dashboard.css";


const statCards = [
    {
        key: "shops",
        title: "Total Shops",
        activeKey: "shops",
        description: "Registered shops",
        icon: Store,
        type: "blue",
        path: "/admin/shops",
    },
    {
        key: "products",
        title: "Total Products",
        activeKey: "products",
        description: "Products across shops",
        icon: Package,
        type: "orange",
        path: "/admin/products",
    },
    {
        key: "categories",
        title: "Categories",
        activeKey: "categories",
        description: "Product categories",
        icon: Layers3,
        type: "green",
        path: "/admin/categories",
    },
    {
        key: "brands",
        title: "Brands",
        activeKey: "brands",
        description: "Registered brands",
        icon: Tags,
        type: "purple",
        path: "/admin/brands",
    },
    {
        key: "services",
        title: "Services",
        activeKey: "services",
        description: "Shop services",
        icon: Settings2,
        type: "cyan",
        path: "/admin/services",
    },
    {
        key: "banners",
        title: "Banners",
        activeKey: "banners",
        description: "Website banners",
        icon: Bell,
        type: "pink",
        path: "/admin/banners",
    },
    {
        key: "coupons",
        title: "Coupons",
        activeKey: "coupons",
        description: "Discount campaigns",
        icon: Gift,
        type: "yellow",
        path: "/admin/coupons",
    },
    {
        key: "orders",
        title: "Total Orders",
        activeKey: null,
        description: "Orders received",
        icon: ShoppingCart,
        type: "indigo",
        path: "/admin/orders",
    },
    {
        key: "customers",
        title: "Customers",
        activeKey: null,
        description: "Platform customers",
        icon: Users,
        type: "red",
        path: "/admin/customers",
    },
];


const formatNumber = (value) => {
    return Number(value || 0).toLocaleString("en-IN");
};


const formatDate = (value) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
};


const formatDateTime = (value) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
};


const getStatusClass = (status) => {
    const value = String(status || "").toLowerCase();

    if (
        value.includes("deliver") ||
        value.includes("complete") ||
        value.includes("success")
    ) {
        return "success";
    }

    if (
        value.includes("cancel") ||
        value.includes("failed") ||
        value.includes("reject")
    ) {
        return "danger";
    }

    if (
        value.includes("pending") ||
        value.includes("process") ||
        value.includes("ready")
    ) {
        return "warning";
    }

    if (value.includes("confirm")) {
        return "info";
    }

    return "neutral";
};


const getActivityIcon = (type) => {
    switch (String(type || "").toLowerCase()) {
        case "shop":
            return <Store size={16} />;

        case "product":
            return <Package size={16} />;

        case "service":
            return <Settings2 size={16} />;

        case "banner":
            return <Bell size={16} />;

        case "coupon":
            return <Gift size={16} />;

        case "order":
            return <ShoppingCart size={16} />;

        default:
            return <Activity size={16} />;
    }
};


const getActivityClass = (type) => {
    switch (String(type || "").toLowerCase()) {
        case "shop":
            return "activity-blue";

        case "product":
            return "activity-orange";

        case "service":
            return "activity-green";

        case "banner":
            return "activity-pink";

        case "coupon":
            return "activity-purple";

        case "order":
            return "activity-cyan";

        default:
            return "activity-neutral";
    }
};


const getRelativeTime = (value) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    const seconds = Math.floor(
        (Date.now() - date.getTime()) / 1000
    );

    if (seconds < 60) {
        return "Just now";
    }

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) {
        return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        return `${hours}h ago`;
    }

    const days = Math.floor(hours / 24);

    if (days < 30) {
        return `${days}d ago`;
    }

    return formatDate(value);
};


const getConfirmationTime = (createdAt, confirmedAt) => {
    if (!createdAt || !confirmedAt) return null;

    const start = new Date(createdAt).getTime();
    const end = new Date(confirmedAt).getTime();

    if (Number.isNaN(start) || Number.isNaN(end)) {
        return null;
    }

    const difference = Math.max(
        0,
        Math.floor((end - start) / 60000)
    );

    if (difference < 1) {
        return "< 1 min";
    }

    if (difference < 60) {
        return `${difference} min`;
    }

    const hours = Math.floor(difference / 60);
    const minutes = difference % 60;

    return minutes
        ? `${hours}h ${minutes}m`
        : `${hours}h`;
};


function DashboardContent() {
    const navigate = useNavigate();

    const [dashboard, setDashboard] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    const loadDashboard = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await fetch(
                apiUrl("/api/admin/dashboard"),
                {
                    headers: getSuperAdminHeaders()
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message ||
                    "Unable to load dashboard data."
                );
            }

            setDashboard(result.data);
        } catch (loadError) {
            setError(loadError.message);
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        loadDashboard();
    }, []);


    const stats = dashboard?.stats || {};
    const activeStats = dashboard?.activeStats || {};

    const shops = dashboard?.recentShops || [];
    const orders = dashboard?.recentOrders || [];
    const orderStatuses = dashboard?.orderStatuses || [];
    const orderTrend = dashboard?.orderTrend || [];
    const productCategories =
        dashboard?.productCategories || [];
    const activities = dashboard?.recentActivity || [];


    const totalOrders = useMemo(() => {
        return orderStatuses.reduce(
            (total, item) =>
                total + Number(item.Total || 0),
            0
        );
    }, [orderStatuses]);


    const totalRevenue = useMemo(() => {
        return orders.reduce(
            (total, order) =>
                total + Number(order.GrandTotal || 0),
            0
        );
    }, [orders]);


    return (
        <div className="dashboard-page">

            {/* =================================================
                HERO
            ================================================= */}

            <section className="dashboard-hero">

                <div className="hero-main-content">

                    <div className="hero-title-area">

                        <div className="dashboard-eyebrow">
                            <span className="live-dot"></span>
                            SUPER ADMIN CONTROL CENTER
                        </div>

                        <h1>
                            Platform
                            <span> Overview</span>
                        </h1>

                        <p>
                            Monitor shops, products, orders,
                            customers and your entire
                            multi-tenant commerce platform
                            from one place.
                        </p>

                    </div>


                    <button
                        type="button"
                        className="dashboard-refresh-btn"
                        onClick={loadDashboard}
                        disabled={loading}
                    >
                        <RefreshCw
                            size={16}
                            className={
                                loading ? "dashboard-spin" : ""
                            }
                        />

                        {loading
                            ? "Refreshing..."
                            : "Refresh Data"}
                    </button>

                </div>


                <div className="hero-stat-strip">

                    <div className="hero-mini-stat">
                        <span>Active Shops</span>

                        <strong>
                            {formatNumber(
                                activeStats.shops
                            )}
                        </strong>
                    </div>

                    <div className="hero-mini-stat">
                        <span>Active Products</span>

                        <strong>
                            {formatNumber(
                                activeStats.products
                            )}
                        </strong>
                    </div>

                    <div className="hero-mini-stat">
                        <span>Order Volume</span>

                        <strong>
                            {formatNumber(totalOrders)}
                        </strong>
                    </div>

                    <div className="hero-mini-stat">
                        <span>Recent Order Value</span>

                        <strong>
                            ₹{formatNumber(totalRevenue)}
                        </strong>
                    </div>

                </div>

                <div className="hero-decoration hero-decoration-one"></div>
                <div className="hero-decoration hero-decoration-two"></div>

            </section>


            {/* =================================================
                ERROR
            ================================================= */}

            {error && (
                <div className="dashboard-alert">

                    <XCircle size={18} />

                    <div>
                        <strong>
                            Dashboard Error
                        </strong>

                        <span>
                            {error}
                        </span>
                    </div>

                </div>
            )}


            {/* =================================================
                KPI CARDS
            ================================================= */}

            <section className="dashboard-section">

                <div className="dashboard-section-title">

                    <div>
                        <span className="section-overline">
                            PLATFORM METRICS
                        </span>

                        <h2>
                            Everything at a glance
                        </h2>
                    </div>

                    <span className="section-live">
                        <span></span>
                        Live database
                    </span>

                </div>


                <div className="premium-stats-grid">

                    {statCards.map((card) => {

                        const Icon = card.icon;

                        const total =
                            stats[card.key] || 0;

                        const active =
                            card.activeKey
                                ? activeStats[
                                      card.activeKey
                                  ]
                                : null;

                        return (
                            <button
                                type="button"
                                className={`premium-stat-card ${card.type}`}
                                key={card.key}
                                onClick={() =>
                                    navigate(card.path)
                                }
                            >

                                <div className="premium-stat-top">

                                    <div className="premium-stat-icon">
                                        <Icon
                                            size={21}
                                            strokeWidth={2}
                                        />
                                    </div>

                                    <ArrowUpRight
                                        size={17}
                                        className="stat-arrow"
                                    />

                                </div>


                                <div className="premium-stat-content">

                                    <span className="premium-stat-label">
                                        {card.title}
                                    </span>

                                    <strong>
                                        {loading
                                            ? "—"
                                            : formatNumber(total)}
                                    </strong>

                                    <div className="premium-stat-footer">

                                        {active !== null ? (
                                            <>
                                                <span className="active-count">
                                                    {formatNumber(
                                                        active
                                                    )}{" "}
                                                    active
                                                </span>

                                                <span>
                                                    {card.description}
                                                </span>
                                            </>
                                        ) : (
                                            <span>
                                                {card.description}
                                            </span>
                                        )}

                                    </div>

                                </div>

                            </button>
                        );
                    })}

                </div>

            </section>


            {/* =================================================
                ANALYTICS
            ================================================= */}

            <section className="analytics-grid">

                {/* ORDER TREND */}

                <div className="dashboard-panel chart-panel">

                    <div className="panel-header">

                        <div className="panel-title">

                            <div className="panel-icon blue">
                                <TrendingUp size={19} />
                            </div>

                            <div>
                                <h3>
                                    Orders Analytics
                                </h3>

                                <p>
                                    Order volume over the
                                    last 6 months
                                </p>
                            </div>

                        </div>

                        <div className="chart-badge">
                            <Activity size={13} />
                            Live
                        </div>

                    </div>


                    <div className="chart-container">

                        {orderTrend.length ? (

                            <ResponsiveContainer
                                width="100%"
                                height={280}
                            >

                                <AreaChart
                                    data={orderTrend}
                                    margin={{
                                        top: 10,
                                        right: 10,
                                        left: -20,
                                        bottom: 0
                                    }}
                                >

                                    <defs>

                                        <linearGradient
                                            id="ordersGradient"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >

                                            <stop
                                                offset="0%"
                                                stopColor="#4f46e5"
                                                stopOpacity={0.3}
                                            />

                                            <stop
                                                offset="100%"
                                                stopColor="#4f46e5"
                                                stopOpacity={0.02}
                                            />

                                        </linearGradient>

                                    </defs>

                                    <CartesianGrid
                                        stroke="#eef2f7"
                                        strokeDasharray="4 4"
                                        vertical={false}
                                    />

                                    <XAxis
                                        dataKey="Month"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{
                                            fill: "#94a3b8",
                                            fontSize: 10
                                        }}
                                    />

                                    <YAxis
                                        allowDecimals={false}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{
                                            fill: "#94a3b8",
                                            fontSize: 10
                                        }}
                                    />

                                    <Tooltip
                                        contentStyle={{
                                            border: "1px solid #e5e7eb",
                                            borderRadius: "10px",
                                            boxShadow:
                                                "0 10px 30px rgba(15,23,42,.1)"
                                        }}
                                    />

                                    <Area
                                        type="monotone"
                                        dataKey="Orders"
                                        stroke="#4f46e5"
                                        strokeWidth={3}
                                        fill="url(#ordersGradient)"
                                        activeDot={{
                                            r: 5
                                        }}
                                    />

                                </AreaChart>

                            </ResponsiveContainer>

                        ) : (
                            <ChartEmpty
                                icon={<TrendingUp size={25} />}
                                text={
                                    loading
                                        ? "Loading analytics..."
                                        : "No order trend data available."
                                }
                            />
                        )}

                    </div>

                </div>


                {/* ORDER STATUS */}

                <div className="dashboard-panel chart-panel">

                    <div className="panel-header">

                        <div className="panel-title">

                            <div className="panel-icon purple">
                                <BarChart3 size={19} />
                            </div>

                            <div>
                                <h3>
                                    Orders by Status
                                </h3>

                                <p>
                                    Current platform order
                                    distribution
                                </p>
                            </div>

                        </div>

                        <div className="chart-total">
                            <span>Total</span>
                            <strong>
                                {formatNumber(totalOrders)}
                            </strong>
                        </div>

                    </div>


                    <div className="status-chart-layout">

                        <div className="status-pie">

                            {orderStatuses.length ? (

                                <ResponsiveContainer
                                    width="100%"
                                    height={230}
                                >

                                    <PieChart>

                                        <Pie
                                            data={orderStatuses}
                                            dataKey="Total"
                                            nameKey="OrderStatus"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={62}
                                            outerRadius={88}
                                            paddingAngle={4}
                                            stroke="none"
                                        >

                                            {orderStatuses.map(
                                                (entry, index) => (
                                                    <Cell
                                                        key={
                                                            entry.OrderStatus
                                                        }
                                                        fill={[
                                                            "#4f46e5",
                                                            "#f59e0b",
                                                            "#22c55e",
                                                            "#ef4444",
                                                            "#06b6d4",
                                                            "#8b5cf6",
                                                            "#64748b"
                                                        ][
                                                            index %
                                                            7
                                                        ]}
                                                    />
                                                )
                                            )}

                                        </Pie>

                                        <Tooltip />

                                    </PieChart>

                                </ResponsiveContainer>

                            ) : (
                                <ChartEmpty
                                    icon={
                                        <ShoppingCart
                                            size={25}
                                        />
                                    }
                                    text="No order data."
                                />
                            )}

                        </div>


                        <div className="status-list">

                            {orderStatuses.map(
                                (item, index) => {

                                    const percentage =
                                        totalOrders
                                            ? Math.round(
                                                  (Number(
                                                      item.Total
                                                  ) /
                                                      totalOrders) *
                                                      100
                                              )
                                            : 0;

                                    return (
                                        <div
                                            className="status-list-item"
                                            key={
                                                item.OrderStatus
                                            }
                                        >

                                            <div className="status-list-left">

                                                <span
                                                    className="status-color"
                                                    style={{
                                                        background:
                                                            [
                                                                "#4f46e5",
                                                                "#f59e0b",
                                                                "#22c55e",
                                                                "#ef4444",
                                                                "#06b6d4",
                                                                "#8b5cf6",
                                                                "#64748b"
                                                            ][
                                                                index %
                                                                7
                                                            ]
                                                    }}
                                                ></span>

                                                <span>
                                                    {
                                                        item.OrderStatus
                                                    }
                                                </span>

                                            </div>

                                            <strong>
                                                {formatNumber(
                                                    item.Total
                                                )}

                                                <small>
                                                    {percentage}%
                                                </small>
                                            </strong>

                                        </div>
                                    );
                                }
                            )}

                        </div>

                    </div>

                </div>


                {/* PRODUCTS BY CATEGORY */}

                <div className="dashboard-panel chart-panel">

                    <div className="panel-header">

                        <div className="panel-title">

                            <div className="panel-icon orange">
                                <Package size={19} />
                            </div>

                            <div>
                                <h3>
                                    Products by Category
                                </h3>

                                <p>
                                    Top product categories
                                </p>
                            </div>

                        </div>

                    </div>


                    <div className="chart-container">

                        {productCategories.length ? (

                            <ResponsiveContainer
                                width="100%"
                                height={300}
                            >

                                <BarChart
                                    data={
                                        productCategories
                                    }
                                    layout="vertical"
                                    margin={{
                                        top: 5,
                                        right: 15,
                                        left: 10,
                                        bottom: 5
                                    }}
                                >

                                    <CartesianGrid
                                        stroke="#eef2f7"
                                        strokeDasharray="4 4"
                                        horizontal={false}
                                    />

                                    <XAxis
                                        type="number"
                                        allowDecimals={false}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{
                                            fill: "#94a3b8",
                                            fontSize: 10
                                        }}
                                    />

                                    <YAxis
                                        type="category"
                                        dataKey="CategoryName"
                                        width={110}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{
                                            fill: "#64748b",
                                            fontSize: 10
                                        }}
                                    />

                                    <Tooltip />

                                    <Bar
                                        dataKey="ProductCount"
                                        fill="#f97316"
                                        radius={[
                                            0,
                                            7,
                                            7,
                                            0
                                        ]}
                                        barSize={18}
                                    />

                                </BarChart>

                            </ResponsiveContainer>

                        ) : (
                            <ChartEmpty
                                icon={<Package size={25} />}
                                text={
                                    loading
                                        ? "Loading categories..."
                                        : "No category data available."
                                }
                            />
                        )}

                    </div>

                </div>


                {/* PLATFORM HEALTH */}

                <div className="dashboard-panel platform-health-panel">

                    <div className="panel-header">

                        <div className="panel-title">

                            <div className="panel-icon green">
                                <Server size={19} />
                            </div>

                            <div>
                                <h3>
                                    Platform Health
                                </h3>

                                <p>
                                    Current platform status
                                </p>
                            </div>

                        </div>

                        <span className="health-badge">
                            Operational
                        </span>

                    </div>


                    <div className="health-list">

                        <HealthRow
                            label="Database"
                            value="Connected"
                            icon={<Server size={17} />}
                        />

                        <HealthRow
                            label="Authentication"
                            value="Protected"
                            icon={<CheckCircle2 size={17} />}
                        />

                        <HealthRow
                            label="Multi-tenancy"
                            value="Isolated"
                            icon={<Store size={17} />}
                        />

                        <HealthRow
                            label="Admin API"
                            value="Operational"
                            icon={<Activity size={17} />}
                        />

                    </div>


                    <div className="health-footer">

                        <div>
                            <span>Active shops</span>
                            <strong>
                                {formatNumber(
                                    activeStats.shops
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>Active products</span>
                            <strong>
                                {formatNumber(
                                    activeStats.products
                                )}
                            </strong>
                        </div>

                    </div>

                </div>

            </section>


            {/* =================================================
                RECENT ORDERS
            ================================================= */}

            <section className="dashboard-panel full-panel">

                <div className="panel-header">

                    <div className="panel-title">

                        <div className="panel-icon pink">
                            <ShoppingCart size={19} />
                        </div>

                        <div>
                            <h3>
                                Recent Orders
                            </h3>

                            <p>
                                Latest orders across all shops
                            </p>
                        </div>

                    </div>

                    <button
                        type="button"
                        className="panel-action"
                        onClick={() =>
                            navigate("/admin/orders")
                        }
                    >
                        View all
                        <ArrowUpRight size={15} />
                    </button>

                </div>


                <div className="orders-table-wrapper">

                    {orders.length ? (

                        <table className="premium-orders-table">

                            <thead>
                                <tr>
                                    <th>ORDER</th>
                                    <th>CUSTOMER</th>
                                    <th>SHOP</th>
                                    <th>AMOUNT</th>
                                    <th>ORDERED</th>
                                    <th>CONFIRMED</th>
                                    <th>STATUS</th>
                                </tr>
                            </thead>

                            <tbody>

                                {orders.map((order) => {

                                    const confirmationTime =
                                        getConfirmationTime(
                                            order.CreatedAt,
                                            order.ConfirmedAt
                                        );

                                    return (
                                        <tr
                                            key={
                                                order.OrderID
                                            }
                                        >

                                            <td>

                                                <div className="order-number">
                                                    <strong>
                                                        #
                                                        {order.OrderNumber ||
                                                            order.OrderID}
                                                    </strong>

                                                    <small>
                                                        ID{" "}
                                                        {
                                                            order.OrderID
                                                        }
                                                    </small>
                                                </div>

                                            </td>


                                            <td>

                                                <div className="customer-cell">

                                                    <div className="customer-avatar">
                                                        {String(
                                                            order.CustomerName ||
                                                                "G"
                                                        )
                                                            .charAt(
                                                                0
                                                            )
                                                            .toUpperCase()}
                                                    </div>

                                                    <div>
                                                        <strong>
                                                            {
                                                                order.CustomerName
                                                            }
                                                        </strong>

                                                        <small>
                                                            {
                                                                order.CustomerPhone ||
                                                                "No phone"
                                                            }
                                                        </small>
                                                    </div>

                                                </div>

                                            </td>


                                            <td>

                                                <div className="shop-name-cell">

                                                    <Store
                                                        size={14}
                                                    />

                                                    <span>
                                                        {
                                                            order.ShopName
                                                        }
                                                    </span>

                                                </div>

                                            </td>


                                            <td>

                                                <strong className="order-amount">
                                                    ₹
                                                    {formatNumber(
                                                        order.GrandTotal
                                                    )}
                                                </strong>

                                                <small className="payment-status">
                                                    {
                                                        order.PaymentStatus ||
                                                        "Pending"
                                                    }
                                                </small>

                                            </td>


                                            <td>

                                                <div className="order-time-cell">

                                                    <strong>
                                                        {formatDate(
                                                            order.CreatedAt
                                                        )}
                                                    </strong>

                                                    <small>
                                                        {formatDateTime(
                                                            order.CreatedAt
                                                        ).split(
                                                            ", "
                                                        )[1] ||
                                                            ""}
                                                    </small>

                                                </div>

                                            </td>


                                            <td>

                                                {order.ConfirmedAt ? (

                                                    <div className="confirmed-cell">

                                                        <div className="confirmed-main">
                                                            <CheckCircle2
                                                                size={
                                                                    14
                                                                }
                                                            />

                                                            <div>
                                                                <strong>
                                                                    {formatDate(
                                                                        order.ConfirmedAt
                                                                    )}
                                                                </strong>

                                                                <small>
                                                                    {formatDateTime(
                                                                        order.ConfirmedAt
                                                                    ).split(
                                                                        ", "
                                                                    )[1] ||
                                                                        ""}
                                                                </small>
                                                            </div>
                                                        </div>

                                                        {confirmationTime && (
                                                            <span className="confirmation-time">
                                                                {confirmationTime}
                                                            </span>
                                                        )}

                                                    </div>

                                                ) : (

                                                    <div className="not-confirmed">

                                                        <Clock3
                                                            size={
                                                                14
                                                            }
                                                        />

                                                        <span>
                                                            Awaiting
                                                            confirmation
                                                        </span>

                                                    </div>

                                                )}

                                            </td>


                                            <td>

                                                <span
                                                    className={`order-status ${getStatusClass(
                                                        order.OrderStatus
                                                    )}`}
                                                >
                                                    <span></span>

                                                    {
                                                        order.OrderStatus
                                                    }
                                                </span>

                                            </td>

                                        </tr>
                                    );
                                })}

                            </tbody>

                        </table>

                    ) : (

                        <TableEmpty
                            icon={
                                <ShoppingCart
                                    size={30}
                                />
                            }
                            text={
                                loading
                                    ? "Loading orders..."
                                    : "No orders found."
                            }
                        />

                    )}

                </div>

            </section>


            {/* =================================================
                RECENT SHOPS + ACTIVITY
            ================================================= */}

            <section className="bottom-dashboard-grid">

                {/* RECENT SHOPS */}

                <div className="dashboard-panel">

                    <div className="panel-header">

                        <div className="panel-title">

                            <div className="panel-icon blue">
                                <Store size={19} />
                            </div>

                            <div>
                                <h3>
                                    Recent Shops
                                </h3>

                                <p>
                                    Latest registered shops
                                </p>
                            </div>

                        </div>

                        <button
                            type="button"
                            className="panel-action"
                            onClick={() =>
                                navigate("/admin/shops")
                            }
                        >
                            View all
                            <ArrowUpRight size={15} />
                        </button>

                    </div>


                    <div className="recent-shops-list">

                        {shops.length ? (

                            shops.map((shop) => (

                                <div
                                    className="recent-shop-item"
                                    key={shop.ShopID}
                                >

                                    <div className="shop-avatar">
                                        {String(
                                            shop.ShopName ||
                                                "S"
                                        )
                                            .charAt(0)
                                            .toUpperCase()}
                                    </div>

                                    <div className="recent-shop-info">

                                        <strong>
                                            {shop.ShopName}
                                        </strong>

                                        <span>
                                            {shop.OwnerName ||
                                                "No owner"}
                                        </span>

                                    </div>

                                    <div className="recent-shop-meta">

                                        <strong>
                                            {formatNumber(
                                                shop.ProductCount
                                            )}
                                        </strong>

                                        <span>
                                            products
                                        </span>

                                    </div>

                                    <span
                                        className={`shop-status ${
                                            shop.Status ===
                                            "Active"
                                                ? "active"
                                                : "inactive"
                                        }`}
                                    >
                                        <span></span>
                                        {shop.Status}
                                    </span>

                                </div>

                            ))

                        ) : (

                            <TableEmpty
                                icon={<Store size={25} />}
                                text={
                                    loading
                                        ? "Loading shops..."
                                        : "No shops found."
                                }
                            />

                        )}

                    </div>

                </div>


                {/* PLATFORM ACTIVITY */}

                <div className="dashboard-panel">

                    <div className="panel-header">

                        <div className="panel-title">

                            <div className="panel-icon cyan">
                                <Activity size={19} />
                            </div>

                            <div>
                                <h3>
                                    Platform Activity
                                </h3>

                                <p>
                                    Latest activity across
                                    the platform
                                </p>
                            </div>

                        </div>

                    </div>


                    <div className="activity-list">

                        {activities.length ? (

                            activities.slice(0, 8).map(
                                (activity, index) => (

                                    <div
                                        className="activity-item"
                                        key={`${activity.ActivityType}-${activity.ActivityName}-${index}`}
                                    >

                                        <div
                                            className={`activity-icon ${getActivityClass(
                                                activity.ActivityType
                                            )}`}
                                        >
                                            {getActivityIcon(
                                                activity.ActivityType
                                            )}
                                        </div>

                                        <div className="activity-content">

                                            <strong>
                                                {activity.ActivityName}
                                            </strong>

                                            <span>
                                                {
                                                    activity.ActivityType
                                                }{" "}
                                                •{" "}
                                                {
                                                    activity.ShopName
                                                }
                                            </span>

                                        </div>

                                        <time>
                                            {getRelativeTime(
                                                activity.ActivityDate
                                            )}
                                        </time>

                                    </div>

                                )
                            )

                        ) : (

                            <TableEmpty
                                icon={<Activity size={25} />}
                                text={
                                    loading
                                        ? "Loading activity..."
                                        : "No recent activity."
                                }
                            />

                        )}

                    </div>

                </div>

            </section>


            {/* =================================================
                FOOTER SUMMARY
            ================================================= */}

            <section className="dashboard-footer-summary">

                <div>
                    <CircleDollarSign size={18} />
                    <span>
                        Platform order value
                    </span>
                    <strong>
                        ₹{formatNumber(totalRevenue)}
                    </strong>
                </div>

                <div>
                    <Package size={18} />
                    <span>
                        Active products
                    </span>
                    <strong>
                        {formatNumber(
                            activeStats.products
                        )}
                    </strong>
                </div>

                <div>
                    <Store size={18} />
                    <span>
                        Active shops
                    </span>
                    <strong>
                        {formatNumber(
                            activeStats.shops
                        )}
                    </strong>
                </div>

                <div>
                    <Percent size={18} />
                    <span>
                        Active coupons
                    </span>
                    <strong>
                        {formatNumber(
                            activeStats.coupons
                        )}
                    </strong>
                </div>

            </section>

        </div>
    );
}


/* =========================================================
   SMALL COMPONENTS
   ========================================================= */

function ChartEmpty({ icon, text }) {
    return (
        <div className="chart-empty">
            <div>{icon}</div>
            <span>{text}</span>
        </div>
    );
}


function TableEmpty({ icon, text }) {
    return (
        <div className="table-empty">
            <div>{icon}</div>
            <strong>{text}</strong>
        </div>
    );
}


function HealthRow({ label, value, icon }) {
    return (
        <div className="health-row">

            <div className="health-row-left">

                <div className="health-row-icon">
                    {icon}
                </div>

                <span>
                    {label}
                </span>

            </div>

            <div className="health-row-right">

                <span className="health-status-dot"></span>

                <strong>
                    {value}
                </strong>

            </div>

        </div>
    );
}


export default DashboardContent;