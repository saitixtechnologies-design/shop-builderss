import { getDB } from "../config/db.js";
import { productImagesSql, replaceProductImages } from "../utils/productImages.js";

/* =========================================================
   GET SHOP ID FROM JWT
========================================================= */

const normalizeSizesJson = (value) => {
    let sizes = value;
    try { if (typeof sizes === "string") sizes = JSON.parse(sizes); } catch { sizes = []; }
    if (!Array.isArray(sizes)) sizes = [];
    return JSON.stringify([...new Set(sizes.map((size) => String(size || "").trim()).filter(Boolean))].slice(0, 20));
};

const getShopID = (req) => {
    return (
        req.user?.shopID ??
        req.user?.ShopID ??
        req.user?.shopId ??
        req.user?.ShopId ??
        null
    );
};


/* =========================================================
   CREATE SHOP PRODUCT
   POST /api/shop-products
========================================================= */

export const createShopProduct = async (req, res) => {
    try {
        const shopID = getShopID(req);

        if (!shopID) {
            return res.status(401).json({
                success: false,
                message: "Shop session not found."
            });
        }

        const {
            ProductName,
            Slug,
            SKU,
            ModelNo,
            Tags,
            CategoryID,
            BrandID,
            ShortDescription,
            Description,
            MRP,
            SellingPrice,
            CostPrice,
            StockQuantity,
            LowStockThreshold,
            IsAvailable,
            IsActive,
            sizeOptions,
            productImages
        } = req.body;


        /* ================= VALIDATION ================= */

        if (!ProductName?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Product name is required."
            });
        }

        if (!Slug?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Product slug is required."
            });
        }

        if (!SKU?.trim()) {
            return res.status(400).json({
                success: false,
                message: "SKU is required."
            });
        }

        if (!CategoryID) {
            return res.status(400).json({
                success: false,
                message: "Category is required."
            });
        }


        const normalizedSizesJson = normalizeSizesJson(sizeOptions);
        const db = getDB();
        const sizeColumnResult = await db.request().query(`
            SELECT CASE WHEN COL_LENGTH(N'dbo.Products', N'SizeOptions') IS NULL THEN 0 ELSE 1 END AS HasSizeOptions
        `);
        const hasSizeOptions = Boolean(sizeColumnResult.recordset[0]?.HasSizeOptions);
        if (!hasSizeOptions && normalizedSizesJson !== "[]") {
            return res.status(409).json({ success: false, message: "Apply the latest Database.sql update before saving product sizes." });
        }


        /* =================================================
           VERIFY CATEGORY BELONGS TO THIS SHOP
        ================================================= */

        const categoryCheck = await db
            .request()
            .input("CategoryID", Number(CategoryID))
            .input("ShopID", Number(shopID))
            .query(`
                SELECT CategoryID
                FROM dbo.Categories
                WHERE
                    CategoryID = @CategoryID
                    AND ShopID = @ShopID
                    AND IsActive = 1
            `);

        if (categoryCheck.recordset.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Selected category does not belong to this shop."
            });
        }


        /* =================================================
           VERIFY BRAND BELONGS TO THIS SHOP
        ================================================= */

        if (BrandID) {

            const brandCheck = await db
                .request()
                .input("BrandID", Number(BrandID))
                .input("ShopID", Number(shopID))
                .query(`
                    SELECT BrandID
                    FROM dbo.Brands
                    WHERE
                        BrandID = @BrandID
                        AND ShopID = @ShopID
                        AND IsActive = 1
                `);

            if (brandCheck.recordset.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Selected brand does not belong to this shop."
                });
            }
        }


        /* =================================================
           DUPLICATE SKU CHECK
        ================================================= */

        const skuCheck = await db
            .request()
            .input("ShopID", Number(shopID))
            .input("SKU", SKU.trim())
            .query(`
                SELECT ProductID
                FROM dbo.Products
                WHERE
                    ShopID = @ShopID
                    AND SKU = @SKU
            `);

        if (skuCheck.recordset.length > 0) {
            return res.status(409).json({
                success: false,
                message: "This SKU already exists in your shop."
            });
        }


        /* =================================================
           DUPLICATE SLUG CHECK
        ================================================= */

        const slugCheck = await db
            .request()
            .input("ShopID", Number(shopID))
            .input("Slug", Slug.trim())
            .query(`
                SELECT ProductID
                FROM dbo.Products
                WHERE
                    ShopID = @ShopID
                    AND Slug = @Slug
            `);

        if (slugCheck.recordset.length > 0) {
            return res.status(409).json({
                success: false,
                message: "This product slug already exists in your shop."
            });
        }


        /* =================================================
           INSERT PRODUCT
        ================================================= */

        const result = await db
            .request()

            .input("ShopID", Number(shopID))
            .input("CategoryID", Number(CategoryID))
            .input(
                "BrandID",
                BrandID ? Number(BrandID) : null
            )

            .input(
                "ProductName",
                ProductName.trim()
            )

            .input(
                "Slug",
                Slug.trim()
            )

            .input(
                "SKU",
                SKU.trim()
            )

            .input(
                "ModelNo",
                ModelNo?.trim() || null
            )

            .input(
                "Tags",
                Tags?.trim() || null
            )

            .input(
                "ShortDescription",
                ShortDescription?.trim() || null
            )

            .input(
                "Description",
                Description?.trim() || null
            )

            .input(
                "MRP",
                MRP === "" || MRP == null
                    ? null
                    : Number(MRP)
            )

            .input(
                "SellingPrice",
                Number(SellingPrice)
            )

            .input(
                "CostPrice",
                CostPrice === "" || CostPrice == null
                    ? null
                    : Number(CostPrice)
            )

            .input(
                "StockQuantity",
                Number(StockQuantity ?? 0)
            )

            .input(
                "LowStockThreshold",
                Number(LowStockThreshold ?? 5)
            )

            .input(
                "IsAvailable",
                Boolean(IsAvailable)
            )

            .input(
                "IsActive",
                Boolean(IsActive)
            )
            .input("SizesJson", normalizedSizesJson)

            .query(`
                INSERT INTO dbo.Products
                (
                    ShopID,
                    CategoryID,
                    BrandID,
                    ProductName,
                    Slug,
                    SKU,
                    ${hasSizeOptions ? "SizeOptions," : ""}
                    ModelNo,
                    Tags,
                    ShortDescription,
                    Description,
                    MRP,
                    SellingPrice,
                    CostPrice,
                    StockQuantity,
                    LowStockThreshold,
                    IsAvailable,
                    IsActive,
                    CreatedAt,
                    UpdatedAt
                )
                OUTPUT INSERTED.*
                VALUES
                (
                    @ShopID,
                    @CategoryID,
                    @BrandID,
                    @ProductName,
                    @Slug,
                    @SKU,
                    ${hasSizeOptions ? "@SizesJson," : ""}
                    @ModelNo,
                    @Tags,
                    @ShortDescription,
                    @Description,
                    @MRP,
                    @SellingPrice,
                    @CostPrice,
                    @StockQuantity,
                    @LowStockThreshold,
                    @IsAvailable,
                    @IsActive,
                    SYSUTCDATETIME(),
                    SYSUTCDATETIME()
                )
            `);

        await replaceProductImages(db, result.recordset[0].ProductID, productImages);


        return res.status(201).json({
            success: true,
            message: "Product created successfully.",
            data: result.recordset[0]
        });

    } catch (error) {

        console.error(
            "Create Shop Product Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to create product.",
            error: error.message
        });
    }
};


