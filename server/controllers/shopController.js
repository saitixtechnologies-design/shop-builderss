import sql from "mssql";
import bcrypt from "bcryptjs";

import { getDB } from "../config/db.js";

const templateOptionsByType = { Ecommerce: ["editorial", "minimal", "boutique", "bold"], Service: ["studio", "serene", "modern"] };
const defaultTemplateByType = { Ecommerce: "editorial", Service: "studio" };


// =====================================================
// CREATE SHOP
// =====================================================

export const createShop = async (req, res) => {
    try {
        const {
            shopName,
            shopSlug,
            shopType = "Ecommerce",
            websiteTemplate,
            ownerName,
            email,
            phone,
            password
        } = req.body;

        /* =====================================================
           VALIDATION
        ===================================================== */

        if (
            !shopName ||
            !shopSlug ||
            !ownerName ||
            !email ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Shop name, shop slug, owner name, email and password are required."
            });
        }

        const normalizedShopType = String(shopType).trim();
        if (!["Ecommerce", "Service"].includes(normalizedShopType)) {
            return res.status(400).json({
                success: false,
                message: "Choose a valid shop type."
            });
        }

        const websiteTemplateId = String(websiteTemplate || defaultTemplateByType[normalizedShopType]).trim().toLowerCase();
        if (!templateOptionsByType[normalizedShopType].includes(websiteTemplateId)) {
            return res.status(400).json({ success: false, message: "Choose a template designed for this shop type." });
        }

        const db = getDB();

        /* =====================================================
           CHECK SHOP SLUG
        ===================================================== */

        const existingShop = await db
            .request()
            .input("ShopSlug", shopSlug.trim())
            .query(`
                SELECT ShopID
                FROM dbo.Shops
                WHERE ShopSlug = @ShopSlug
            `);

        if (existingShop.recordset.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Shop slug already exists."
            });
        }

        /* =====================================================
           CHECK EMAIL
        ===================================================== */

        const existingUser = await db
            .request()
            .input("Email", email.trim())
            .query(`
                SELECT UserID
                FROM dbo.Users
                WHERE Email = @Email
            `);

        if (existingUser.recordset.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Email already exists."
            });
        }

        /* =====================================================
           GET SHOP ADMIN ROLE
        ===================================================== */

        const roleResult = await db
            .request()
            .input("RoleName", "ShopAdmin")
            .query(`
                SELECT RoleID
                FROM dbo.Roles
                WHERE RoleName = @RoleName
            `);

        if (roleResult.recordset.length === 0) {
            return res.status(500).json({
                success: false,
                message: "ShopAdmin role not found."
            });
        }

        const roleID = roleResult.recordset[0].RoleID;

        /* =====================================================
           HASH PASSWORD
        ===================================================== */

        const passwordHash = await bcrypt.hash(password, 10);

        /* =====================================================
           CREATE SHOP
        ===================================================== */

        const shopResult = await db
            .request()
            .input("ShopName", shopName.trim())
            .input("ShopSlug", shopSlug.trim())
            .input("OwnerName", ownerName.trim())
            .input("Email", email.trim())
            .input("Phone", phone?.trim() || null)
            .input("ShopType", normalizedShopType)
            .input("WebsiteTemplate", websiteTemplateId)
            .query(`
                INSERT INTO dbo.Shops
                (
                    ShopName,
                    ShopSlug,
                    OwnerName,
                    Email,
                    Phone,
                    ShopType,
                    WebsiteTemplate,
                    Status,
                    CreatedAt,
                    UpdatedAt
                )
                VALUES
                (
                    @ShopName,
                    @ShopSlug,
                    @OwnerName,
                    @Email,
                    @Phone,
                    @ShopType,
                    @WebsiteTemplate,
                    'Active',
                    SYSDATETIME(),
                    SYSDATETIME()
                )
            `);

        /* =====================================================
           GET NEW SHOP ID
        ===================================================== */

        const newShopResult = await db
            .request()
            .input("ShopSlug", shopSlug.trim())
            .query(`
                SELECT TOP 1
                    ShopID
                FROM dbo.Shops
                WHERE ShopSlug = @ShopSlug
                ORDER BY ShopID DESC
            `);

        if (
            !newShopResult.recordset ||
            newShopResult.recordset.length === 0
        ) {
            return res.status(500).json({
                success: false,
                message: "Shop created but ShopID could not be found."
            });
        }

        const shopID =
            newShopResult.recordset[0].ShopID;

        /* =====================================================
           CREATE SHOP ADMIN
        ===================================================== */

        const userResult = await db
            .request()
            .input("ShopID", shopID)
            .input("RoleID", roleID)
            .input("FullName", ownerName.trim())
            .input("Email", email.trim())
            .input("PasswordHash", passwordHash)
            .input("Phone", phone?.trim() || null)
            .query(`
                INSERT INTO dbo.Users
                (
                    ShopID,
                    RoleID,
                    FullName,
                    Email,
                    PasswordHash,
                    Phone,
                    IsActive,
                    CreatedAt,
                    UpdatedAt
                )
                VALUES
                (
                    @ShopID,
                    @RoleID,
                    @FullName,
                    @Email,
                    @PasswordHash,
                    @Phone,
                    1,
                    SYSDATETIME(),
                    SYSDATETIME()
                )
            `);

        /* =====================================================
           GET CREATED USER
        ===================================================== */

        const createdUser = await db
            .request()
            .input("Email", email.trim())
            .query(`
                SELECT TOP 1
                    UserID
                FROM dbo.Users
                WHERE Email = @Email
                ORDER BY UserID DESC
            `);

        const userID =
            createdUser.recordset.length > 0
                ? createdUser.recordset[0].UserID
                : null;

        /* =====================================================
           SUCCESS
        ===================================================== */

        return res.status(201).json({
            success: true,
            message:
                "Shop and Shop Admin created successfully.",
            data: {
                shopID: shopID,
                userID: userID,
                role: "ShopAdmin"
            }
        });

    } catch (error) {

        console.error("=================================");
        console.error("CREATE SHOP ERROR");
        console.error(error);
        console.error("=================================");

        return res.status(500).json({
            success: false,
            message: "Failed to create shop.",
            error: error.message
        });
    }
};



