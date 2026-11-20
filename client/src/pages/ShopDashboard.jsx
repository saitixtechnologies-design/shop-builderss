import { useEffect, useState } from "react";
import {
    Package,
    Wrench,
    Tags,
    Store,
    LogOut,
    RefreshCw
} from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "react-toastify";

import "../styles/ShopDashboard.css";
import { API_ORIGIN } from "../lib/api.js";

const API_URL =
    `${API_ORIGIN}/api/shop-dashboard`;

function ShopDashboard() {

    const navigate = useNavigate();

    const [dashboard, setDashboard] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    const loadDashboard = async () => {

        try {

            setLoading(true);

            const token =
                localStorage.getItem(
                    "shopAdminToken"
                );

            if (!token) {
                navigate(
                    "/shop-admin/login",
                    { replace: true }
                );
                return;
            }

            const response =
                await fetch(API_URL, {
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                });

            const data =
                await response.json();

            if (
                response.status === 401 ||
                response.status === 403
            ) {

                localStorage.removeItem(
                    "shopAdminToken"
                );

                localStorage.removeItem(
                    "shopAdminUser"
                );

                toast.error(
                    data.message ||
                    "Session expired."
                );

                navigate(
                    "/shop-admin/login",
                    { replace: true }
                );

                return;
            }

            if (!response.ok ||
                !data.success) {

                throw new Error(
                    data.message ||
                    "Failed to load dashboard."
                );
            }

            setDashboard(data.data);

        } catch (error) {

            console.error(
                "Dashboard Error:",
                error
            );

            toast.error(
                error.message ||
                "Failed to load dashboard."
            );

        } finally {

            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboard();
    }, []);

    const handleLogout = () => {

        localStorage.removeItem(
            "shopAdminToken"
        );

        localStorage.removeItem(
            "shopAdminUser"
        );

        toast.success(
            "Logged out successfully."
        );

        navigate(
            "/shop-admin/login",
            { replace: true }
        );
    };

    if (loading) {

        return (
            <div className="shop-dashboard-loading">

                <RefreshCw
                    size={24}
                    className="dashboard-spin"
                />

                Loading dashboard...

            </div>
        );
    }

    const shop =
        dashboard?.shop;

    const stats =
        dashboard?.stats;

    return (

        <div className="shop-dashboard">

            <header className="shop-dashboard-header">

                <div className="shop-dashboard-brand">

                    <div className="shop-dashboard-logo">

                        {shop?.LogoURL ? (
                            <img
                                src={shop.LogoURL}
                                alt={shop.ShopName}
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
                            Shop Admin Dashboard
                        </span>

                    </div>

                </div>

                <div className="shop-dashboard-actions">

                    <button
                        type="button"
                        onClick={loadDashboard}
                        title="Refresh"
                    >
                        <RefreshCw size={18} />
                    </button>

                    <button
                        type="button"
                        onClick={handleLogout}
                        title="Logout"
                    >
                        <LogOut size={18} />
                    </button>

                </div>

            </header>

            <main className="shop-dashboard-content">

                <div className="shop-welcome">

                    <div>

                        <span>
                            SHOP ADMIN
                        </span>

                        <h1>
                            Welcome back,
                            {" "}
                            {shop?.OwnerName || "Admin"} 👋
                        </h1>

                        <p>
                            Manage your shop from
                            one place.
                        </p>

                    </div>

                    <div className="shop-status">

                        <span className="status-dot" />

                        {shop?.Status || "Active"}

                    </div>

                </div>

                <div className="shop-stat-grid">

                    <div className="shop-stat-card">

                        <div className="shop-stat-icon products">
                            <Package size={22} />
                        </div>

                        <span>
                            Total Products
                        </span>

                        <strong>
                            {stats?.totalProducts ?? 0}
                        </strong>

                    </div>

                    <div className="shop-stat-card">

                        <div className="shop-stat-icon services">
                            <Wrench size={22} />
                        </div>

                        <span>
                            Total Services
                        </span>

                        <strong>
                            {stats?.totalServices ?? 0}
                        </strong>

                    </div>

                    <div className="shop-stat-card">

                        <div className="shop-stat-icon categories">
                            <Tags size={22} />
                        </div>

                        <span>
                            Categories
                        </span>

                        <strong>
                            {stats?.totalCategories ?? 0}
                        </strong>

                    </div>

                </div>

                <div className="shop-info-card">

                    <div className="shop-info-heading">

                        <Store size={20} />

                        <div>

                            <h2>
                                {shop?.ShopName}
                            </h2>

                            <span>
                                /{shop?.ShopSlug}
                            </span>

                        </div>

                    </div>

                    <div className="shop-info-grid">

                        <div>
                            <label>Owner</label>
                            <strong>
                                {shop?.OwnerName || "-"}
                            </strong>
                        </div>

                        <div>
                            <label>Email</label>
                            <strong>
                                {shop?.Email || "-"}
                            </strong>
                        </div>

                        <div>
                            <label>Phone</label>
                            <strong>
                                {shop?.Phone || "-"}
                            </strong>
                        </div>

                        <div>
                            <label>Shop ID</label>
                            <strong>
                                #{shop?.ShopID}
                            </strong>
                        </div>

                    </div>

                </div>

            </main>

        </div>
    );
}

export default ShopDashboard;