/* =========================================================
   GET ALL SHOP PRODUCTS
   GET /api/shop-products
========================================================= */

export const getShopProducts = async (req, res) => {

    try {

        const shopID = getShopID(req);

        if (!shopID) {
            return res.status(401).json({
                success: false,
                message: "Shop session not found."
            });
        }

        const db = getDB();

        const result = await db
            .request()
            .input("ShopID", Number(shopID))
            .query(`
                SELECT
                    p.*,
                    ${productImagesSql} AS Images,

                    c.CategoryName,

                    b.BrandName

                FROM dbo.Products p

                LEFT JOIN dbo.Categories c
                    ON c.CategoryID = p.CategoryID
                    AND c.ShopID = p.ShopID

                LEFT JOIN dbo.Brands b
                    ON b.BrandID = p.BrandID
                    AND b.ShopID = p.ShopID

                WHERE
                    p.ShopID = @ShopID

                ORDER BY
                    p.ProductID DESC
            `);


        return res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {

        console.error(
            "Get Shop Products Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to fetch products.",
            error: error.message
        });
    }
};


/* =========================================================
   GET CATEGORY + BRAND OPTIONS
   GET /api/shop-products/options
========================================================= */

// =====================================================
// GET SHOP PRODUCT OPTIONS
// GET /api/shop-products/options
// =====================================================

