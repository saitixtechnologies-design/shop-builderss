import bcrypt from "bcryptjs";
import { getDB } from "../config/db.js";
import sql from "mssql";
import {
    generateOTP,
    getOTPExpiry,
} from "../utils/otp.js";
import { sendPasswordResetOTP } from "./emailService.js";

// =====================================================
// CONFIG
// =====================================================

const OTP_EXPIRES_MINUTES = Number(
    process.env.OTP_EXPIRES_MINUTES || 10
);

const OTP_RESEND_SECONDS = Number(
    process.env.OTP_RESEND_SECONDS || 60
);

const OTP_MAX_ATTEMPTS = Number(
    process.env.OTP_MAX_ATTEMPTS || 5
);

// =====================================================
// CREATE & SEND OTP
// =====================================================

export const createAndSendOTP = async ({
    userID,
    email,
}) => {
    const db = getDB();

    // -------------------------------------------------
    // CHECK RESEND COOLDOWN
    // -------------------------------------------------

    const recentOTPResult = await db
        .request()
        .input(
            "UserID",
            sql.Int,
            userID
        )
        .query(`
            SELECT TOP 1
                OTPID,
                CreatedAt
            FROM dbo.PasswordResetOTPs
            WHERE UserID = @UserID
              AND Purpose = 'FORGOT_PASSWORD'
              AND DeliveryMethod = 'EMAIL'
              AND UsedAt IS NULL
            ORDER BY CreatedAt DESC
        `);

    const recentOTP =
        recentOTPResult.recordset?.[0];

    if (recentOTP) {
        const createdAt = new Date(
            recentOTP.CreatedAt
        );

        const secondsPassed =
            (Date.now() - createdAt.getTime()) /
            1000;

        if (
            secondsPassed <
            OTP_RESEND_SECONDS
        ) {
            const remainingSeconds =
                Math.ceil(
                    OTP_RESEND_SECONDS -
                        secondsPassed
                );

            const error = new Error(
                `Please wait ${remainingSeconds} seconds before requesting another OTP.`
            );

            error.statusCode = 429;

            throw error;
        }
    }

    // -------------------------------------------------
    // INVALIDATE PREVIOUS OTPs
    // -------------------------------------------------

    await db
        .request()
        .input(
            "UserID",
            sql.Int,
            userID
        )
        .query(`
            UPDATE dbo.PasswordResetOTPs
            SET UsedAt = SYSUTCDATETIME()
            WHERE UserID = @UserID
              AND Purpose = 'FORGOT_PASSWORD'
              AND UsedAt IS NULL
        `);

    // -------------------------------------------------
    // GENERATE OTP
    // -------------------------------------------------

    const otp = generateOTP();

    // -------------------------------------------------
    // HASH OTP
    // -------------------------------------------------

    const otpHash = await bcrypt.hash(
        otp,
        10
    );

    // -------------------------------------------------
    // EXPIRY
    // -------------------------------------------------

    const expiresAt = getOTPExpiry();

    // -------------------------------------------------
    // SAVE OTP
    // -------------------------------------------------

    await db
        .request()
        .input(
            "UserID",
            sql.Int,
            userID
        )
        .input(
            "OTPHash",
            sql.NVarChar(255),
            otpHash
        )
        .input(
            "Purpose",
            sql.NVarChar(50),
            "FORGOT_PASSWORD"
        )
        .input(
            "DeliveryMethod",
            sql.NVarChar(20),
            "EMAIL"
        )
        .input(
            "Destination",
            sql.NVarChar(255),
            email
        )
        .input(
            "ExpiresAt",
            sql.DateTime2,
            expiresAt
        )
        .query(`
            INSERT INTO dbo.PasswordResetOTPs
            (
                UserID,
                OTPHash,
                Purpose,
                DeliveryMethod,
                Destination,
                ExpiresAt
            )
            VALUES
            (
                @UserID,
                @OTPHash,
                @Purpose,
                @DeliveryMethod,
                @Destination,
                @ExpiresAt
            )
        `);

    // -------------------------------------------------
    // SEND EMAIL
    // -------------------------------------------------

    try {
        await sendPasswordResetOTP({
            email,
            otp,
        });
    } catch (error) {
        // If email fails, invalidate the OTP
        await db
            .request()
            .input(
                "UserID",
                sql.Int,
                userID
            )
            .query(`
                UPDATE dbo.PasswordResetOTPs
                SET UsedAt = SYSUTCDATETIME()
                WHERE UserID = @UserID
                  AND Purpose = 'FORGOT_PASSWORD'
                  AND UsedAt IS NULL
            `);

        throw new Error(
            "Unable to send OTP email. Please try again."
        );
    }

    return {
        success: true,
        expiresInMinutes:
            OTP_EXPIRES_MINUTES,
    };
};

