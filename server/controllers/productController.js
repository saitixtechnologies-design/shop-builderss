import sql from "mssql";
import { getDB } from "../config/db.js";
import { productImagesSql, replaceProductImages } from "../utils/productImages.js";
import { productIdentity } from "../utils/productDefaults.js";

const normalizeSizeOptions = (value) => JSON.stringify([...new Set((Array.isArray(value) ? value : []).map((size) => String(size || "").trim()).filter(Boolean))].slice(0, 20));

// =====================================================
// GET ALL PRODUCTS
// =====================================================
export const getAllProducts = async (req, res) => {
    try {
        const pool = getDB();

        const result = await pool.request().query(`
            SELECT
                p.ProductID,
                p.ShopID,
                s.ShopName,

                p.CategoryID,
                c.CategoryName,

                p.BrandID,
                b.BrandName,

                p.ProductName,
                p.Slug,
                p.SKU,
                p.ModelNo,
                p.Tags,
                p.ShortDescription,
                p.Description,

                p.MRP,
                p.SellingPrice,
                p.CostPrice,

                p.StockQuantity,
                p.LowStockThreshold,

                p.IsAvailable,
                p.IsActive,
                ${productImagesSql} AS Images,

                p.CreatedAt,
                p.UpdatedAt

            FROM dbo.Products p

            LEFT JOIN dbo.Shops s
                ON p.ShopID = s.ShopID

          LEFT JOIN dbo.Categories c
    ON p.CategoryID = c.CategoryID
    AND p.ShopID = c.ShopID

LEFT JOIN dbo.Brands b
    ON p.BrandID = b.BrandID
    AND p.ShopID = b.ShopID

            ORDER BY p.ProductID DESC
        `);

        return res.status(200).json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error("Get All Products Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch products.",
            error: error.message
        });
    }
};