// =====================================================
// GET ALL SHOPS
// =====================================================

export const getAllShops = async (req, res) => {

    try {

        const pool = getDB();


        const result =
            await pool
                .request()
                .query(`
                    SELECT
                        ShopID,
                        ShopName,
                        ShopSlug,
                        OwnerName,
                        Email,
                        Phone,
                        LogoURL,
                        ShopType,
                        WebsiteTemplate,
                        Status,
                        CreatedAt,
                        UpdatedAt

                    FROM dbo.Shops

                    ORDER BY ShopID DESC
                `);


        return res.status(200).json({

            success: true,

            data:
                result.recordset

        });


    } catch (error) {

        console.error(
            "Get Shops Error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to fetch shops.",

            error:
                error.message

        });

    }

};



// =====================================================
// GET SINGLE SHOP
// =====================================================

export const getShopById = async (req, res) => {

    try {

        const { id } = req.params;

        const pool = getDB();


        const result =
            await pool
                .request()

                .input(
                    "ShopID",
                    id
                )

                .query(`
                    SELECT
                        ShopID,
                        ShopName,
                        ShopSlug,
                        OwnerName,
                        Email,
                        Phone,
                        LogoURL,
                        ShopType,
                        WebsiteTemplate,
                        Status,
                        CreatedAt,
                        UpdatedAt

                    FROM dbo.Shops

                    WHERE ShopID = @ShopID
                `);


        if (
            result.recordset.length === 0
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "Shop not found."

            });

        }


        return res.status(200).json({

            success: true,

            data:
                result.recordset[0]

        });


    } catch (error) {

        console.error(
            "Get Shop Error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to fetch shop.",

            error:
                error.message

        });

    }

};



