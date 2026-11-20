import { getDB } from "../config/db.js";

// =====================================================
// GET ALL SHOP BRANDS
// GET /api/shop-brands
// =====================================================

export const getShopBrands = async (req, res) => {
    try {
        const shopID =
            req.user?.shopID ??
            req.user?.ShopID ??
            req.user?.shopId ??
            req.user?.ShopId ??
            null;

        if (!shopID) {
            return res.status(403).json({
                success: false,
                message: "Shop ID not found in authentication token."
            });
        }

        const db = getDB();

        const result = await db
            .request()
            .input("ShopID", Number(shopID))
            .query(`
                SELECT
                    BrandID,
                    ShopID,
                    BrandName,
                    Slug,
                    Description,
                    LogoURL,
                    IsActive,
                    CreatedAt,
                    UpdatedAt
                FROM dbo.Brands
                WHERE ShopID = @ShopID
                ORDER BY BrandID DESC
            `);

        return res.status(200).json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error("Get Shop Brands Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch shop brands.",
            error: error.message
        });
    }
};


// =====================================================
// GET SINGLE SHOP BRAND
// GET /api/shop-brands/:id
// =====================================================

export const getShopBrandById = async (req, res) => {
    try {
        const shopID =
            req.user?.shopID ??
            req.user?.ShopID ??
            req.user?.shopId ??
            req.user?.ShopId ??
            null;

        const brandID = Number(req.params.id);

        if (!shopID) {
            return res.status(403).json({
                success: false,
                message: "Shop ID not found in authentication token."
            });
        }

        if (!brandID) {
            return res.status(400).json({
                success: false,
                message: "Brand ID is required."
            });
        }

        const db = getDB();

        const result = await db
            .request()
            .input("BrandID", brandID)
            .input("ShopID", Number(shopID))
            .query(`
                SELECT
                    BrandID,
                    ShopID,
                    BrandName,
                    Slug,
                    Description,
                    LogoURL,
                    IsActive,
                    CreatedAt,
                    UpdatedAt
                FROM dbo.Brands
                WHERE BrandID = @BrandID
                AND ShopID = @ShopID
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Brand not found for this shop."
            });
        }

        return res.status(200).json({
            success: true,
            data: result.recordset[0]
        });

    } catch (error) {
        console.error("Get Shop Brand Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch shop brand.",
            error: error.message
        });
    }
};


// =====================================================
// CREATE SHOP BRAND
// POST /api/shop-brands
// =====================================================

export const createShopBrand = async (req, res) => {
    try {
        // IMPORTANT:
        // ShopID frontend se nahi liya jayega.
        // JWT se authenticated ShopID liya jayega.

        const shopID =
            req.user?.shopID ??
            req.user?.ShopID ??
            req.user?.shopId ??
            req.user?.ShopId ??
            null;

        const {
            BrandName,
            Slug,
            Description,
            LogoURL,
            IsActive
        } = req.body;

        if (!shopID) {
            return res.status(403).json({
                success: false,
                message: "Shop ID not found in authentication token."
            });
        }

        if (!BrandName || !BrandName.trim()) {
            return res.status(400).json({
                success: false,
                message: "Brand name is required."
            });
        }

        const db = getDB();

        // =====================================================
        // CHECK SHOP EXISTS
        // =====================================================

        const shopResult = await db
            .request()
            .input("ShopID", Number(shopID))
            .query(`
                SELECT ShopID
                FROM dbo.Shops
                WHERE ShopID = @ShopID
            `);

        if (shopResult.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Shop not found."
            });
        }

        // =====================================================
        // GENERATE SLUG
        // =====================================================

        const finalSlug =
            Slug && Slug.trim()
                ? Slug.trim().toLowerCase()
                : BrandName
                    .trim()
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-+|-+$/g, "");

        // =====================================================
        // CHECK DUPLICATE BRAND NAME
        // =====================================================

        const existingName = await db
            .request()
            .input("ShopID", Number(shopID))
            .input("BrandName", BrandName.trim())
            .query(`
                SELECT BrandID
                FROM dbo.Brands
                WHERE ShopID = @ShopID
                AND LOWER(BrandName) = LOWER(@BrandName)
            `);

        if (existingName.recordset.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Brand already exists in this shop."
            });
        }

        // =====================================================
        // CHECK DUPLICATE SLUG
        // =====================================================

        const existingSlug = await db
            .request()
            .input("ShopID", Number(shopID))
            .input("Slug", finalSlug)
            .query(`
                SELECT BrandID
                FROM dbo.Brands
                WHERE ShopID = @ShopID
                AND Slug = @Slug
            `);

        if (existingSlug.recordset.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Brand slug already exists in this shop."
            });
        }

        // =====================================================
        // INSERT BRAND
        // =====================================================

        const result = await db
            .request()
            .input("ShopID", Number(shopID))
            .input("BrandName", BrandName.trim())
            .input("Slug", finalSlug)
            .input(
                "Description",
                Description?.trim() || null
            )
            .input(
                "LogoURL",
                LogoURL?.trim() || null
            )
            .input(
                "IsActive",
                IsActive === false ? false : true
            )
            .query(`
                INSERT INTO dbo.Brands
                (
                    ShopID,
                    BrandName,
                    Slug,
                    Description,
                    LogoURL,
                    IsActive,
                    CreatedAt,
                    UpdatedAt
                )
                OUTPUT
                    INSERTED.BrandID,
                    INSERTED.ShopID,
                    INSERTED.BrandName,
                    INSERTED.Slug,
                    INSERTED.Description,
                    INSERTED.LogoURL,
                    INSERTED.IsActive,
                    INSERTED.CreatedAt,
                    INSERTED.UpdatedAt
                VALUES
                (
                    @ShopID,
                    @BrandName,
                    @Slug,
                    @Description,
                    @LogoURL,
                    @IsActive,
                    GETDATE(),
                    GETDATE()
                )
            `);

        return res.status(201).json({
            success: true,
            message: "Brand created successfully.",
            data: result.recordset[0]
        });

    } catch (error) {
        console.error("Create Shop Brand Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create shop brand.",
            error: error.message
        });
    }
};


// =====================================================
// UPDATE SHOP BRAND
// PUT /api/shop-brands/:id
// =====================================================

export const updateShopBrand = async (req, res) => {
    try {
        const shopID =
            req.user?.shopID ??
            req.user?.ShopID ??
            req.user?.shopId ??
            req.user?.ShopId ??
            null;

        const brandID = Number(req.params.id);

        const {
            BrandName,
            Slug,
            Description,
            LogoURL,
            IsActive
        } = req.body;

        if (!shopID) {
            return res.status(403).json({
                success: false,
                message: "Shop ID not found in authentication token."
            });
        }

        if (!brandID) {
            return res.status(400).json({
                success: false,
                message: "Brand ID is required."
            });
        }

        if (!BrandName || !BrandName.trim()) {
            return res.status(400).json({
                success: false,
                message: "Brand name is required."
            });
        }

        const db = getDB();

        // =====================================================
        // VERIFY BRAND BELONGS TO LOGGED-IN SHOP
        // =====================================================

        const existing = await db
            .request()
            .input("BrandID", brandID)
            .input("ShopID", Number(shopID))
            .query(`
                SELECT BrandID
                FROM dbo.Brands
                WHERE BrandID = @BrandID
                AND ShopID = @ShopID
            `);

        if (existing.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Brand not found for this shop."
            });
        }

        // =====================================================
        // SLUG
        // =====================================================

        const finalSlug =
            Slug && Slug.trim()
                ? Slug.trim().toLowerCase()
                : BrandName
                    .trim()
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-+|-+$/g, "");

        // =====================================================
        // UPDATE
        // =====================================================

        const result = await db
            .request()
            .input("BrandID", brandID)
            .input("ShopID", Number(shopID))
            .input("BrandName", BrandName.trim())
            .input("Slug", finalSlug)
            .input(
                "Description",
                Description?.trim() || null
            )
            .input(
                "LogoURL",
                LogoURL?.trim() || null
            )
            .input(
                "IsActive",
                IsActive === false ? false : true
            )
            .query(`
                UPDATE dbo.Brands
                SET
                    BrandName = @BrandName,
                    Slug = @Slug,
                    Description = @Description,
                    LogoURL = @LogoURL,
                    IsActive = @IsActive,
                    UpdatedAt = GETDATE()
                OUTPUT
                    INSERTED.BrandID,
                    INSERTED.ShopID,
                    INSERTED.BrandName,
                    INSERTED.Slug,
                    INSERTED.Description,
                    INSERTED.LogoURL,
                    INSERTED.IsActive,
                    INSERTED.CreatedAt,
                    INSERTED.UpdatedAt
                WHERE BrandID = @BrandID
                AND ShopID = @ShopID
            `);

        return res.status(200).json({
            success: true,
            message: "Brand updated successfully.",
            data: result.recordset[0]
        });

    } catch (error) {
        console.error("Update Shop Brand Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update shop brand.",
            error: error.message
        });
    }
};


// =====================================================
// DELETE SHOP BRAND
// DELETE /api/shop-brands/:id
// =====================================================

export const deleteShopBrand = async (req, res) => {
    try {
        const shopID =
            req.user?.shopID ??
            req.user?.ShopID ??
            req.user?.shopId ??
            req.user?.ShopId ??
            null;

        const brandID = Number(req.params.id);

        if (!shopID) {
            return res.status(403).json({
                success: false,
                message: "Shop ID not found in authentication token."
            });
        }

        if (!brandID) {
            return res.status(400).json({
                success: false,
                message: "Brand ID is required."
            });
        }

        const db = getDB();

        // =====================================================
        // CHECK PRODUCT USAGE
        // =====================================================

        const productResult = await db
            .request()
            .input("BrandID", brandID)
            .input("ShopID", Number(shopID))
            .query(`
                SELECT TOP 1 ProductID
                FROM dbo.Products
                WHERE BrandID = @BrandID
                AND ShopID = @ShopID
            `);

        if (productResult.recordset.length > 0) {
            return res.status(409).json({
                success: false,
                message:
                    "This brand is already used by a product and cannot be deleted."
            });
        }

        // =====================================================
        // DELETE
        // =====================================================

        const result = await db
            .request()
            .input("BrandID", brandID)
            .input("ShopID", Number(shopID))
            .query(`
                DELETE FROM dbo.Brands
                OUTPUT DELETED.*
                WHERE BrandID = @BrandID
                AND ShopID = @ShopID
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Brand not found for this shop."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Brand deleted successfully.",
            data: result.recordset[0]
        });

    } catch (error) {
        console.error("Delete Shop Brand Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete shop brand.",
            error: error.message
        });
    }
};


