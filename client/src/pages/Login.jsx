import { useState } from "react";
import { useNavigate } from "react-router";
import { postJson } from "../lib/api";

import "../styles/Login.css";

const Login = () => {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (loading) return;

        try {
            setLoading(true);

            const { response, data } = await postJson(
                "/api/auth/login",
                { email: email.trim(), password }
            );

            if (!response.ok) {
                alert(data.message || "Login failed");
                return;
            }

            /* =========================================
               SAVE JWT TOKEN
            ========================================= */

            localStorage.setItem(
                "shopBuilderToken",
                data.token
            );

            localStorage.setItem("superAdminToken", data.token);
            localStorage.setItem("adminToken", data.token);
            localStorage.setItem("superAdminUser", JSON.stringify(data.user));
            localStorage.setItem("adminUser", JSON.stringify(data.user));
            localStorage.removeItem("shopAdminToken");
            localStorage.removeItem("shopToken");
            localStorage.removeItem("shopAdminUser");

            /*
               Existing project ke kuch pages
               "token" bhi check kar rahe hain.
               Isliye same token ko token key mein bhi save kar rahe hain.
            */

            localStorage.setItem(
                "token",
                data.token
            );

            /* =========================================
               SAVE LOGGED-IN USER
            ========================================= */

            localStorage.setItem(
                "shopBuilderUser",
                JSON.stringify(data.user)
            );
            localStorage.setItem("user", JSON.stringify(data.user));

            console.log(
                "Logged in user:",
                data.user
            );

            /* =========================================
               LOGIN SUCCESS
            ========================================= */

            alert("Login successful!");

            /* =========================================
               GO TO ADMIN DASHBOARD
            ========================================= */

            navigate("/admin/dashboard", {
                replace: true
            });

        } catch (error) {
            console.error(
                "Login error:",
                error
            );

            alert(
                "Unable to connect to server. Please make sure backend is running."
            );

        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">

            {/* =========================================
                LEFT SECTION
            ========================================= */}

            <div className="login-brand">

                <div className="brand-content">

                    <div className="brand-logo">
                        SB
                    </div>

                    <h1>
                        Shop Builder
                    </h1>

                    <p>
                        Build, manage and grow your online
                        stores from one powerful platform.
                    </p>

                    <div className="brand-features">

                        <div>
                            <span>✓</span>
                            Multi-shop management
                        </div>

                        <div>
                            <span>✓</span>
                            Powerful admin dashboard
                        </div>

                        <div>
                            <span>✓</span>
                            Secure & scalable platform
                        </div>

                    </div>

                </div>

            </div>

            {/* =========================================
                RIGHT SECTION
            ========================================= */}

            <div className="login-section">

                <div className="login-card">

                    <div className="login-header">

                        <span className="welcome-text">
                            WELCOME BACK
                        </span>

                        <h2>
                            Admin Login
                        </h2>

                        <p>
                            Sign in to manage your
                            Shop Builder platform.
                        </p>

                    </div>

                    <form onSubmit={handleSubmit}>

                        {/* EMAIL */}

                        <div className="form-group">

                            <label>
                                Email Address
                            </label>

                            <input
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) =>
                                    setEmail(e.target.value)
                                }
                                required
                            />

                        </div>

                        {/* PASSWORD */}

                        <div className="form-group">

                            <div className="password-label">

                                <label>
                                    Password
                                </label>

                             <button
    type="button"
    className="forgot-btn"
    onClick={() =>
        navigate("/forgot-password")
    }
>
    Forgot password?
</button>

                            </div>

                            <input
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) =>
                                    setPassword(e.target.value)
                                }
                                required
                            />

                        </div>

                        {/* LOGIN BUTTON */}

                        <button
                            type="submit"
                            className="login-btn"
                            disabled={loading}
                        >

                            {loading
                                ? "Signing In..."
                                : "Sign In"}

                            {!loading && (
                                <span>
                                    →
                                </span>
                            )}

                        </button>

                    </form>

                    <div className="login-footer">

                        <span>
                            Shop Builder SaaS
                        </span>

                        <span>
                            •
                        </span>

                        <span>
                            Secure Admin Portal
                        </span>

                    </div>

                </div>

            </div>

        </div>
    );
};

export default Login;
