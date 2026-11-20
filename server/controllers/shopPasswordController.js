import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import sql from "mssql";

import { getDB } from "../config/db.js";
import {
    createAndSendOTP,
    verifyOTP,
} from "../services/otpService.js";

import {
    hashPassword,
    comparePassword,
} from "../utils/password.js";

// =====================================================
// HELPERS
// =====================================================

const normalizeEmail = (email) => {
    return String(email || "")
        .trim()
        .toLowerCase();
};

const validatePassword = (password) => {
    if (!password || password.length < 8) {
        return "Password must be at least 8 characters long.";
    }

    return null;
};

// =====================================================
// SHOP ADMIN - FORGOT PASSWORD
// POST /api/shop-password/forgot
// =====================================================

export const shopForgotPassword = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required.",
            });
        }

        const db = getDB();

        const result = await db
            .request()
            .input(
                "Email",
                sql.NVarChar(255),
                email
            )
            .query(`
                SELECT TOP 1
                    u.UserID,
                    u.ShopID,
                    u.Email,
                    u.FullName,
                    u.IsActive,
                    r.RoleName,
                    s.Status AS ShopStatus
                FROM dbo.Users u
                INNER JOIN dbo.Roles r
                    ON u.RoleID = r.RoleID
                INNER JOIN dbo.Shops s
                    ON u.ShopID = s.ShopID
                WHERE LOWER(u.Email) = @Email
                  AND r.RoleName = 'ShopAdmin'
            `);

        const user = result.recordset?.[0];

        /*
         * Don't reveal whether an email exists.
         */
        if (
            !user ||
            !user.IsActive ||
            (
                user.ShopStatus &&
                user.ShopStatus !== "Active"
            )
        ) {
            return res.status(200).json({
                success: true,
                message:
                    "If an account exists with this email, an OTP has been sent.",
            });
        }

        await createAndSendOTP({
            userID: user.UserID,
            email: user.Email,
        });

        return res.status(200).json({
            success: true,
            message:
                "If an account exists with this email, an OTP has been sent.",
        });

    } catch (error) {
        console.error(
            "Shop Forgot Password Error:",
            error
        );

        if (error.statusCode === 429) {
            return res.status(429).json({
                success: false,
                message: error.message,
            });
        }

        return res.status(500).json({
            success: false,
            message:
                "Unable to process password reset request.",
        });
    }
};

// =====================================================
// SHOP ADMIN - VERIFY OTP
// POST /api/shop-password/verify-otp
// =====================================================

export const verifyShopPasswordOTP = async (
    req,
    res
) => {
    try {
        const email = normalizeEmail(
            req.body.email
        );

        const otp = String(
            req.body.otp || ""
        ).trim();

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message:
                    "Email and OTP are required.",
            });
        }

        if (!/^\d{6}$/.test(otp)) {
            return res.status(400).json({
                success: false,
                message:
                    "OTP must be a 6-digit number.",
            });
        }

        const db = getDB();

        const userResult = await db
            .request()
            .input(
                "Email",
                sql.NVarChar(255),
                email
            )
            .query(`
                SELECT TOP 1
                    u.UserID,
                    u.ShopID,
                    u.Email,
                    u.IsActive,
                    r.RoleName,
                    s.Status AS ShopStatus
                FROM dbo.Users u
                INNER JOIN dbo.Roles r
                    ON u.RoleID = r.RoleID
                INNER JOIN dbo.Shops s
                    ON u.ShopID = s.ShopID
                WHERE LOWER(u.Email) = @Email
                  AND r.RoleName = 'ShopAdmin'
            `);

        const user =
            userResult.recordset?.[0];

        if (
            !user ||
            !user.IsActive ||
            (
                user.ShopStatus &&
                user.ShopStatus !== "Active"
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid or expired OTP.",
            });
        }

        const verification =
            await verifyOTP({
                userID: user.UserID,
                otp,
            });

        const resetToken =
            jwt.sign(
                {
                    userID: user.UserID,
                    shopID: user.ShopID,
                    email: user.Email,
                    otpID: verification.otpID,
                    purpose: "SHOP_ADMIN_PASSWORD_RESET",
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "10m",
                }
            );

        return res.status(200).json({
            success: true,
            message:
                "OTP verified successfully.",
            resetToken,
        });

    } catch (error) {
        console.error(
            "Shop Verify OTP Error:",
            error
        );

        return res.status(400).json({
            success: false,
            message:
                error.message ||
                "Invalid or expired OTP.",
        });
    }
};

