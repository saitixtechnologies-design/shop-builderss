import { useState } from "react";
import { useNavigate } from "react-router";
import { postJson } from "../lib/api";
import "../styles/Login.css";

function ResetPassword() {
    const navigate = useNavigate();

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (loading) return;

        if (!newPassword || !confirmPassword) {
            alert("Please enter both passwords.");
            return;
        }

        if (newPassword.length < 6) {
            alert("Password must be at least 6 characters.");
            return;
        }

        if (newPassword !== confirmPassword) {
            alert("Passwords do not match.");
            return;
        }

        const resetToken = sessionStorage.getItem(
            "passwordResetToken"
        );

        if (!resetToken) {
            alert(
                "Password reset session expired. Please request a new OTP."
            );

            navigate("/forgot-password", {
                replace: true
            });

            return;
        }

        try {
            setLoading(true);

            const { response, data } = await postJson(
                "/api/password/reset",
                {
                    resetToken,
                    newPassword,
                    confirmPassword
                }
            );

            if (!response.ok) {
                alert(
                    data.message ||
                    "Unable to reset password."
                );
                return;
            }

            /*
             * Reset completed successfully.
             * Remove temporary reset information.
             */
            sessionStorage.removeItem(
                "passwordResetToken"
            );

            sessionStorage.removeItem(
                "passwordResetEmail"
            );

            alert(
                data.message ||
                "Password reset successfully."
            );

            navigate("/admin/login", {
                replace: true
            });

        } catch (error) {
            console.error(
                "Reset password error:",
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

            {/* LEFT SECTION */}
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

            {/* RIGHT SECTION */}
            <div className="login-section">
                <div className="login-card">

                    <div className="login-header">

                        <span className="welcome-text">
                            SECURITY
                        </span>

                        <h2>
                            Reset Password
                        </h2>

                        <p>
                            Create a new secure password for
                            your Shop Builder admin account.
                        </p>

                    </div>

                    <form onSubmit={handleSubmit}>

                        {/* NEW PASSWORD */}
                        <div className="form-group">

                            <label>
                                New Password
                            </label>

                            <input
                                type="password"
                                placeholder="Enter new password"
                                value={newPassword}
                                onChange={(e) =>
                                    setNewPassword(
                                        e.target.value
                                    )
                                }
                                required
                                autoComplete="new-password"
                            />

                        </div>

                        {/* CONFIRM PASSWORD */}
                        <div className="form-group">

                            <label>
                                Confirm Password
                            </label>

                            <input
                                type="password"
                                placeholder="Confirm new password"
                                value={confirmPassword}
                                onChange={(e) =>
                                    setConfirmPassword(
                                        e.target.value
                                    )
                                }
                                required
                                autoComplete="new-password"
                            />

                        </div>

                        {/* RESET BUTTON */}
                        <button
                            type="submit"
                            className="login-btn"
                            disabled={loading}
                        >
                            {loading
                                ? "Resetting..."
                                : "Reset Password"}

                            {!loading && (
                                <span>
                                    →
                                </span>
                            )}
                        </button>

                    </form>

                    <div
                        style={{
                            marginTop: "20px",
                            textAlign: "center"
                        }}
                    >
                        <button
                            type="button"
                            className="forgot-btn"
                            onClick={() =>
                                navigate(
                                    "/admin/login"
                                )
                            }
                        >
                            ← Back to Login
                        </button>
                    </div>

                    <div className="login-footer">

                        <span>
                            Shop Builder SaaS
                        </span>

                        <span>
                            •
                        </span>

                        <span>
                            Secure Password Recovery
                        </span>

                    </div>

                </div>
            </div>

        </div>
    );
}

export default ResetPassword;