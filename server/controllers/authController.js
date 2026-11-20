import bcrypt from "bcryptjs";
import { getDB } from "../config/db.js";
import jwt from "jsonwebtoken";

export const createSuperAdmin = async (req, res) => {
    try {
        const { fullName, email, password } = req.body;

        // Validation
        if (!fullName || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Full name, email and password are required"
            });
        }

        const db = getDB();

        // Check if SuperAdmin role exists
        const roleResult = await db.request()
            .input("RoleName", "SuperAdmin")
            .query(`
                SELECT RoleID
                FROM dbo.Roles
                WHERE RoleName = @RoleName
            `);

        if (roleResult.recordset.length === 0) {
            return res.status(400).json({
                success: false,
                message: "SuperAdmin role not found"
            });
        }

        const roleID = roleResult.recordset[0].RoleID;

        // Anyone may create the first super admin (initial setup). After that, only a signed-in
        // super admin can add another one.
        const existingSuperAdmins = await db.request()
            .input("RoleID", roleID)
            .query("SELECT COUNT(*) AS Total FROM dbo.Users WHERE RoleID = @RoleID");

        if (existingSuperAdmins.recordset[0].Total > 0 && !req.user) {
            return res.status(403).json({
                success: false,
                message: "A super admin already exists. Sign in as a super admin to add another."
            });
        }

        // Check existing email
        const existingUser = await db.request()
            .input("Email", email)
            .query(`
                SELECT UserID
                FROM dbo.Users
                WHERE Email = @Email
            `);

        if (existingUser.recordset.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Email already exists"
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create Super Admin
        await db.request()
            .input("RoleID", roleID)
            .input("FullName", fullName)
            .input("Email", email)
            .input("PasswordHash", passwordHash)
            .query(`
                INSERT INTO dbo.Users
                (
                    RoleID,
                    FullName,
                    Email,
                    PasswordHash
                )
                VALUES
                (
                    @RoleID,
                    @FullName,
                    @Email,
                    @PasswordHash
                )
            `);

        res.status(201).json({
            success: true,
            message: "Super Admin created successfully"
        });

    } catch (error) {
        console.error("Create Super Admin Error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create Super Admin"
        });
    }
};


export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const db = getDB();

        // Find user
        const normalizedEmail = email.trim().toLowerCase();

        const result = await db.request()
            .input("Email", normalizedEmail)
            .query(`
                SELECT
                    u.UserID,
                    u.ShopID,
                    u.RoleID,
                    u.FullName,
                    u.Email,
                    u.PasswordHash,
                    u.IsActive,
                    r.RoleName
                FROM dbo.Users u
                INNER JOIN dbo.Roles r
                    ON u.RoleID = r.RoleID
                WHERE u.Email = @Email
                    AND r.RoleName = 'SuperAdmin'
            `);

        if (result.recordset.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const user = result.recordset[0];

        if (!user.IsActive) {
            return res.status(403).json({
                success: false,
                message: "Your account is inactive"
            });
        }

        // Check password
        const passwordMatch = await bcrypt.compare(
            password,
            user.PasswordHash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Create JWT
        const secret = process.env.JWT_SECRET;

        if (!secret) {
            console.error("JWT_SECRET is missing from .env");
            return res.status(500).json({
                success: false,
                message: "Server authentication configuration is missing"
            });
        }

        const token = jwt.sign(
            {
                userID: user.UserID,
                roleID: user.RoleID,
                role: user.RoleName,
                shopID: user.ShopID || null
            },
            secret,
            {
                expiresIn: "1d"
            }
        );

        res.json({
            success: true,
            message: "Login successful",
            token,
            user: {
                userID: user.UserID,
                fullName: user.FullName,
                email: user.Email,
                role: user.RoleName,
                shopID: user.ShopID || null
            }
        });

    } catch (error) {
        console.error("Login Error:", error);

        if (error.message === "Database is not connected") {
            return res.status(503).json({
                success: false,
                message: "Database unavailable. Check the SQL Server connection."
            });
        }

        res.status(500).json({
            success: false,
            message: "Login failed"
        });
    }
};

// =====================================================
// GET SUPER ADMIN PROFILE
// =====================================================

