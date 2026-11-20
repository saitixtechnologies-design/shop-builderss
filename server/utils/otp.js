import crypto from "crypto";

export const generateOTP = () => {
    return crypto
        .randomInt(100000, 1000000)
        .toString();
};

export const getOTPExpiry = () => {
    const minutes = Number(
        process.env.OTP_EXPIRES_MINUTES || 10
    );

    return new Date(
        Date.now() + minutes * 60 * 1000
    );
};