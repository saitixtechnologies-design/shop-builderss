import sql from "mssql";
import { getDB } from "../config/db.js";

// =====================================================
// CREATE BRAND
// =====================================================
export const createBrand = async (req, res) => {
    try {
        const {
            shopID,
            brandName,
            slug,
            logoURL,
            description,
            isActive
        } = req.body;

        if (!shopID || !brandName?.trim() || !slug?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Shop, brand name and slug are required."
            });
        }

        const pool = getDB();

        // Check shop
        const shopResult = await pool
            .request()
            .input("ShopID", sql.Int, Number(shopID))
            .query(`
                SELECT ShopID
                FROM dbo.Shops
                WHERE ShopID = @ShopID
            `);

        if (shopResult.recordset.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Shop not found."
            });
        }

        // Check duplicate slug for same shop
        const duplicateResult = await pool
            .request()
            .input("ShopID", sql.Int, Number(shopID))
            .input("Slug", slug.trim())
            .query(`
                SELECT BrandID
                FROM dbo.Brands
                WHERE ShopID = @ShopID
                AND Slug = @Slug
            `);

        if (duplicateResult.recordset.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Brand slug already exists for this shop."
            });
        }

        const result = await pool
            .request()
            .input("ShopID", sql.Int, Number(shopID))
            .input("BrandName", brandName.trim())
            .input("Slug", slug.trim())
            .input("LogoURL", logoURL?.trim() || null)
            .input("Description", description?.trim() || null)
            .input(
                "IsActive",
                isActive !== undefined
                    ? Boolean(isActive)
                    : true
            )
            .query(`
                INSERT INTO dbo.Brands
                (
                    ShopID,
                    BrandName,
                    Slug,
                    LogoURL,
                    Description,
                    IsActive,
                    CreatedAt,
                    UpdatedAt
                )
                OUTPUT
                    INSERTED.BrandID,
                    INSERTED.ShopID,
                    INSERTED.BrandName,
                    INSERTED.Slug,
                    INSERTED.LogoURL,
                    INSERTED.Description,
                    INSERTED.IsActive,
                    INSERTED.CreatedAt,
                    INSERTED.UpdatedAt
                VALUES
                (
                    @ShopID,
                    @BrandName,
                    @Slug,
                    @LogoURL,
                    @Description,
                    @IsActive,
                    SYSDATETIME(),
                    SYSDATETIME()
                )
            `);

        return res.status(201).json({
            success: true,
            message: "Brand created successfully.",
            data: result.recordset[0]
        });

    } catch (error) {
        console.error("Create Brand Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create brand.",
            error: error.message
        });
    }
};


// =====================================================
// GET ALL BRANDS
// =====================================================
export const getAllBrands = async (req, res) => {
    try {
        const { shopID } = req.query;

        const pool = getDB();

        let query = `
            SELECT
                BrandID,
                ShopID,
                BrandName,
                Slug,
                LogoURL,
                Description,
                IsActive,
                CreatedAt,
                UpdatedAt
            FROM dbo.Brands
        `;

        const request = pool.request();

        if (shopID) {
            query += `
                WHERE ShopID = @ShopID
            `;

            request.input(
                "ShopID",
                sql.Int,
                Number(shopID)
            );
        }

        query += `
            ORDER BY BrandID DESC
        `;

        const result = await request.query(query);

        return res.status(200).json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error("Get Brands Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch brands.",
            error: error.message
        });
    }
};