// =====================================================
// TOGGLE SHOP BRAND STATUS
// PATCH /api/shop-brands/:id/toggle-status
// =====================================================

export const toggleShopBrandStatus = async (req, res) => {
    try {
        const shopID =
            req.user?.shopID ??
            req.user?.ShopID ??
            req.user?.shopId ??
            req.user?.ShopId ??
            null;

        const brandID = Number(req.params.id);

        if (!shopID) {
            return res.status(403).json({
                success: false,
                message: "Shop ID not found in authentication token."
            });
        }

        if (!brandID) {
            return res.status(400).json({
                success: false,
                message: "Brand ID is required."
            });
        }

        const db = getDB();

        const result = await db
            .request()
            .input("BrandID", brandID)
            .input("ShopID", Number(shopID))
            .query(`
                UPDATE dbo.Brands
                SET
                    IsActive =
                        CASE
                            WHEN IsActive = 1 THEN 0
                            ELSE 1
                        END,
                    UpdatedAt = GETDATE()
                OUTPUT
                    INSERTED.BrandID,
                    INSERTED.ShopID,
                    INSERTED.BrandName,
                    INSERTED.Slug,
                    INSERTED.Description,
                    INSERTED.LogoURL,
                    INSERTED.IsActive,
                    INSERTED.CreatedAt,
                    INSERTED.UpdatedAt
                WHERE BrandID = @BrandID
                AND ShopID = @ShopID
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Brand not found for this shop."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Brand status updated successfully.",
            data: result.recordset[0]
        });

    } catch (error) {
        console.error(
            "Toggle Shop Brand Status Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to update brand status.",
            error: error.message
        });
    }
};