export const getSuperAdminProfile = async (req, res) => {
    try {
        const userID = req.user?.userID;

        if (!userID) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        const db = getDB();

        const result = await db
            .request()
            .input("UserID", userID)
            .query(`
                SELECT
                    u.UserID,
                    u.FullName,
                    u.Email,
                    u.Phone,
                    u.IsActive,
                    u.LastLoginAt,
                    u.CreatedAt,
                    u.UpdatedAt,
                    r.RoleName

                FROM dbo.Users u

                INNER JOIN dbo.Roles r
                    ON u.RoleID = r.RoleID

                WHERE
                    u.UserID = @UserID
                    AND r.RoleName = 'SuperAdmin'
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Super Admin profile not found."
            });
        }

        const user = result.recordset[0];

        return res.status(200).json({
            success: true,

            data: {
                user: {
                    userID: user.UserID,
                    fullName: user.FullName,
                    email: user.Email,
                    phone: user.Phone || "",
                    role: user.RoleName,
                    isActive: user.IsActive,
                    lastLoginAt: user.LastLoginAt,
                    createdAt: user.CreatedAt,
                    updatedAt: user.UpdatedAt
                }
            }
        });

    } catch (error) {
        console.error(
            "Get Super Admin Profile Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to load profile."
        });
    }
};


// =====================================================
// UPDATE SUPER ADMIN PROFILE
// =====================================================

export const updateSuperAdminProfile = async (req, res) => {
    try {
        const userID = req.user?.userID;

        const {
            fullName,
            email,
            phone
        } = req.body;

        // =================================================
        // AUTH VALIDATION
        // =================================================

        if (!userID) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        // =================================================
        // INPUT VALIDATION
        // =================================================

        if (!fullName?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Full name is required."
            });
        }

        if (!email?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Email is required."
            });
        }

        const normalizedEmail =
            email.trim().toLowerCase();

        const db = getDB();

        // =================================================
        // VERIFY SUPER ADMIN
        // =================================================

        const userResult = await db
            .request()
            .input("UserID", userID)
            .query(`
                SELECT
                    u.UserID,
                    u.Email,
                    r.RoleName

                FROM dbo.Users u

                INNER JOIN dbo.Roles r
                    ON u.RoleID = r.RoleID

                WHERE
                    u.UserID = @UserID
                    AND r.RoleName = 'SuperAdmin'
            `);

        if (userResult.recordset.length === 0) {
            return res.status(403).json({
                success: false,
                message: "Super Admin access required."
            });
        }

        // =================================================
        // CHECK EMAIL DUPLICATE
        // =================================================

        const emailCheck = await db
            .request()
            .input("Email", normalizedEmail)
            .input("UserID", userID)
            .query(`
                SELECT UserID

                FROM dbo.Users

                WHERE
                    Email = @Email
                    AND UserID <> @UserID
            `);

        if (emailCheck.recordset.length > 0) {
            return res.status(409).json({
                success: false,
                message: "This email is already being used."
            });
        }

        // =================================================
        // UPDATE PROFILE
        // =================================================

        await db
            .request()
            .input("UserID", userID)
            .input("FullName", fullName.trim())
            .input("Email", normalizedEmail)
            .input(
                "Phone",
                phone?.trim() || null
            )
            .query(`
                UPDATE dbo.Users

                SET
                    FullName = @FullName,
                    Email = @Email,
                    Phone = @Phone,
                    UpdatedAt = SYSDATETIME()

                WHERE
                    UserID = @UserID
            `);

        // =================================================
        // GET UPDATED USER
        // =================================================

        const updatedResult = await db
            .request()
            .input("UserID", userID)
            .query(`
                SELECT
                    u.UserID,
                    u.FullName,
                    u.Email,
                    u.Phone,
                    u.IsActive,
                    u.LastLoginAt,
                    u.CreatedAt,
                    u.UpdatedAt,
                    r.RoleName

                FROM dbo.Users u

                INNER JOIN dbo.Roles r
                    ON u.RoleID = r.RoleID

                WHERE
                    u.UserID = @UserID
                    AND r.RoleName = 'SuperAdmin'
            `);

        const updatedUser =
            updatedResult.recordset[0];

        return res.status(200).json({
            success: true,

            message:
                "Profile updated successfully.",

            data: {
                user: {
                    userID:
                        updatedUser.UserID,

                    fullName:
                        updatedUser.FullName,

                    email:
                        updatedUser.Email,

                    phone:
                        updatedUser.Phone || "",

                    role:
                        updatedUser.RoleName,

                    isActive:
                        updatedUser.IsActive,

                    lastLoginAt:
                        updatedUser.LastLoginAt,

                    createdAt:
                        updatedUser.CreatedAt,

                    updatedAt:
                        updatedUser.UpdatedAt
                }
            }
        });

    } catch (error) {
        console.error(
            "Update Super Admin Profile Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to update profile."
        });
    }
};