// =====================================================
// GET BRAND BY ID
// =====================================================
export const getBrandById = async (req, res) => {
    try {
        const { id } = req.params;

        const pool = getDB();

        const result = await pool
            .request()
            .input(
                "BrandID",
                sql.Int,
                Number(id)
            )
            .query(`
                SELECT
                    BrandID,
                    ShopID,
                    BrandName,
                    Slug,
                    LogoURL,
                    Description,
                    IsActive,
                    CreatedAt,
                    UpdatedAt
                FROM dbo.Brands
                WHERE BrandID = @BrandID
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Brand not found."
            });
        }

        return res.status(200).json({
            success: true,
            data: result.recordset[0]
        });

    } catch (error) {
        console.error("Get Brand Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch brand.",
            error: error.message
        });
    }
};


// =====================================================
// UPDATE BRAND
// =====================================================
export const updateBrand = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            shopID,
            brandName,
            slug,
            logoURL,
            description,
            isActive
        } = req.body;

        if (!shopID || !brandName?.trim() || !slug?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Shop, brand name and slug are required."
            });
        }

        const pool = getDB();

        // Check brand
        const brandResult = await pool
            .request()
            .input(
                "BrandID",
                sql.Int,
                Number(id)
            )
            .query(`
                SELECT BrandID, ShopID
                FROM dbo.Brands
                WHERE BrandID = @BrandID
            `);

        if (brandResult.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Brand not found."
            });
        }

        // Check duplicate slug
        const duplicateResult = await pool
            .request()
            .input(
                "BrandID",
                sql.Int,
                Number(id)
            )
            .input(
                "ShopID",
                sql.Int,
                Number(shopID)
            )
            .input(
                "Slug",
                slug.trim()
            )
            .query(`
                SELECT BrandID
                FROM dbo.Brands
                WHERE ShopID = @ShopID
                AND Slug = @Slug
                AND BrandID <> @BrandID
            `);

        if (duplicateResult.recordset.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Brand slug already exists for this shop."
            });
        }

        const result = await pool
            .request()
            .input(
                "BrandID",
                sql.Int,
                Number(id)
            )
            .input(
                "ShopID",
                sql.Int,
                Number(shopID)
            )
            .input(
                "BrandName",
                brandName.trim()
            )
            .input(
                "Slug",
                slug.trim()
            )
            .input(
                "LogoURL",
                logoURL?.trim() || null
            )
            .input(
                "Description",
                description?.trim() || null
            )
            .input(
                "IsActive",
                isActive !== undefined
                    ? Boolean(isActive)
                    : true
            )
            .query(`
                UPDATE dbo.Brands
                SET
                    ShopID = @ShopID,
                    BrandName = @BrandName,
                    Slug = @Slug,
                    LogoURL = @LogoURL,
                    Description = @Description,
                    IsActive = @IsActive,
                    UpdatedAt = SYSDATETIME()
                OUTPUT
                    INSERTED.BrandID,
                    INSERTED.ShopID,
                    INSERTED.BrandName,
                    INSERTED.Slug,
                    INSERTED.LogoURL,
                    INSERTED.Description,
                    INSERTED.IsActive,
                    INSERTED.CreatedAt,
                    INSERTED.UpdatedAt
                WHERE BrandID = @BrandID
            `);

        return res.status(200).json({
            success: true,
            message: "Brand updated successfully.",
            data: result.recordset[0]
        });

    } catch (error) {
        console.error("Update Brand Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update brand.",
            error: error.message
        });
    }
};


// =====================================================
// DELETE BRAND
// =====================================================
export const deleteBrand = async (req, res) => {
    try {
        const { id } = req.params;

        const pool = getDB();

        const brandResult = await pool
            .request()
            .input(
                "BrandID",
                sql.Int,
                Number(id)
            )
            .query(`
                SELECT BrandID
                FROM dbo.Brands
                WHERE BrandID = @BrandID
            `);

        if (brandResult.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Brand not found."
            });
        }

        // Prevent deleting a brand already used by products
        const productResult = await pool
            .request()
            .input(
                "BrandID",
                sql.Int,
                Number(id)
            )
            .query(`
                SELECT TOP 1 ProductID
                FROM dbo.Products
                WHERE BrandID = @BrandID
            `);

        if (productResult.recordset.length > 0) {
            return res.status(409).json({
                success: false,
                message:
                    "This brand is already used by a product and cannot be deleted."
            });
        }

        await pool
            .request()
            .input(
                "BrandID",
                sql.Int,
                Number(id)
            )
            .query(`
                DELETE FROM dbo.Brands
                WHERE BrandID = @BrandID
            `);

        return res.status(200).json({
            success: true,
            message: "Brand deleted successfully."
        });

    } catch (error) {
        console.error("Delete Brand Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete brand.",
            error: error.message
        });
    }
};


// =====================================================
// TOGGLE ACTIVE / INACTIVE
// =====================================================
export const toggleBrandStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const pool = getDB();

        const result = await pool
            .request()
            .input(
                "BrandID",
                sql.Int,
                Number(id)
            )
            .query(`
                UPDATE dbo.Brands
                SET
                    IsActive =
                        CASE
                            WHEN IsActive = 1 THEN 0
                            ELSE 1
                        END,
                    UpdatedAt = SYSDATETIME()
                OUTPUT
                    INSERTED.BrandID,
                    INSERTED.ShopID,
                    INSERTED.BrandName,
                    INSERTED.Slug,
                    INSERTED.LogoURL,
                    INSERTED.Description,
                    INSERTED.IsActive,
                    INSERTED.CreatedAt,
                    INSERTED.UpdatedAt
                WHERE BrandID = @BrandID
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Brand not found."
            });
        }

        return res.status(200).json({
            success: true,
            message: result.recordset[0].IsActive
                ? "Brand activated successfully."
                : "Brand deactivated successfully.",
            data: result.recordset[0]
        });

    } catch (error) {
        console.error("Toggle Brand Status Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update brand status.",
            error: error.message
        });
    }
};