export const getShopProductOptions = async (req, res) => {
    try {
        const shopID =
            req.user?.shopID ??
            req.user?.ShopID ??
            null;

        if (!shopID) {
            return res.status(401).json({
                success: false,
                message: "Shop authentication required."
            });
        }

        const db = getDB();

        // ---------------------------------------------
        // CATEGORIES OF LOGGED-IN SHOP
        // ---------------------------------------------
        const categoryResult = await db
            .request()
            .input("ShopID", shopID)
            .query(`
                SELECT
                    CategoryID,
                    ShopID,
                    ParentCategoryID,
                    CategoryName,
                    Slug,
                    Description,
                    ImageURL,
                    SortOrder,
                    IsActive
                FROM Categories
                WHERE
                    ShopID = @ShopID
                    AND IsActive = 1
                ORDER BY
                    SortOrder ASC,
                    CategoryName ASC
            `);

        // ---------------------------------------------
        // BRANDS OF LOGGED-IN SHOP
        // ---------------------------------------------
        const brandResult = await db
            .request()
            .input("ShopID", shopID)
            .query(`
                SELECT
                    BrandID,
                    ShopID,
                    BrandName,
                    Slug,
                    Description,
                    LogoURL,
                    IsActive
                FROM Brands
                WHERE
                    ShopID = @ShopID
                    AND IsActive = 1
                ORDER BY
                    BrandName ASC
            `);

        return res.json({
            success: true,
            data: {
                categories: categoryResult.recordset,
                brands: brandResult.recordset
            }
        });

    } catch (error) {
        console.error(
            "Get Shop Product Options Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to load product options.",
            error: error.message
        });
    }
};


/* =========================================================
   GET SINGLE PRODUCT
   GET /api/shop-products/:id
========================================================= */

export const getShopProductById = async (req, res) => {

    try {

        const shopID = getShopID(req);
        const productID = Number(req.params.id);

        if (!shopID) {
            return res.status(401).json({
                success: false,
                message: "Shop session not found."
            });
        }

        if (!productID) {
            return res.status(400).json({
                success: false,
                message: "Product ID is required."
            });
        }

        const db = getDB();

        const result = await db
            .request()

            .input(
                "ProductID",
                productID
            )

            .input(
                "ShopID",
                Number(shopID)
            )

            .query(`
                SELECT
                    p.*,
                    ${productImagesSql} AS Images,
                    c.CategoryName,
                    b.BrandName

                FROM dbo.Products p

                LEFT JOIN dbo.Categories c
                    ON c.CategoryID = p.CategoryID
                    AND c.ShopID = p.ShopID

                LEFT JOIN dbo.Brands b
                    ON b.BrandID = p.BrandID
                    AND b.ShopID = p.ShopID

                WHERE
                    p.ProductID = @ProductID
                    AND p.ShopID = @ShopID
            `);


        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }


        return res.json({
            success: true,
            data: result.recordset[0]
        });

    } catch (error) {

        console.error(
            "Get Shop Product Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to fetch product.",
            error: error.message
        });
    }
};


/* =========================================================
   UPDATE PRODUCT
   PUT /api/shop-products/:id
========================================================= */

