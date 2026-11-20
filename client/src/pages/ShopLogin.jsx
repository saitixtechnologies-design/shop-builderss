import { useState } from "react";
import { useNavigate } from "react-router";

import {
    Eye,
    EyeOff,
    LockKeyhole,
    Mail,
    Store,
    ArrowRight
} from "lucide-react";

import { toast } from "react-toastify";
import { postJson } from "../lib/api";
import "../styles/ShopLogin.css";

function ShopLogin() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    // =====================================================
    // LOGIN
    // =====================================================

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email.trim()) {
            toast.error("Please enter your email.");
            return;
        }

        if (!password) {
            toast.error("Please enter your password.");
            return;
        }

        try {
            setLoading(true);

            const { response, data } = await postJson(
                "/api/shop-auth/login",
                { email: email.trim(), password }
            );

            console.log("SHOP LOGIN RESPONSE:", data);

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || "Login failed."
                );
            }

            // =====================================================
            // GET TOKEN + USER
            // =====================================================

            const token = data?.data?.token;
            const user = data?.data?.user;

            if (!token) {
                throw new Error(
                    "Login successful but authentication token was not received."
                );
            }

            if (!user) {
                throw new Error(
                    "Login successful but user information was not received."
                );
            }

            // =====================================================
            // CLEAR ALL OLD SESSIONS
            // =====================================================

            localStorage.removeItem("token");
            localStorage.removeItem("shopToken");
            localStorage.removeItem("shopAdminToken");
            localStorage.removeItem("adminToken");
            localStorage.removeItem("superAdminToken");
            localStorage.removeItem("shopBuilderToken");
            localStorage.removeItem("shopBuilderUser");

            // =====================================================
            // SAVE CURRENT SHOP ADMIN SESSION
            // =====================================================

            localStorage.setItem(
                "shopBuilderToken",
                token
            );

            localStorage.setItem(
                "shopBuilderUser",
                JSON.stringify(user)
            );

            // Keep these two temporarily for compatibility
            // with any old Shop Admin components.
            localStorage.setItem(
                "shopAdminToken",
                token
            );

            localStorage.setItem(
                "shopAdminUser",
                JSON.stringify(user)
            );

            console.log(
                "Logged in Shop Admin:",
                user
            );

            console.log(
                "Logged in Shop ID:",
                user?.shopID
            );

            toast.success("Login successful!");

            // =====================================================
            // GO TO SHOP ADMIN DASHBOARD
            // =====================================================

            const isServiceShop = String(
                user?.shop?.shopType || user?.shop?.ShopType || user?.shopType || "Ecommerce"
            ).toLowerCase() === "service";

            navigate(
                isServiceShop ? "/shop-admin/dashboard" : "/shop-admin/welcome",
                {
                    replace: true
                }
            );

        } catch (error) {
            console.error(
                "Shop Login Error:",
                error
            );

            toast.error(
                error.message ||
                "Unable to login."
            );

        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="shop-login-page">

            {/* =====================================================
                LEFT SIDE
            ===================================================== */}

            <div className="shop-login-left">

                <div className="shop-login-brand">

                    <div className="shop-brand-icon">
                        <Store size={25} />
                    </div>

                    <div>
                        <strong>
                            ShopBuilder
                        </strong>

                        <span>
                            Shop Admin
                        </span>
                    </div>

                </div>

                <div className="shop-login-content">

                    <span className="login-eyebrow">
                        SHOP ADMIN PORTAL
                    </span>

                    <h1>
                        Manage your
                        <br />
                        <span>
                            business smarter.
                        </span>
                    </h1>

                    <p>
                        Manage products, services,
                        categories, customers and
                        orders from one powerful
                        dashboard.
                    </p>

                </div>

            </div>

            {/* =====================================================
                RIGHT SIDE
            ===================================================== */}

            <div className="shop-login-right">

                <div className="shop-login-card">

                    <div className="login-card-icon">
                        <Store size={25} />
                    </div>

                    <h2>
                        Welcome back
                    </h2>

                    <p>
                        Sign in to your shop
                        admin account.
                    </p>

                    <form onSubmit={handleSubmit}>

                        {/* EMAIL */}

                        <div className="shop-input-group">

                            <label>
                                Email Address
                            </label>

                            <div className="shop-input">

                                <Mail size={18} />

                                <input
                                    type="email"
                                    placeholder="owner@example.com"
                                    value={email}
                                    onChange={(e) =>
                                        setEmail(
                                            e.target.value
                                        )
                                    }
                                    autoComplete="email"
                                />

                            </div>

                        </div>

                        {/* PASSWORD */}

                      <div className="shop-input-group">

    <div
        style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px"
        }}
    >
        <label>
            Password
        </label>

        <button
            type="button"
            className="forgot-btn"
            onClick={() =>
                navigate("/shop/forgot-password")
            }
        >
            Forgot password?
        </button>
    </div>

    <div className="shop-input">

                                <LockKeyhole size={18} />

                                <input
                                    type={
                                        showPassword
                                            ? "text"
                                            : "password"
                                    }
                                    placeholder="Enter password"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(
                                            e.target.value
                                        )
                                    }
                                    autoComplete="current-password"
                                />

                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() =>
                                        setShowPassword(
                                            (prev) =>
                                                !prev
                                        )
                                    }
                                >
                                    {showPassword ? (
                                        <EyeOff size={18} />
                                    ) : (
                                        <Eye size={18} />
                                    )}
                                </button>

                            </div>

                        </div>

                        {/* LOGIN BUTTON */}

                        <button
                            type="submit"
                            className="shop-login-btn"
                            disabled={loading}
                        >

                            {loading
                                ? "Signing in..."
                                : "Sign In"
                            }

                            {!loading && (
                                <ArrowRight
                                    size={18}
                                />
                            )}

                        </button>

                    </form>

                    <div className="shop-login-footer">
                        Secure Shop Admin Access
                    </div>

                </div>

            </div>

        </div>
    );
}

export default ShopLogin;
