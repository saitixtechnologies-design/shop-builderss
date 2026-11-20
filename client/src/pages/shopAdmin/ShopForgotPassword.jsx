import { useState } from "react";
import { useNavigate } from "react-router";
import { postJson } from "../../lib/api";
import "../../styles/ShopLogin.css";
import { Store, Mail, ArrowRight } from "lucide-react";
import { toast } from "react-toastify";

function ShopForgotPassword() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (loading) return;

        const normalizedEmail =
            email.trim().toLowerCase();

        if (!normalizedEmail) {
            toast.error("Please enter your email.");
            return;
        }

        try {
            setLoading(true);

            const { response, data } = await postJson(
                "/api/shop-password/forgot",
                {
                    email: normalizedEmail,
                }
            );

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message ||
                    "Unable to send OTP."
                );
            }

            toast.success(
                data.message ||
                "OTP has been sent to your email."
            );

            navigate("/shop/verify-otp", {
                state: {
                    email: normalizedEmail,
                },
            });

        } catch (error) {
            console.error(
                "Shop Forgot Password Error:",
                error
            );

            toast.error(
                error.message ||
                "Unable to send OTP."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="shop-login-page">

            {/* LEFT */}
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
                        ACCOUNT RECOVERY
                    </span>

                    <h1>
                        Recover your
                        <br />
                        <span>
                            shop account.
                        </span>
                    </h1>

                    <p>
                        Enter your registered email
                        address and we'll send you a
                        secure verification OTP.
                    </p>

                </div>

            </div>

            {/* RIGHT */}
            <div className="shop-login-right">

                <div className="shop-login-card">

                    <div className="login-card-icon">
                        <Mail size={25} />
                    </div>

                    <h2>
                        Forgot Password?
                    </h2>

                    <p>
                        Enter your shop admin email
                        to continue.
                    </p>

                    <form onSubmit={handleSubmit}>

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
                                ? "Sending OTP..."
                                : "Send OTP"}

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

export default ShopForgotPassword;