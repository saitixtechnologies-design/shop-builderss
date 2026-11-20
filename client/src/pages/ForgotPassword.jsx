import { useState } from "react";
import { useNavigate } from "react-router";
import { postJson } from "../lib/api";
import "../styles/Login.css";

function ForgotPassword() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (loading) return;

        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedEmail) {
            alert("Please enter your email address.");
            return;
        }

        try {
            setLoading(true);

            const { response, data } = await postJson(
                "/api/password/forgot",
                {
                    email: normalizedEmail
                }
            );

            if (!response.ok) {
                alert(
                    data.message ||
                    "Unable to send OTP. Please try again."
                );
                return;
            }

            alert(
                data.message ||
                "If the account exists, an OTP has been sent to your email."
            );

            navigate("/verify-otp", {
                state: {
                    email: normalizedEmail
                }
            });
        } catch (error) {
            console.error(
                "Forgot password error:",
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
                            ACCOUNT RECOVERY
                        </span>

                        <h2>
                            Forgot Password?
                        </h2>

                        <p>
                            Enter your registered email address
                            and we'll send you a verification OTP.
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
                                placeholder="Enter your registered email"
                                value={email}
                                onChange={(e) =>
                                    setEmail(e.target.value)
                                }
                                required
                                autoComplete="email"
                            />

                        </div>

                        {/* SEND OTP */}
                        <button
                            type="submit"
                            className="login-btn"
                            disabled={loading}
                        >
                            {loading
                                ? "Sending OTP..."
                                : "Send OTP"}

                            {!loading && (
                                <span>
                                    →
                                </span>
                            )}
                        </button>

                    </form>

                    {/* BACK TO LOGIN */}
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
                                navigate("/login")
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
                            Secure Account Recovery
                        </span>

                    </div>

                </div>
            </div>

        </div>
    );
}

export default ForgotPassword;