// =====================================================
// SHOP ADMIN - RESET PASSWORD
// POST /api/shop-password/reset
// =====================================================

export const resetShopPassword = async (
    req,
    res
) => {
    try {
        const {
            resetToken,
            newPassword,
            confirmPassword,
        } = req.body;

        if (!resetToken) {
            return res.status(401).json({
                success: false,
                message:
                    "Password reset session is missing.",
            });
        }

        if (
            !newPassword ||
            !confirmPassword
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "New password and confirmation are required.",
            });
        }

        if (
            newPassword !==
            confirmPassword
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Passwords do not match.",
            });
        }

        const passwordError =
            validatePassword(newPassword);

        if (passwordError) {
            return res.status(400).json({
                success: false,
                message: passwordError,
            });
        }

        let decoded;

        try {
            decoded = jwt.verify(
                resetToken,
                process.env.JWT_SECRET
            );
        } catch {
            return res.status(401).json({
                success: false,
                message:
                    "Password reset session has expired. Please start again.",
            });
        }

        if (
            decoded.purpose !==
            "SHOP_ADMIN_PASSWORD_RESET"
        ) {
            return res.status(401).json({
                success: false,
                message:
                    "Invalid password reset token.",
            });
        }

        if (!decoded.userID || !decoded.shopID) {
            return res.status(401).json({
                success: false,
                message:
                    "Invalid shop password reset request.",
            });
        }

        const db = getDB();

        // =================================================
        // VERIFY OTP RECORD
        // =================================================

        const otpResult = await db
            .request()
            .input(
                "OTPID",
                sql.Int,
                decoded.otpID
            )
            .input(
                "UserID",
                sql.Int,
                decoded.userID
            )
            .query(`
                SELECT TOP 1
                    OTPID,
                    UserID,
                    VerifiedAt,
                    UsedAt,
                    ExpiresAt
                FROM dbo.PasswordResetOTPs
                WHERE OTPID = @OTPID
                  AND UserID = @UserID
                  AND Purpose = 'FORGOT_PASSWORD'
                  AND DeliveryMethod = 'EMAIL'
            `);

        const otpRecord =
            otpResult.recordset?.[0];

        if (!otpRecord) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid password reset request.",
            });
        }

        if (!otpRecord.VerifiedAt) {
            return res.status(400).json({
                success: false,
                message:
                    "OTP verification is required.",
            });
        }

        if (otpRecord.UsedAt) {
            return res.status(400).json({
                success: false,
                message:
                    "This password reset request has already been used.",
            });
        }

        if (
            new Date(
                otpRecord.ExpiresAt
            ).getTime() < Date.now()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Password reset session has expired.",
            });
        }

        // =================================================
        // VERIFY SHOP ADMIN + SHOP
        // =================================================

        const userResult = await db
            .request()
            .input(
                "UserID",
                sql.Int,
                decoded.userID
            )
            .input(
                "ShopID",
                sql.Int,
                decoded.shopID
            )
            .query(`
                SELECT TOP 1
                    u.UserID,
                    u.ShopID,
                    u.PasswordHash,
                    u.IsActive,
                    r.RoleName,
                    s.Status AS ShopStatus
                FROM dbo.Users u
                INNER JOIN dbo.Roles r
                    ON u.RoleID = r.RoleID
                INNER JOIN dbo.Shops s
                    ON u.ShopID = s.ShopID
                WHERE u.UserID = @UserID
                  AND u.ShopID = @ShopID
                  AND r.RoleName = 'ShopAdmin'
            `);

        const user =
            userResult.recordset?.[0];

        if (
            !user ||
            !user.IsActive ||
            (
                user.ShopStatus &&
                user.ShopStatus !== "Active"
            )
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "Shop Admin account is not available.",
            });
        }

        const newPasswordHash =
            await hashPassword(newPassword);

        // =================================================
        // UPDATE PASSWORD + MARK OTP USED
        // =================================================

        const transaction =
            new sql.Transaction(db);

        await transaction.begin();

        try {
            const request =
                new sql.Request(
                    transaction
                );

            await request
                .input(
                    "UserID",
                    sql.Int,
                    decoded.userID
                )
                .input(
                    "ShopID",
                    sql.Int,
                    decoded.shopID
                )
                .input(
                    "PasswordHash",
                    sql.NVarChar(255),
                    newPasswordHash
                )
                .query(`
                    UPDATE dbo.Users
                    SET
                        PasswordHash = @PasswordHash,
                        UpdatedAt = SYSUTCDATETIME()
                    WHERE UserID = @UserID
                      AND ShopID = @ShopID
                `);

            const otpRequest =
                new sql.Request(
                    transaction
                );

          await otpRequest
    .input(
        "OTPID",
        sql.Int,
        decoded.otpID
    )
    .input(
        "UserID",
        sql.Int,
        decoded.userID
    )
    .query(`
        UPDATE dbo.PasswordResetOTPs
        SET UsedAt = SYSUTCDATETIME()
        WHERE OTPID = @OTPID
          AND UserID = @UserID
    `);

            await transaction.commit();

        } catch (transactionError) {
            await transaction.rollback();
            throw transactionError;
        }

        return res.status(200).json({
            success: true,
            message:
                "Password reset successfully. You can now login with your new password.",
        });

    } catch (error) {
        console.error(
            "Shop Reset Password Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to reset password.",
        });
    }
};