export const updateShopProduct = async (req, res) => {

    try {

        const shopID = getShopID(req);
        const productID = Number(req.params.id);

        if (!shopID) {
            return res.status(401).json({
                success: false,
                message: "Shop session not found."
            });
        }

        if (!productID) {
            return res.status(400).json({
                success: false,
                message: "Product ID is required."
            });
        }


        const {
            ProductName,
            Slug,
            SKU,
            ModelNo,
            Tags,
            CategoryID,
            BrandID,
            ShortDescription,
            Description,
            MRP,
            SellingPrice,
            CostPrice,
            StockQuantity,
            LowStockThreshold,
            IsAvailable,
            IsActive,
            sizeOptions,
            productImages
        } = req.body;


        if (!ProductName?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Product name is required."
            });
        }

        if (!Slug?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Product slug is required."
            });
        }

        if (!SKU?.trim()) {
            return res.status(400).json({
                success: false,
                message: "SKU is required."
            });
        }

        if (!CategoryID) {
            return res.status(400).json({
                success: false,
                message: "Category is required."
            });
        }


        const normalizedSizesJson = normalizeSizesJson(sizeOptions);
        const db = getDB();
        const sizeColumnResult = await db.request().query(`
            SELECT CASE WHEN COL_LENGTH(N'dbo.Products', N'SizeOptions') IS NULL THEN 0 ELSE 1 END AS HasSizeOptions
        `);
        const hasSizeOptions = Boolean(sizeColumnResult.recordset[0]?.HasSizeOptions);
        if (!hasSizeOptions && normalizedSizesJson !== "[]") {
            return res.status(409).json({ success: false, message: "Apply the latest Database.sql update before saving product sizes." });
        }


        /* ================= CATEGORY CHECK ================= */

        const categoryCheck = await db
            .request()

            .input(
                "CategoryID",
                Number(CategoryID)
            )

            .input(
                "ShopID",
                Number(shopID)
            )

            .query(`
                SELECT CategoryID
                FROM dbo.Categories

                WHERE
                    CategoryID = @CategoryID
                    AND ShopID = @ShopID
                    AND IsActive = 1
            `);


        if (categoryCheck.recordset.length === 0) {
            return res.status(400).json({
                success: false,
                message:
                    "Selected category does not belong to this shop."
            });
        }


        /* ================= BRAND CHECK ================= */

        if (BrandID) {

            const brandCheck = await db
                .request()

                .input(
                    "BrandID",
                    Number(BrandID)
                )

                .input(
                    "ShopID",
                    Number(shopID)
                )

                .query(`
                    SELECT BrandID
                    FROM dbo.Brands

                    WHERE
                        BrandID = @BrandID
                        AND ShopID = @ShopID
                        AND IsActive = 1
                `);


            if (brandCheck.recordset.length === 0) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Selected brand does not belong to this shop."
                });
            }
        }


        /* ================= DUPLICATE SKU ================= */

        const skuCheck = await db
            .request()

            .input(
                "ProductID",
                productID
            )

            .input(
                "ShopID",
                Number(shopID)
            )

            .input(
                "SKU",
                SKU.trim()
            )

            .query(`
                SELECT ProductID

                FROM dbo.Products

                WHERE
                    ShopID = @ShopID
                    AND SKU = @SKU
                    AND ProductID <> @ProductID
            `);


        if (skuCheck.recordset.length > 0) {
            return res.status(409).json({
                success: false,
                message:
                    "This SKU already exists in your shop."
            });
        }


        /* ================= DUPLICATE SLUG ================= */

        const slugCheck = await db
            .request()

            .input(
                "ProductID",
                productID
            )

            .input(
                "ShopID",
                Number(shopID)
            )

            .input(
                "Slug",
                Slug.trim()
            )

            .query(`
                SELECT ProductID

                FROM dbo.Products

                WHERE
                    ShopID = @ShopID
                    AND Slug = @Slug
                    AND ProductID <> @ProductID
            `);


        if (slugCheck.recordset.length > 0) {
            return res.status(409).json({
                success: false,
                message:
                    "This product slug already exists in your shop."
            });
        }


        /* ================= UPDATE ================= */

        const result = await db
            .request()

            .input(
                "ProductID",
                productID
            )

            .input(
                "ShopID",
                Number(shopID)
            )

            .input(
                "CategoryID",
                Number(CategoryID)
            )

            .input(
                "BrandID",
                BrandID
                    ? Number(BrandID)
                    : null
            )

            .input(
                "ProductName",
                ProductName.trim()
            )

            .input(
                "Slug",
                Slug.trim()
            )

            .input(
                "SKU",
                SKU.trim()
            )

            .input(
                "ModelNo",
                ModelNo?.trim() || null
            )

            .input(
                "Tags",
                Tags?.trim() || null
            )

            .input(
                "ShortDescription",
                ShortDescription?.trim() || null
            )

            .input(
                "Description",
                Description?.trim() || null
            )

            .input(
                "MRP",
                MRP === "" || MRP == null
                    ? null
                    : Number(MRP)
            )

            .input(
                "SellingPrice",
                Number(SellingPrice)
            )

            .input(
                "CostPrice",
                CostPrice === "" || CostPrice == null
                    ? null
                    : Number(CostPrice)
            )

            .input(
                "StockQuantity",
                Number(StockQuantity ?? 0)
            )

            .input(
                "LowStockThreshold",
                Number(LowStockThreshold ?? 5)
            )

            .input(
                "IsAvailable",
                Boolean(IsAvailable)
            )

            .input(
                "IsActive",
                Boolean(IsActive)
            )
            .input("SizesJson", normalizedSizesJson)

            .query(`
                UPDATE dbo.Products

                SET
                    CategoryID = @CategoryID,
                    BrandID = @BrandID,
                    ProductName = @ProductName,
                    Slug = @Slug,
                    SKU = @SKU,
                    ${hasSizeOptions ? "SizeOptions = @SizesJson," : ""}
                    ModelNo = @ModelNo,
                    Tags = @Tags,
                    ShortDescription = @ShortDescription,
                    Description = @Description,
                    MRP = @MRP,
                    SellingPrice = @SellingPrice,
                    CostPrice = @CostPrice,
                    StockQuantity = @StockQuantity,
                    LowStockThreshold = @LowStockThreshold,
                    IsAvailable = @IsAvailable,
                    IsActive = @IsActive,
                    UpdatedAt = SYSUTCDATETIME()

                OUTPUT INSERTED.*

                WHERE
                    ProductID = @ProductID
                    AND ShopID = @ShopID
            `);


        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message:
                    "Product not found or does not belong to this shop."
            });
        }

        await replaceProductImages(db, productID, productImages);


        return res.json({
            success: true,
            message:
                "Product updated successfully.",
            data:
                result.recordset[0]
        });

    } catch (error) {

        console.error(
            "Update Shop Product Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                error.message || "Failed to update product.",
            error: error.message
        });
    }
};