// =====================================================
// UPDATE SHOP
// =====================================================

export const updateShop = async (req, res) => {

    try {

        const { id } = req.params;


        const {
            shopName,
            shopSlug,
            ownerName,
            email,
            phone,
            status,
            websiteTemplate
        } = req.body;


        // =================================================
        // VALIDATION
        // =================================================

        if (
            !shopName ||
            !shopSlug ||
            !ownerName ||
            !email
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Shop name, shop slug, owner name and email are required."

            });

        }


        const pool = getDB();


        // =================================================
        // CHECK SHOP
        // =================================================

        const shopCheck =
            await pool
                .request()

                .input(
                    "ShopID",
                    id
                )

                .query(`
                    SELECT ShopID, ShopType, WebsiteTemplate
                    FROM dbo.Shops
                    WHERE ShopID = @ShopID
                `);


        if (
            shopCheck.recordset.length === 0
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "Shop not found."

            });

        }


        const currentShop = shopCheck.recordset[0];
        const selectedTemplate = String(websiteTemplate || currentShop.WebsiteTemplate || defaultTemplateByType[currentShop.ShopType]).trim().toLowerCase();
        if (!templateOptionsByType[currentShop.ShopType]?.includes(selectedTemplate)) {
            return res.status(400).json({ success: false, message: "Choose a template designed for this shop type." });
        }

        // =================================================
        // CHECK DUPLICATE SLUG
        // =================================================

        const slugCheck =
            await pool
                .request()

                .input(
                    "ShopID",
                    id
                )

                .input(
                    "ShopSlug",
                    shopSlug.trim()
                )

                .query(`
                    SELECT ShopID
                    FROM dbo.Shops

                    WHERE
                        ShopSlug = @ShopSlug
                        AND ShopID <> @ShopID
                `);


        if (
            slugCheck.recordset.length > 0
        ) {

            return res.status(409).json({

                success: false,

                message:
                    "This shop slug is already being used."

            });

        }


        // =================================================
        // CHECK EMAIL
        // =================================================

        const emailCheck =
            await pool
                .request()

                .input(
                    "ShopID",
                    id
                )

                .input(
                    "Email",
                    email.trim()
                )

                .query(`
                    SELECT UserID
                    FROM dbo.Users

                    WHERE
                        Email = @Email
                        AND ShopID <> @ShopID
                `);


        if (
            emailCheck.recordset.length > 0
        ) {

            return res.status(409).json({

                success: false,

                message:
                    "This email is already being used."

            });

        }


        // =================================================
        // UPDATE SHOP
        // =================================================

        await pool
            .request()

            .input(
                "ShopID",
                id
            )

            .input(
                "ShopName",
                shopName.trim()
            )

            .input(
                "ShopSlug",
                shopSlug.trim()
            )

            .input(
                "OwnerName",
                ownerName.trim()
            )

            .input(
                "Email",
                email.trim()
            )

            .input(
                "Phone",
                phone?.trim() || null
            )

            .input(
                "Status",
                status || "Active"
            )
            .input("WebsiteTemplate", selectedTemplate)

            .query(`
                UPDATE dbo.Shops

                SET
                    ShopName = @ShopName,
                    ShopSlug = @ShopSlug,
                    OwnerName = @OwnerName,
                    Email = @Email,
                    Phone = @Phone,
                    Status = @Status,
                    UpdatedAt = SYSDATETIME()

                WHERE
                    ShopID = @ShopID
            `);


        // =================================================
        // UPDATE SHOP ADMIN
        // =================================================

        await pool
            .request()

            .input(
                "ShopID",
                id
            )

            .input(
                "FullName",
                ownerName.trim()
            )

            .input(
                "Email",
                email.trim()
            )

            .input(
                "Phone",
                phone?.trim() || null
            )

            .input(
                "IsActive",
                status === "Active" ? 1 : 0
            )

            .query(`
                UPDATE dbo.Users

                SET
                    FullName = @FullName,
                    Email = @Email,
                    Phone = @Phone,
                    IsActive = @IsActive,
                    UpdatedAt = SYSDATETIME()

                WHERE
                    ShopID = @ShopID
            `);


        return res.status(200).json({

            success: true,

            message:
                "Shop updated successfully."

        });


    } catch (error) {

        console.error(
            "Update Shop Error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to update shop.",

            error:
                error.message

        });

    }

};



