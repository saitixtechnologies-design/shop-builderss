import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { getDB } from "../config/db.js";

/* =========================================================
   SHOP ADMIN LOGIN
   POST /api/shop-auth/login
   ========================================================= */

export const shopAdminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        /* =========================
           VALIDATION
        ========================= */

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        const pool = getDB();

        /* =========================
           FIND SHOP ADMIN
        ========================= */

        const result = await pool
            .request()
            .input("Email", email.trim().toLowerCase())
            .query(`
                SELECT
                    u.UserID,
                    u.ShopID,
                    u.FullName,
                    u.Email,
                    u.PasswordHash,
                    u.Phone,
                    u.IsActive,

                    r.RoleID,
                    r.RoleName,

                    s.ShopName,
                    s.ShopSlug,
                    s.ShopType,
                    s.LogoURL,
                    s.Status AS ShopStatus

                FROM dbo.Users u

                INNER JOIN dbo.Roles r
                    ON u.RoleID = r.RoleID

                INNER JOIN dbo.Shops s
                    ON u.ShopID = s.ShopID

                WHERE
                    u.Email = @Email
                    AND r.RoleName = 'ShopAdmin'
            `);

        if (result.recordset.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const user = result.recordset[0];

        /* =========================
           USER ACTIVE CHECK
        ========================= */

        if (!user.IsActive) {
            return res.status(403).json({
                success: false,
                message: "Your account is inactive."
            });
        }

        /* =========================
           SHOP ACTIVE CHECK
        ========================= */

        if (
            user.ShopStatus &&
            user.ShopStatus !== "Active"
        ) {
            return res.status(403).json({
                success: false,
                message: "Your shop is inactive."
            });
        }

        /* =========================
           PASSWORD CHECK
        ========================= */

        const passwordMatched =
            await bcrypt.compare(
                password,
                user.PasswordHash
            );

        if (!passwordMatched) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        /* =========================
           UPDATE LAST LOGIN
        ========================= */

        await pool
            .request()
            .input("UserID", user.UserID)
            .query(`
                UPDATE dbo.Users
                SET
                    LastLoginAt = SYSDATETIME(),
                    UpdatedAt = SYSDATETIME()
                WHERE UserID = @UserID
            `);

        /* =========================
           JWT
        ========================= */

        const secret = process.env.JWT_SECRET;

        if (!secret) {
            console.error(
                "JWT_SECRET is missing from .env"
            );

            return res.status(500).json({
                success: false,
                message: "Server authentication configuration is missing."
            });
        }

        const token = jwt.sign(
            {
                userID: user.UserID,
                shopID: user.ShopID,
                shopType: user.ShopType || "Ecommerce",
                role: user.RoleName,
                email: user.Email
            },
            secret,
            {
                // Keep the Shop Admin signed in across routine browser refreshes
                // and work sessions while retaining a finite, verifiable token.
                expiresIn: "7d"
            }
        );

        /* =========================
           SUCCESS
        ========================= */

        return res.status(200).json({
            success: true,
            message: "Shop Admin login successful.",

            data: {
                token,

                user: {
                    userID: user.UserID,
                    fullName: user.FullName,
                    email: user.Email,
                    phone: user.Phone,
                    role: user.RoleName,

                    shopID: user.ShopID,

                    shop: {
                        shopID: user.ShopID,
                        shopName: user.ShopName,
                        shopSlug: user.ShopSlug,
                        shopType: user.ShopType || "Ecommerce",
                        logoURL: user.LogoURL,
                        status: user.ShopStatus
                    }
                }
            }
        });

    } catch (error) {

        console.error(
            "Shop Admin Login Error:",
            error
        );

        if (error.message === "Database is not connected") {
            return res.status(503).json({
                success: false,
                message: "Database unavailable. Check the SQL Server connection."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to login.",
            error: error.message
        });
    }
};
