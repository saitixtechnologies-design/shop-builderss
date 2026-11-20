import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { postJson } from "../../lib/api";
import "../../styles/ShopLogin.css";
import { Store, ShieldCheck, ArrowRight } from "lucide-react";
import { toast } from "react-toastify";

function ShopVerifyOTP() {
    const navigate = useNavigate();
    const location = useLocation();

    const email = location.state?.email || "";

    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (loading) return;

        if (!email) {
            toast.error(
                "Email information is missing."
            );

            navigate("/shop/forgot-password");
            return;
        }

        if (!/^\d{6}$/.test(otp)) {
            toast.error(
                "Please enter a valid 6-digit OTP."
            );
            return;
        }

        try {
            setLoading(true);

            const { response, data } = await postJson(
                "/api/shop-password/verify-otp",
                {
                    email,
                    otp,
                }
            );

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message ||
                    "Invalid or expired OTP."
                );
            }

            sessionStorage.setItem(
                "shopPasswordResetToken",
                data.resetToken
            );

            sessionStorage.setItem(
                "shopPasswordResetEmail",
                email
            );

            toast.success(
                data.message ||
                "OTP verified successfully."
            );

            navigate("/shop/reset-password", {
                replace: true,
            });

        } catch (error) {
            console.error(
                "Shop Verify OTP Error:",
                error
            );

            toast.error(
                error.message ||
                "Invalid or expired OTP."
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
                        SECURITY VERIFICATION
                    </span>

                    <h1>
                        Verify your
                        <br />
                        <span>
                            account.
                        </span>
                    </h1>

                    <p>
                        Enter the 6-digit verification
                        code sent to your registered
                        email address.
                    </p>

                </div>

            </div>

            <div className="shop-login-right">

                <div className="shop-login-card">

                    <div className="login-card-icon">
                        <ShieldCheck size={25} />
                    </div>

                    <h2>
                        Verify OTP
                    </h2>

                    <p>
                        Enter the OTP sent to your
                        email address.
                    </p>

                    <form onSubmit={handleSubmit}>

                        <div className="shop-input-group">

                            <label>
                                Verification Code
                            </label>

                            <div className="shop-input">

                                <ShieldCheck size={18} />

                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    placeholder="Enter 6-digit OTP"
                                    value={otp}
                                    onChange={(e) =>
                                        setOtp(
                                            e.target.value.replace(
                                                /\D/g,
                                                ""
                                            )
                                        )
                                    }
                                    autoComplete="one-time-code"
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
                                ? "Verifying..."
                                : "Verify OTP"}

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
                                navigate(
                                    "/shop/forgot-password"
                                )
                            }
                            style={{
                                width: "auto",
                                position: "static",
                                color: "inherit",
                            }}
                        >
                            ← Change Email
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

export default ShopVerifyOTP;