// =====================================================
// VERIFY OTP
// =====================================================

export const verifyOTP = async ({
    userID,
    otp,
}) => {
    const db = getDB();

    const result = await db
        .request()
        .input(
            "UserID",
            sql.Int,
            userID
        )
        .query(`
            SELECT TOP 1
                OTPID,
                OTPHash,
                ExpiresAt,
                AttemptCount,
                VerifiedAt,
                UsedAt
            FROM dbo.PasswordResetOTPs
            WHERE UserID = @UserID
              AND Purpose = 'FORGOT_PASSWORD'
              AND DeliveryMethod = 'EMAIL'
              AND UsedAt IS NULL
            ORDER BY CreatedAt DESC
        `);

    const record =
        result.recordset?.[0];

    if (!record) {
        throw new Error(
            "OTP not found or already used."
        );
    }

    // -------------------------------------------------
    // CHECK ALREADY VERIFIED
    // -------------------------------------------------

    if (record.VerifiedAt) {
        return {
            success: true,
            otpID: record.OTPID,
        };
    }

    // -------------------------------------------------
    // CHECK EXPIRY
    // -------------------------------------------------

    if (
        new Date(record.ExpiresAt).getTime() <
        Date.now()
    ) {
        throw new Error(
            "OTP has expired. Please request a new OTP."
        );
    }

    // -------------------------------------------------
    // CHECK ATTEMPTS
    // -------------------------------------------------

    if (
        Number(record.AttemptCount) >=
        OTP_MAX_ATTEMPTS
    ) {
        throw new Error(
            "Maximum OTP attempts exceeded. Please request a new OTP."
        );
    }

    // -------------------------------------------------
    // CHECK OTP
    // -------------------------------------------------

    const isValid = await bcrypt.compare(
        String(otp),
        record.OTPHash
    );

    if (!isValid) {
        await db
            .request()
            .input(
                "OTPID",
                sql.Int,
                record.OTPID
            )
            .query(`
                UPDATE dbo.PasswordResetOTPs
                SET AttemptCount =
                    AttemptCount + 1
                WHERE OTPID = @OTPID
            `);

        const attemptsUsed =
            Number(record.AttemptCount) + 1;

        const attemptsRemaining =
            Math.max(
                OTP_MAX_ATTEMPTS -
                    attemptsUsed,
                0
            );

        if (attemptsRemaining === 0) {
            throw new Error(
                "Invalid OTP. Maximum attempts exceeded. Please request a new OTP."
            );
        }

        throw new Error(
            `Invalid OTP. ${attemptsRemaining} attempt(s) remaining.`
        );
    }

    // -------------------------------------------------
    // MARK VERIFIED
    // -------------------------------------------------

    await db
        .request()
        .input(
            "OTPID",
            sql.Int,
            record.OTPID
        )
        .query(`
            UPDATE dbo.PasswordResetOTPs
            SET VerifiedAt = SYSUTCDATETIME()
            WHERE OTPID = @OTPID
        `);

    return {
        success: true,
        otpID: record.OTPID,
    };
};