// =====================================================
// SHOP ADMIN - CHANGE PASSWORD
// POST /api/shop-password/change
// PROTECTED - SHOP ADMIN
// =====================================================

export const changeShopPassword = async (
    req,
    res
) => {
    try {
        const {
            currentPassword,
            newPassword,
            confirmPassword,
        } = req.body;

        const userID =
            req.user?.userID;

        const shopID =
            req.user?.shopID;

        if (!userID || !shopID) {
            return res.status(401).json({
                success: false,
                message:
                    "Authentication required.",
            });
        }

        if (
            !currentPassword ||
            !newPassword ||
            !confirmPassword
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Current password, new password and confirmation are required.",
            });
        }

        if (
            newPassword !==
            confirmPassword
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "New passwords do not match.",
            });
        }

        const passwordError =
            validatePassword(newPassword);

        if (passwordError) {
            return res.status(400).json({
                success: false,
                message: passwordError,
            });
        }

        if (
            currentPassword ===
            newPassword
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "New password must be different from current password.",
            });
        }

        const db = getDB();

        const result = await db
            .request()
            .input(
                "UserID",
                sql.Int,
                userID
            )
            .input(
                "ShopID",
                sql.Int,
                shopID
            )
            .query(`
                SELECT TOP 1
                    u.UserID,
                    u.ShopID,
                    u.PasswordHash,
                    u.IsActive,
                    r.RoleName,
                    s.Status AS ShopStatus
                FROM dbo.Users u
                INNER JOIN dbo.Roles r
                    ON u.RoleID = r.RoleID
                INNER JOIN dbo.Shops s
                    ON u.ShopID = s.ShopID
                WHERE u.UserID = @UserID
                  AND u.ShopID = @ShopID
            `);

        const user =
            result.recordset?.[0];

        if (!user || !user.IsActive) {
            return res.status(403).json({
                success: false,
                message:
                    "Shop Admin account is inactive or unavailable.",
            });
        }

        if (
            String(user.RoleName)
                .toLowerCase() !==
            "shopadmin"
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "Only Shop Admin can change this password.",
            });
        }

        if (
            user.ShopStatus &&
            user.ShopStatus !== "Active"
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "Your shop is inactive.",
            });
        }

        const passwordMatches =
            await comparePassword(
                currentPassword,
                user.PasswordHash
            );

        if (!passwordMatches) {
            return res.status(400).json({
                success: false,
                message:
                    "Current password is incorrect.",
            });
        }

        const passwordHash =
            await hashPassword(newPassword);

        await db
            .request()
            .input(
                "UserID",
                sql.Int,
                userID
            )
            .input(
                "ShopID",
                sql.Int,
                shopID
            )
            .input(
                "PasswordHash",
                sql.NVarChar(255),
                passwordHash
            )
            .query(`
                UPDATE dbo.Users
                SET
                    PasswordHash = @PasswordHash,
                    UpdatedAt = SYSUTCDATETIME()
                WHERE UserID = @UserID
                  AND ShopID = @ShopID
            `);

        return res.status(200).json({
            success: true,
            message:
                "Password changed successfully.",
        });

    } catch (error) {
        console.error(
            "Shop Change Password Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to change password.",
        });
    }
};