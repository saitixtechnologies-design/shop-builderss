import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { postJson } from "../lib/api";
import "../styles/Login.css";

function VerifyOTP() {
    const navigate = useNavigate();
    const location = useLocation();

    const email = location.state?.email || "";

    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (loading) return;

        if (!email) {
            alert("Email information is missing. Please start again.");
            navigate("/forgot-password");
            return;
        }

        if (!/^\d{6}$/.test(otp)) {
            alert("Please enter a valid 6-digit OTP.");
            return;
        }

        try {
            setLoading(true);

            const { response, data } = await postJson(
                "/api/password/verify-otp",
                {
                    email,
                    otp
                }
            );

            if (!response.ok) {
                alert(
                    data.message ||
                    "Invalid or expired OTP."
                );
                return;
            }

            /*
             * Reset token is required for the
             * next Reset Password step.
             */
            sessionStorage.setItem(
                "passwordResetToken",
                data.resetToken
            );

            sessionStorage.setItem(
                "passwordResetEmail",
                email
            );

            alert(
                data.message ||
                "OTP verified successfully."
            );

            navigate("/reset-password", {
                replace: true
            });

        } catch (error) {
            console.error(
                "Verify OTP error:",
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
                            VERIFICATION
                        </span>

                        <h2>
                            Verify OTP
                        </h2>

                        <p>
                            Enter the 6-digit OTP sent to your
                            registered email address.
                        </p>

                    </div>

                    <form onSubmit={handleSubmit}>

                        <div className="form-group">

                            <label>
                                Verification Code
                            </label>

                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                placeholder="Enter 6-digit OTP"
                                value={otp}
                                onChange={(e) =>
                                    setOtp(
                                        e.target.value
                                            .replace(/\D/g, "")
                                    )
                                }
                                required
                                autoComplete="one-time-code"
                            />

                        </div>

                        <button
                            type="submit"
                            className="login-btn"
                            disabled={loading}
                        >
                            {loading
                                ? "Verifying..."
                                : "Verify OTP"}

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
                                    "/forgot-password"
                                )
                            }
                        >
                            ← Change Email
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
                            Secure Verification
                        </span>

                    </div>

                </div>
            </div>

        </div>
    );
}

export default VerifyOTP;