/* =========================================================
   DELETE PRODUCT
   DELETE /api/shop-products/:id
========================================================= */

export const deleteShopProduct = async (req, res) => {

    try {

        const shopID = getShopID(req);
        const productID = Number(req.params.id);

        if (!shopID) {
            return res.status(401).json({
                success: false,
                message: "Shop session not found."
            });
        }

        if (!productID) {
            return res.status(400).json({
                success: false,
                message: "Product ID is required."
            });
        }


        const db = getDB();

        const existing = await db.request()
            .input("ProductID", Number(productID))
            .input("ShopID", Number(shopID))
            .query("SELECT ProductID FROM dbo.Products WHERE ProductID = @ProductID AND ShopID = @ShopID");
        if (!existing.recordset.length) {
            return res.status(404).json({ success: false, message: "Product not found in your shop." });
        }
        const relatedTables = await db.request().query(`
            SELECT
                CASE WHEN OBJECT_ID(N'dbo.OrderItems', N'U') IS NULL THEN 0 ELSE 1 END AS HasOrderItems,
                CASE WHEN OBJECT_ID(N'dbo.Reviews', N'U') IS NULL THEN 0 ELSE 1 END AS HasReviews,
                CASE WHEN OBJECT_ID(N'dbo.ProductImages', N'U') IS NULL THEN 0 ELSE 1 END AS HasProductImages,
                CASE WHEN OBJECT_ID(N'dbo.ProductSpecificationValues', N'U') IS NULL THEN 0 ELSE 1 END AS HasSpecificationValues
        `);
        const tables = relatedTables.recordset[0] || {};
        const orderItems = tables.HasOrderItems ? await db.request()
            .input("ProductID", Number(productID))
            .query("SELECT TOP 1 OrderItemID FROM dbo.OrderItems WHERE ProductID = @ProductID") : { recordset: [] };
        if (orderItems.recordset.length) {
            return res.status(409).json({ success: false, message: "This product is part of an order and cannot be deleted. Deactivate it instead." });
        }
        const reviews = tables.HasReviews ? await db.request()
            .input("ProductID", Number(productID))
            .query("SELECT TOP 1 ReviewID FROM dbo.Reviews WHERE ProductID = @ProductID") : { recordset: [] };
        if (reviews.recordset.length) {
            return res.status(409).json({ success: false, message: "This product has reviews and cannot be deleted. Deactivate it instead." });
        }

        if (tables.HasProductImages) {
            await db.request().input("ProductID", Number(productID)).query("DELETE FROM dbo.ProductImages WHERE ProductID = @ProductID");
        }
        if (tables.HasSpecificationValues) {
            await db.request().input("ProductID", Number(productID)).query("DELETE FROM dbo.ProductSpecificationValues WHERE ProductID = @ProductID");
        }
        const result = await db
            .request()

            .input(
                "ProductID",
                productID
            )

            .input(
                "ShopID",
                Number(shopID)
            )

            .query(`
                DELETE FROM dbo.Products
                OUTPUT DELETED.ProductID

                WHERE
                    ProductID = @ProductID
                    AND ShopID = @ShopID
            `);


        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message:
                    "Product not found or does not belong to this shop."
            });
        }


        return res.json({
            success: true,
            message:
                "Product deleted successfully.",
            data:
                result.recordset[0]
        });

    } catch (error) {

        console.error(
            "Delete Shop Product Error:",
            error
        );

        const isForeignKeyError = /foreign key|reference constraint|conflicted with the reference/i.test(error.message || "");
        return res.status(isForeignKeyError ? 409 : 500).json({
            success: false,
            message: isForeignKeyError
                ? "This product is still in use and cannot be deleted. Deactivate it instead."
                : "Failed to delete product.",
            error: error.message
        });
    }
};
