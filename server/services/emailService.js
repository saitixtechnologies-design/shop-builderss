import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(
        process.env.SMTP_PORT || 587
    ),
    secure:
        String(
            process.env.SMTP_SECURE
        ).toLowerCase() === "true",

    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
});

export const sendPasswordResetOTP =
    async ({ email, otp }) => {
        await transporter.sendMail({
            from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
            to: email,
            subject:
                "Shop Builder - Password Reset OTP",

            html: `
                <div style="
                    font-family:Arial;
                    max-width:600px;
                    margin:auto;
                    padding:30px;
                ">
                    <h2>Shop Builder</h2>

                    <p>
                        Your password reset OTP is:
                    </p>

                    <div style="
                        font-size:32px;
                        font-weight:bold;
                        letter-spacing:8px;
                        padding:20px;
                        background:#f3f4f6;
                        text-align:center;
                        border-radius:10px;
                    ">
                        ${otp}
                    </div>

                    <p>
                        This OTP will expire in
                        <strong>
                            ${
                                process.env
                                    .OTP_EXPIRES_MINUTES ||
                                10
                            }
                            minutes
                        </strong>.
                    </p>

                    <p>
                        If you did not request this,
                        you can safely ignore this email.
                    </p>
                </div>
            `,
        });
    };