// =====================================================
// TOGGLE SHOP STATUS
// =====================================================

export const toggleShopStatus = async (req, res) => {

    try {

        const { id } = req.params;

        const pool = getDB();


        // =================================================
        // GET CURRENT STATUS
        // =================================================

        const result =
            await pool
                .request()

                .input(
                    "ShopID",
                    id
                )

                .query(`
                    SELECT
                        Status

                    FROM dbo.Shops

                    WHERE
                        ShopID = @ShopID
                `);


        if (
            result.recordset.length === 0
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "Shop not found."

            });

        }


        const currentStatus =
            result.recordset[0].Status;


        const newStatus =
            currentStatus === "Active"
                ? "Inactive"
                : "Active";


        // =================================================
        // UPDATE SHOP
        // =================================================

        await pool
            .request()

            .input(
                "ShopID",
                id
            )

            .input(
                "Status",
                newStatus
            )

            .query(`
                UPDATE dbo.Shops

                SET
                    Status = @Status,
                    UpdatedAt = SYSDATETIME()

                WHERE
                    ShopID = @ShopID
            `);


        // =================================================
        // UPDATE SHOP ADMIN
        // =================================================

        await pool
            .request()

            .input(
                "ShopID",
                id
            )

            .input(
                "IsActive",
                newStatus === "Active"
                    ? 1
                    : 0
            )

            .query(`
                UPDATE dbo.Users

                SET
                    IsActive = @IsActive,
                    UpdatedAt = SYSDATETIME()

                WHERE
                    ShopID = @ShopID
            `);


        return res.status(200).json({

            success: true,

            message:
                `Shop ${newStatus.toLowerCase()} successfully.`,

            status:
                newStatus

        });


    } catch (error) {

        console.error(
            "Toggle Shop Status Error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to update shop status.",

            error:
                error.message

        });

    }

};



// =====================================================
// DELETE SHOP
// =====================================================

export const deleteShop = async (req, res) => {

    try {

        const { id } = req.params;

        const pool = getDB();


        // =================================================
        // TRANSACTION
        // =================================================

        const transaction =
            new sql.Transaction(pool);

        await transaction.begin();


        try {

            // =================================================
            // DELETE SHOP ADMIN
            // =================================================

            await transaction
                .request()

                .input(
                    "ShopID",
                    id
                )

                .query(`
                    DELETE FROM dbo.Users

                    WHERE
                        ShopID = @ShopID
                `);


            // =================================================
            // DELETE SHOP
            // =================================================

            const result =
                await transaction
                    .request()

                    .input(
                        "ShopID",
                        id
                    )

                    .query(`
                        DELETE FROM dbo.Shops

                        WHERE
                            ShopID = @ShopID
                    `);


            // =================================================
            // CHECK
            // =================================================

            if (
                result.rowsAffected[0] === 0
            ) {

                await transaction.rollback();

                return res.status(404).json({

                    success: false,

                    message:
                        "Shop not found."

                });

            }


            // =================================================
            // COMMIT
            // =================================================

            await transaction.commit();


            return res.status(200).json({

                success: true,

                message:
                    "Shop deleted successfully."

            });


        } catch (transactionError) {

            try {

                await transaction.rollback();

            } catch (rollbackError) {

                console.error(
                    "Rollback Error:",
                    rollbackError.message
                );

            }

            throw transactionError;

        }


    } catch (error) {

        console.error(
            "Delete Shop Error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Shop could not be deleted. It may have related records.",

            error:
                error.message

        });

    }

};
