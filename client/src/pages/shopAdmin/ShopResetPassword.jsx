import { useState } from "react";
import { useNavigate } from "react-router";
import { postJson } from "../../lib/api";
import "../../styles/ShopLogin.css";
import { Store, LockKeyhole, ArrowRight } from "lucide-react";
import { toast } from "react-toastify";

function ShopResetPassword() {
    const navigate = useNavigate();

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (loading) return;

        if (!newPassword || !confirmPassword) {
            toast.error(
                "Please enter both passwords."
            );
            return;
        }

        if (newPassword.length < 8) {
            toast.error(
                "Password must be at least 8 characters."
            );
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error(
                "Passwords do not match."
            );
            return;
        }

        const resetToken =
            sessionStorage.getItem(
                "shopPasswordResetToken"
            );

        if (!resetToken) {
            toast.error(
                "Password reset session expired."
            );

            navigate(
                "/shop/forgot-password",
                {
                    replace: true,
                }
            );

            return;
        }

        try {
            setLoading(true);

            const { response, data } = await postJson(
                "/api/shop-password/reset",
                {
                    resetToken,
                    newPassword,
                    confirmPassword,
                }
            );

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message ||
                    "Unable to reset password."
                );
            }

            sessionStorage.removeItem(
                "shopPasswordResetToken"
            );

            sessionStorage.removeItem(
                "shopPasswordResetEmail"
            );

            toast.success(
                data.message ||
                "Password reset successfully."
            );

            navigate("/shop/login", {
                replace: true,
            });

        } catch (error) {
            console.error(
                "Shop Reset Password Error:",
                error
            );

            toast.error(
                error.message ||
                "Unable to reset password."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="shop-login-page">

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
                        SECURITY
                    </span>

                    <h1>
                        Create a new
                        <br />
                        <span>
                            secure password.
                        </span>
                    </h1>

                    <p>
                        Choose a strong password to
                        protect your shop admin account.
                    </p>

                </div>

            </div>

            <div className="shop-login-right">

                <div className="shop-login-card">

                    <div className="login-card-icon">
                        <LockKeyhole size={25} />
                    </div>

                    <h2>
                        Reset Password
                    </h2>

                    <p>
                        Create your new shop admin
                        password.
                    </p>

                    <form onSubmit={handleSubmit}>

                        <div className="shop-input-group">

                            <label>
                                New Password
                            </label>

                            <div className="shop-input">

                                <LockKeyhole size={18} />

                                <input
                                    type="password"
                                    placeholder="Enter new password"
                                    value={newPassword}
                                    onChange={(e) =>
                                        setNewPassword(
                                            e.target.value
                                        )
                                    }
                                    autoComplete="new-password"
                                    required
                                />

                            </div>

                        </div>

                        <div className="shop-input-group">

                            <label>
                                Confirm Password
                            </label>

                            <div className="shop-input">

                                <LockKeyhole size={18} />

                                <input
                                    type="password"
                                    placeholder="Confirm new password"
                                    value={confirmPassword}
                                    onChange={(e) =>
                                        setConfirmPassword(
                                            e.target.value
                                        )
                                    }
                                    autoComplete="new-password"
                                    required
                                />

                            </div>

                        </div>

                        <button
                            type="submit"
                            className="shop-login-btn"
                            disabled={loading}
                        >
                            {loading
                                ? "Resetting..."
                                : "Reset Password"}

                            {!loading && (
                                <ArrowRight
                                    size={18}
                                />
                            )}
                        </button>

                    </form>

                    <div
                        style={{
                            marginTop: "20px",
                            textAlign: "center",
                        }}
                    >
                        <button
                            type="button"
                            className="password-toggle"
                            onClick={() =>
                                navigate("/shop/login")
                            }
                            style={{
                                width: "auto",
                                position: "static",
                                color: "inherit",
                            }}
                        >
                            ← Back to Login
                        </button>
                    </div>

                    <div className="shop-login-footer">
                        Secure Shop Admin Access
                    </div>

                </div>

            </div>

        </div>
    );
}

export default ShopResetPassword;