// =====================================================
// GET PRODUCT BY ID
// =====================================================
export const getProductById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(Number(id))) {
            return res.status(400).json({
                success: false,
                message: "Valid Product ID is required."
            });
        }

        const pool = getDB();

        const result = await pool
            .request()
            .input("ProductID", sql.Int, Number(id))
            .query(`
                SELECT
                    p.ProductID,
                    p.ShopID,
                    s.ShopName,

                    p.CategoryID,
                    c.CategoryName,

                    p.BrandID,
                    b.BrandName,

                    p.ProductName,
                    p.Slug,
                    p.SKU,
                    p.ModelNo,
                    p.Tags,
                    p.ShortDescription,
                    p.Description,

                    p.MRP,
                    p.SellingPrice,
                    p.CostPrice,

                    p.StockQuantity,
                    p.LowStockThreshold,

                    p.IsAvailable,
                    p.IsActive,
                    ${productImagesSql} AS Images,

                    p.CreatedAt,
                    p.UpdatedAt

                FROM dbo.Products p

                LEFT JOIN dbo.Shops s
                    ON p.ShopID = s.ShopID

                LEFT JOIN dbo.Categories c
                    ON p.CategoryID = c.CategoryID

                LEFT JOIN dbo.Brands b
                    ON p.BrandID = b.BrandID

                WHERE p.ProductID = @ProductID
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        return res.status(200).json({
            success: true,
            data: result.recordset[0]
        });

    } catch (error) {
        console.error("Get Product Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch product.",
            error: error.message
        });
    }
};


// =====================================================
// CREATE PRODUCT
// =====================================================
export const createProduct = async (req, res) => {
    try {

        // Slug and SKU are optional: blanks are filled in (utils/productDefaults.js).
        if (req.body?.productName?.trim() && req.body?.shopID) {
            const identity = await productIdentity(getDB(), req.body.shopID, { name: req.body.productName, slug: req.body.slug, sku: req.body.SKU }, null);
            req.body.slug = identity.slug;
            req.body.SKU = identity.sku;
        }
        const {
            shopID,
            categoryID,
            brandID,
            productName,
            slug,
            SKU,
            modelNo,
            tags,
            shortDescription,
            description,
            MRP,
            sellingPrice,
            costPrice,
            stockQuantity,
            lowStockThreshold,
            isAvailable,
            isActive,
            sizeOptions,
            productImages
        } = req.body;

        // ---------------------------------------------
        // VALIDATION
        // ---------------------------------------------
        if (
            !shopID ||
            !productName?.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Shop and product name are required."
            });
        }

        const pool = getDB();

        // ---------------------------------------------
        // CHECK SHOP
        // ---------------------------------------------
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

        // ---------------------------------------------
        // CHECK CATEGORY
        // ---------------------------------------------
        if (categoryID) {
            const categoryResult = await pool
        .request()
        .input("CategoryID", sql.Int, categoryID ? Number(categoryID) : null)
        .input("ShopID", sql.Int, Number(shopID))
        .query(`
            SELECT CategoryID
            FROM dbo.Categories
            WHERE CategoryID = @CategoryID
              AND ShopID = @ShopID
              AND IsActive = 1
        `);
    
            if (categoryResult.recordset.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Category not found."
                });
            }
        }

        // ---------------------------------------------
        // CHECK BRAND
        // ---------------------------------------------
        if (brandID !== null && brandID !== undefined && brandID !== "") {

            const brandResult = await pool
    .request()
    .input("BrandID", sql.Int, Number(brandID))
    .input("ShopID", sql.Int, Number(shopID))
    .query(`
        SELECT BrandID
        FROM dbo.Brands
        WHERE BrandID = @BrandID
          AND ShopID = @ShopID
          AND IsActive = 1
    `);

            if (brandResult.recordset.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Brand not found."
                });
            }
        }

        // ---------------------------------------------
        // CHECK DUPLICATE SLUG
        // ---------------------------------------------
        const slugResult = await pool
            .request()
            .input("ShopID", sql.Int, Number(shopID))
            .input("Slug", sql.NVarChar(255), slug.trim())
            .query(`
                SELECT ProductID
                FROM dbo.Products
                WHERE ShopID = @ShopID
                AND Slug = @Slug
            `);

        if (slugResult.recordset.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Product slug already exists for this shop."
            });
        }

        // ---------------------------------------------
        // CHECK DUPLICATE SKU
        // ---------------------------------------------
        const skuResult = await pool
            .request()
            .input("ShopID", sql.Int, Number(shopID))
            .input("SKU", sql.NVarChar(100), SKU.trim())
            .query(`
                SELECT ProductID
                FROM dbo.Products
                WHERE ShopID = @ShopID
                AND SKU = @SKU
            `);

        if (skuResult.recordset.length > 0) {
            return res.status(409).json({
                success: false,
                message: "SKU already exists for this shop."
            });
        }

        // ---------------------------------------------
        // INSERT PRODUCT
        // ---------------------------------------------
        const request = pool.request();

        request.input("ShopID", sql.Int, Number(shopID));
        request.input("CategoryID", sql.Int, categoryID ? Number(categoryID) : null);

        request.input(
            "BrandID",
            brandID !== null &&
            brandID !== undefined &&
            brandID !== ""
                ? sql.Int
                : sql.Int,
            brandID !== null &&
            brandID !== undefined &&
            brandID !== ""
                ? Number(brandID)
                : null
        );

        request.input(
            "ProductName",
            sql.NVarChar(255),
            productName.trim()
        );

        request.input(
            "Slug",
            sql.NVarChar(255),
            slug.trim()
        );

        request.input(
            "SKU",
            sql.NVarChar(100),
            SKU.trim()
        );
        request.input("SizesJson", sql.NVarChar(sql.MAX), normalizeSizeOptions(sizeOptions));

        request.input(
            "ModelNo",
            sql.NVarChar(150),
            modelNo?.trim() || null
        );

        request.input(
            "Tags",
            sql.NVarChar(sql.MAX),
            tags?.trim() || null
        );

        request.input(
            "ShortDescription",
            sql.NVarChar(sql.MAX),
            shortDescription?.trim() || null
        );

        request.input(
            "Description",
            sql.NVarChar(sql.MAX),
            description?.trim() || null
        );

        request.input(
            "MRP",
            sql.Decimal(18, 2),
            MRP !== "" && MRP !== undefined && MRP !== null
                ? Number(MRP)
                : null
        );

        request.input(
            "SellingPrice",
            sql.Decimal(18, 2),
            sellingPrice !== "" &&
            sellingPrice !== undefined &&
            sellingPrice !== null
                ? Number(sellingPrice)
                : null
        );

        request.input(
            "CostPrice",
            sql.Decimal(18, 2),
            costPrice !== "" &&
            costPrice !== undefined &&
            costPrice !== null
                ? Number(costPrice)
                : null
        );

        request.input(
            "StockQuantity",
            sql.Int,
            stockQuantity !== "" &&
            stockQuantity !== undefined &&
            stockQuantity !== null
                ? Number(stockQuantity)
                : 0
        );

        request.input(
            "LowStockThreshold",
            sql.Int,
            lowStockThreshold !== "" &&
            lowStockThreshold !== undefined &&
            lowStockThreshold !== null
                ? Number(lowStockThreshold)
                : 5
        );

        request.input(
            "IsAvailable",
            sql.Bit,
            isAvailable !== undefined
                ? Boolean(isAvailable)
                : true
        );

        request.input(
            "IsActive",
            sql.Bit,
            isActive !== undefined
                ? Boolean(isActive)
                : true
        );

        const result = await request.query(`
            INSERT INTO dbo.Products
            (
                ShopID,
                CategoryID,
                BrandID,
                ProductName,
                Slug,
                SKU,
                SizeOptions,
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

            OUTPUT
                INSERTED.ProductID,
                INSERTED.ShopID,
                INSERTED.CategoryID,
                INSERTED.BrandID,
                INSERTED.ProductName,
                INSERTED.Slug,
                INSERTED.SKU,
                INSERTED.ModelNo,
                INSERTED.Tags,
                INSERTED.ShortDescription,
                INSERTED.Description,
                INSERTED.MRP,
                INSERTED.SellingPrice,
                INSERTED.CostPrice,
                INSERTED.StockQuantity,
                INSERTED.LowStockThreshold,
                INSERTED.IsAvailable,
                INSERTED.IsActive,
                INSERTED.CreatedAt,
                INSERTED.UpdatedAt

            VALUES
            (
                @ShopID,
                @CategoryID,
                @BrandID,
                @ProductName,
                @Slug,
                @SKU,
                @SizesJson,
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
                SYSDATETIME(),
                SYSDATETIME()
            )
        `);

        await replaceProductImages(pool, result.recordset[0].ProductID, productImages);

        return res.status(201).json({
            success: true,
            message: "Product created successfully.",
            data: result.recordset[0]
        });

    } catch (error) {
        console.error("Create Product Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create product.",
            error: error.message
        });
    }
};


// =====================================================
// UPDATE PRODUCT
// =====================================================
export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;

        // Slug and SKU are optional: blanks are filled in (utils/productDefaults.js).
        if (req.body?.productName?.trim() && req.body?.shopID) {
            const identity = await productIdentity(getDB(), req.body.shopID, { name: req.body.productName, slug: req.body.slug, sku: req.body.SKU }, Number(id));
            req.body.slug = identity.slug;
            req.body.SKU = identity.sku;
        }

        const {
            shopID,
            categoryID,
            brandID,
            productName,
            slug,
            SKU,
            modelNo,
            tags,
            shortDescription,
            description,
            MRP,
            sellingPrice,
            costPrice,
            stockQuantity,
            lowStockThreshold,
            isAvailable,
            isActive,
            sizeOptions,
            productImages
        } = req.body;

        if (!id || isNaN(Number(id))) {
            return res.status(400).json({
                success: false,
                message: "Valid Product ID is required."
            });
        }

        if (
            !shopID ||
            !productName?.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Shop and product name are required."
            });
        }

        const pool = getDB();

        // ---------------------------------------------
        // CHECK PRODUCT
        // ---------------------------------------------
        const existingProduct = await pool
            .request()
            .input("ProductID", sql.Int, Number(id))
            .query(`
                SELECT ProductID
                FROM dbo.Products
                WHERE ProductID = @ProductID
            `);

        if (existingProduct.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        // ---------------------------------------------
        // CHECK SHOP
        // ---------------------------------------------
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

        // ---------------------------------------------
        // CHECK CATEGORY
        // ---------------------------------------------
        if (categoryID) {
            const categoryResult = await pool
                .request()
                .input("CategoryID", sql.Int, categoryID ? Number(categoryID) : null)
                .query(`
                    SELECT CategoryID
                    FROM dbo.Categories
                    WHERE CategoryID = @CategoryID
                `);
    
            if (categoryResult.recordset.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Category not found."
                });
            }
        }

        // ---------------------------------------------
        // CHECK BRAND
        // ---------------------------------------------
        if (brandID !== null && brandID !== undefined && brandID !== "") {

            const brandResult = await pool
                .request()
                .input("BrandID", sql.Int, Number(brandID))
                .query(`
                    SELECT BrandID
                    FROM dbo.Brands
                    WHERE BrandID = @BrandID
                `);

            if (brandResult.recordset.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Brand not found."
                });
            }
        }

        // ---------------------------------------------
        // DUPLICATE SLUG
        // ---------------------------------------------
        const slugResult = await pool
            .request()
            .input("ProductID", sql.Int, Number(id))
            .input("ShopID", sql.Int, Number(shopID))
            .input("Slug", sql.NVarChar(255), slug.trim())
            .query(`
                SELECT ProductID
                FROM dbo.Products
                WHERE ShopID = @ShopID
                AND Slug = @Slug
                AND ProductID <> @ProductID
            `);

        if (slugResult.recordset.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Product slug already exists for this shop."
            });
        }

        // ---------------------------------------------
        // DUPLICATE SKU
        // ---------------------------------------------
        const skuResult = await pool
            .request()
            .input("ProductID", sql.Int, Number(id))
            .input("ShopID", sql.Int, Number(shopID))
            .input("SKU", sql.NVarChar(100), SKU.trim())
            .query(`
                SELECT ProductID
                FROM dbo.Products
                WHERE ShopID = @ShopID
                AND SKU = @SKU
                AND ProductID <> @ProductID
            `);

        if (skuResult.recordset.length > 0) {
            return res.status(409).json({
                success: false,
                message: "SKU already exists for this shop."
            });
        }

        // ---------------------------------------------
        // UPDATE
        // ---------------------------------------------
        const request = pool.request();

        request.input("ProductID", sql.Int, Number(id));
        request.input("ShopID", sql.Int, Number(shopID));
        request.input("CategoryID", sql.Int, categoryID ? Number(categoryID) : null);

        request.input(
            "BrandID",
            sql.Int,
            brandID !== null &&
            brandID !== undefined &&
            brandID !== ""
                ? Number(brandID)
                : null
        );

        request.input(
            "ProductName",
            sql.NVarChar(255),
            productName.trim()
        );

        request.input(
            "Slug",
            sql.NVarChar(255),
            slug.trim()
        );

        request.input(
            "SKU",
            sql.NVarChar(100),
            SKU.trim()
        );
        request.input("SizesJson", sql.NVarChar(sql.MAX), normalizeSizeOptions(sizeOptions));

        request.input(
            "ModelNo",
            sql.NVarChar(150),
            modelNo?.trim() || null
        );

        request.input(
            "Tags",
            sql.NVarChar(sql.MAX),
            tags?.trim() || null
        );

        request.input(
            "ShortDescription",
            sql.NVarChar(sql.MAX),
            shortDescription?.trim() || null
        );

        request.input(
            "Description",
            sql.NVarChar(sql.MAX),
            description?.trim() || null
        );

        request.input(
            "MRP",
            sql.Decimal(18, 2),
            MRP !== "" && MRP !== undefined && MRP !== null
                ? Number(MRP)
                : null
        );

        request.input(
            "SellingPrice",
            sql.Decimal(18, 2),
            sellingPrice !== "" &&
            sellingPrice !== undefined &&
            sellingPrice !== null
                ? Number(sellingPrice)
                : null
        );

        request.input(
            "CostPrice",
            sql.Decimal(18, 2),
            costPrice !== "" &&
            costPrice !== undefined &&
            costPrice !== null
                ? Number(costPrice)
                : null
        );

        request.input(
            "StockQuantity",
            sql.Int,
            stockQuantity !== "" &&
            stockQuantity !== undefined &&
            stockQuantity !== null
                ? Number(stockQuantity)
                : 0
        );

        request.input(
            "LowStockThreshold",
            sql.Int,
            lowStockThreshold !== "" &&
            lowStockThreshold !== undefined &&
            lowStockThreshold !== null
                ? Number(lowStockThreshold)
                : 5
        );

        request.input(
            "IsAvailable",
            sql.Bit,
            isAvailable !== undefined
                ? Boolean(isAvailable)
                : true
        );

        request.input(
            "IsActive",
            sql.Bit,
            isActive !== undefined
                ? Boolean(isActive)
                : true
        );

        const result = await request.query(`
            UPDATE dbo.Products

            SET
                ShopID = @ShopID,
                CategoryID = @CategoryID,
                BrandID = @BrandID,
                ProductName = @ProductName,
                Slug = @Slug,
                SKU = @SKU,
                SizeOptions = @SizesJson,
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
                UpdatedAt = SYSDATETIME()

            OUTPUT
                INSERTED.ProductID,
                INSERTED.ShopID,
                INSERTED.CategoryID,
                INSERTED.BrandID,
                INSERTED.ProductName,
                INSERTED.Slug,
                INSERTED.SKU,
                INSERTED.ModelNo,
                INSERTED.Tags,
                INSERTED.ShortDescription,
                INSERTED.Description,
                INSERTED.MRP,
                INSERTED.SellingPrice,
                INSERTED.CostPrice,
                INSERTED.StockQuantity,
                INSERTED.LowStockThreshold,
                INSERTED.IsAvailable,
                INSERTED.IsActive,
                INSERTED.CreatedAt,
                INSERTED.UpdatedAt

            WHERE ProductID = @ProductID
        `);

        if (result.recordset[0]) await replaceProductImages(pool, result.recordset[0].ProductID, productImages);

        return res.status(200).json({
            success: true,
            message: "Product updated successfully.",
            data: result.recordset[0]
        });

    } catch (error) {
        console.error("Update Product Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update product.",
            error: error.message
        });
    }
};


// =====================================================
// DELETE PRODUCT
// =====================================================
export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(Number(id))) {
            return res.status(400).json({
                success: false,
                message: "Valid Product ID is required."
            });
        }

        const pool = getDB();

        const existingProduct = await pool
            .request()
            .input("ProductID", sql.Int, Number(id))
            .query(`
                SELECT ProductID, ProductName
                FROM dbo.Products
                WHERE ProductID = @ProductID
            `);

        if (existingProduct.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        const orderItemResult = await pool.request()
            .input("ProductID", sql.Int, Number(id))
            .query("SELECT TOP 1 OrderItemID FROM dbo.OrderItems WHERE ProductID = @ProductID");
        if (orderItemResult.recordset.length > 0) {
            return res.status(409).json({ success: false, message: "This product is part of an order and cannot be deleted. Deactivate it instead." });
        }
        const reviewResult = await pool.request()
            .input("ProductID", sql.Int, Number(id))
            .query("SELECT TOP 1 ReviewID FROM dbo.Reviews WHERE ProductID = @ProductID");
        if (reviewResult.recordset.length > 0) {
            return res.status(409).json({ success: false, message: "This product has reviews and cannot be deleted. Deactivate it instead." });
        }

        await pool.request().input("ProductID", sql.Int, Number(id)).query("DELETE FROM dbo.ProductImages WHERE ProductID = @ProductID");
        await pool.request().input("ProductID", sql.Int, Number(id)).query("DELETE FROM dbo.ProductSpecificationValues WHERE ProductID = @ProductID");
        const deleted = await pool.request()
            .input("ProductID", sql.Int, Number(id))
            .query("DELETE FROM dbo.Products OUTPUT DELETED.ProductID WHERE ProductID = @ProductID");
        if (!deleted.recordset.length) {
            return res.status(404).json({ success: false, message: "Product not found." });
        }

        return res.status(200).json({
            success: true,
            message: "Product deleted successfully."
        });

    } catch (error) {
        console.error("Delete Product Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete product.",
            error: error.message
        });
    }
}; 










// =====================================================
// SHOP ADMIN - GET PRODUCTS
// =====================================================

export const getShopProducts = async (req, res) => {
    try {
        const shopID =
            req.user?.shopID ||
            req.user?.ShopID;

        if (!shopID) {
            return res.status(401).json({
                success: false,
                message: "Shop Admin session not found.",
            });
        }

        const db = getDB();

        const result = await db
            .request()
            .input("ShopID", shopID)
            .query(`
                SELECT
                    ProductID,
                    ShopID,
                    CategoryID,
                    BrandID,
                    ProductName,
                    Slug,
                    SKU,
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
                FROM Products
                WHERE ShopID = @ShopID
                ORDER BY ProductID DESC
            `);

        return res.status(200).json({
            success: true,
            data: result.recordset,
        });
    } catch (error) {
        console.error(
            "Get Shop Products Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to load products.",
            error: error.message,
        });
    }
};
