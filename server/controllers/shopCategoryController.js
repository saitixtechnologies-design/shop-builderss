import { getDB } from "../config/db.js";
import sql from "mssql/msnodesqlv8.js";

// =====================================================
// HELPER - GET LOGGED-IN SHOP ID
// =====================================================

const getShopID = (req) => {
    return (
        req.user?.shopID ??
        req.user?.ShopID ??
        null
    );
};


// =====================================================
// GET ALL SHOP CATEGORIES
// GET /api/shop-categories
// =====================================================

export const getShopCategories = async (req, res) => {
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
            .input(
                "ShopID",
                sql.Int,
                Number(shopID)
            )
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
                    IsActive,
                    CreatedAt,
                    UpdatedAt
                FROM dbo.Categories
                WHERE ShopID = @ShopID
                ORDER BY
                    SortOrder ASC,
                    CategoryID DESC
            `);

        return res.status(200).json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error(
            "Get Shop Categories Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to fetch categories.",
            error: error.message
        });
    }
};


// =====================================================
// GET SINGLE SHOP CATEGORY
// GET /api/shop-categories/:id
// =====================================================

export const getShopCategoryById = async (req, res) => {
    try {
        const shopID = getShopID(req);
        const categoryID = Number(req.params.id);

        if (!shopID) {
            return res.status(401).json({
                success: false,
                message: "Shop session not found."
            });
        }

        if (!categoryID) {
            return res.status(400).json({
                success: false,
                message: "Valid category ID is required."
            });
        }

        const db = getDB();

        const result = await db
            .request()
            .input(
                "CategoryID",
                sql.Int,
                categoryID
            )
            .input(
                "ShopID",
                sql.Int,
                Number(shopID)
            )
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
                    IsActive,
                    CreatedAt,
                    UpdatedAt
                FROM dbo.Categories
                WHERE
                    CategoryID = @CategoryID
                    AND ShopID = @ShopID
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Category not found."
            });
        }

        return res.status(200).json({
            success: true,
            data: result.recordset[0]
        });

    } catch (error) {
        console.error(
            "Get Shop Category Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to fetch category.",
            error: error.message
        });
    }
};


// =====================================================
// CREATE SHOP CATEGORY
// POST /api/shop-categories
// =====================================================

export const createShopCategory = async (req, res) => {
    try {
        const shopID = getShopID(req);

        if (!shopID) {
            return res.status(401).json({
                success: false,
                message: "Shop session not found."
            });
        }

        const {
            parentCategoryID,
            categoryName,
            slug,
            description,
            imageURL,
            sortOrder,
            isActive
        } = req.body;

        if (
            !categoryName ||
            !categoryName.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Category name is required."
            });
        }

        // =================================================
        // GENERATE SLUG
        // =================================================

        const finalSlug = (
            slug ||
            categoryName
        )
            .toString()
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");

        if (!finalSlug) {
            return res.status(400).json({
                success: false,
                message: "Valid category slug is required."
            });
        }

        const db = getDB();

        // =================================================
        // CHECK DUPLICATE SLUG FOR SAME SHOP
        // =================================================

        const duplicate = await db
            .request()
            .input(
                "ShopID",
                sql.Int,
                Number(shopID)
            )
            .input(
                "Slug",
                sql.NVarChar(360),
                finalSlug
            )
            .query(`
                SELECT CategoryID
                FROM dbo.Categories
                WHERE
                    ShopID = @ShopID
                    AND Slug = @Slug
            `);

        if (duplicate.recordset.length > 0) {
            return res.status(409).json({
                success: false,
                message:
                    "A category with this slug already exists."
            });
        }

        // =================================================
        // CHECK PARENT CATEGORY
        // PARENT MUST BELONG TO SAME SHOP
        // =================================================

        if (
            parentCategoryID !== undefined &&
            parentCategoryID !== null &&
            parentCategoryID !== ""
        ) {
            const parentResult = await db
                .request()
                .input(
                    "ParentCategoryID",
                    sql.Int,
                    Number(parentCategoryID)
                )
                .input(
                    "ShopID",
                    sql.Int,
                    Number(shopID)
                )
                .query(`
                    SELECT CategoryID
                    FROM dbo.Categories
                    WHERE
                        CategoryID = @ParentCategoryID
                        AND ShopID = @ShopID
                `);

            if (parentResult.recordset.length === 0) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Parent category does not belong to this shop."
                });
            }
        }

        // =================================================
        // INSERT
        // =================================================

        const result = await db
            .request()
            .input(
                "ShopID",
                sql.Int,
                Number(shopID)
            )
            .input(
                "ParentCategoryID",
                sql.Int,
                parentCategoryID
                    ? Number(parentCategoryID)
                    : null
            )
            .input(
                "CategoryName",
                sql.NVarChar(300),
                categoryName.trim()
            )
            .input(
                "Slug",
                sql.NVarChar(360),
                finalSlug
            )
            .input(
                "Description",
                sql.NVarChar(2000),
                description?.trim() || null
            )
            .input(
                "ImageURL",
                sql.NVarChar(1000),
                imageURL?.trim() || null
            )
            .input(
                "SortOrder",
                sql.Int,
                sortOrder !== undefined &&
                sortOrder !== ""
                    ? Number(sortOrder)
                    : 0
            )
            .input(
                "IsActive",
                sql.Bit,
                isActive !== undefined
                    ? Boolean(isActive)
                    : true
            )
            .query(`
                INSERT INTO dbo.Categories
                (
                    ShopID,
                    ParentCategoryID,
                    CategoryName,
                    Slug,
                    Description,
                    ImageURL,
                    SortOrder,
                    IsActive,
                    CreatedAt,
                    UpdatedAt
                )
                OUTPUT
                    INSERTED.CategoryID,
                    INSERTED.ShopID,
                    INSERTED.ParentCategoryID,
                    INSERTED.CategoryName,
                    INSERTED.Slug,
                    INSERTED.Description,
                    INSERTED.ImageURL,
                    INSERTED.SortOrder,
                    INSERTED.IsActive,
                    INSERTED.CreatedAt,
                    INSERTED.UpdatedAt
                VALUES
                (
                    @ShopID,
                    @ParentCategoryID,
                    @CategoryName,
                    @Slug,
                    @Description,
                    @ImageURL,
                    @SortOrder,
                    @IsActive,
                    SYSDATETIME(),
                    SYSDATETIME()
                )
            `);

        return res.status(201).json({
            success: true,
            message: "Category created successfully.",
            data: result.recordset[0]
        });

    } catch (error) {
        console.error(
            "Create Shop Category Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to create category.",
            error: error.message
        });
    }
};


// =====================================================
// UPDATE SHOP CATEGORY
// PUT /api/shop-categories/:id
// =====================================================

export const updateShopCategory = async (req, res) => {
    try {
        const shopID = getShopID(req);
        const categoryID = Number(req.params.id);

        if (!shopID) {
            return res.status(401).json({
                success: false,
                message: "Shop session not found."
            });
        }

        if (!categoryID) {
            return res.status(400).json({
                success: false,
                message: "Valid category ID is required."
            });
        }

        const {
            parentCategoryID,
            categoryName,
            slug,
            description,
            imageURL,
            sortOrder,
            isActive
        } = req.body;

        if (
            !categoryName ||
            !categoryName.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Category name is required."
            });
        }

        const finalSlug = (
            slug ||
            categoryName
        )
            .toString()
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");

        const db = getDB();

        // =================================================
        // CHECK CATEGORY BELONGS TO LOGGED-IN SHOP
        // =================================================

        const existing = await db
            .request()
            .input(
                "CategoryID",
                sql.Int,
                categoryID
            )
            .input(
                "ShopID",
                sql.Int,
                Number(shopID)
            )
            .query(`
                SELECT CategoryID
                FROM dbo.Categories
                WHERE
                    CategoryID = @CategoryID
                    AND ShopID = @ShopID
            `);

        if (existing.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Category not found."
            });
        }

        // =================================================
        // PREVENT CATEGORY FROM BECOMING ITS OWN PARENT
        // =================================================

        if (
            parentCategoryID &&
            Number(parentCategoryID) === categoryID
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "A category cannot be its own parent."
            });
        }

        // =================================================
        // CHECK PARENT BELONGS TO SAME SHOP
        // =================================================

        if (
            parentCategoryID !== undefined &&
            parentCategoryID !== null &&
            parentCategoryID !== ""
        ) {
            const parentResult = await db
                .request()
                .input(
                    "ParentCategoryID",
                    sql.Int,
                    Number(parentCategoryID)
                )
                .input(
                    "ShopID",
                    sql.Int,
                    Number(shopID)
                )
                .query(`
                    SELECT CategoryID
                    FROM dbo.Categories
                    WHERE
                        CategoryID = @ParentCategoryID
                        AND ShopID = @ShopID
                `);

            if (parentResult.recordset.length === 0) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Parent category does not belong to this shop."
                });
            }
        }

        // =================================================
        // CHECK DUPLICATE SLUG
        // =================================================

        const duplicate = await db
            .request()
            .input(
                "CategoryID",
                sql.Int,
                categoryID
            )
            .input(
                "ShopID",
                sql.Int,
                Number(shopID)
            )
            .input(
                "Slug",
                sql.NVarChar(360),
                finalSlug
            )
            .query(`
                SELECT CategoryID
                FROM dbo.Categories
                WHERE
                    ShopID = @ShopID
                    AND Slug = @Slug
                    AND CategoryID <> @CategoryID
            `);

        if (duplicate.recordset.length > 0) {
            return res.status(409).json({
                success: false,
                message:
                    "Another category with this slug already exists."
            });
        }

        // =================================================
        // UPDATE
        // =================================================

        const result = await db
            .request()
            .input(
                "CategoryID",
                sql.Int,
                categoryID
            )
            .input(
                "ShopID",
                sql.Int,
                Number(shopID)
            )
            .input(
                "ParentCategoryID",
                sql.Int,
                parentCategoryID
                    ? Number(parentCategoryID)
                    : null
            )
            .input(
                "CategoryName",
                sql.NVarChar(300),
                categoryName.trim()
            )
            .input(
                "Slug",
                sql.NVarChar(360),
                finalSlug
            )
            .input(
                "Description",
                sql.NVarChar(2000),
                description?.trim() || null
            )
            .input(
                "ImageURL",
                sql.NVarChar(1000),
                imageURL?.trim() || null
            )
            .input(
                "SortOrder",
                sql.Int,
                sortOrder !== undefined &&
                sortOrder !== ""
                    ? Number(sortOrder)
                    : 0
            )
            .input(
                "IsActive",
                sql.Bit,
                isActive !== undefined
                    ? Boolean(isActive)
                    : true
            )
            .query(`
                UPDATE dbo.Categories
                SET
                    ParentCategoryID = @ParentCategoryID,
                    CategoryName = @CategoryName,
                    Slug = @Slug,
                    Description = @Description,
                    ImageURL = @ImageURL,
                    SortOrder = @SortOrder,
                    IsActive = @IsActive,
                    UpdatedAt = SYSDATETIME()
                WHERE
                    CategoryID = @CategoryID
                    AND ShopID = @ShopID;

                SELECT
                    CategoryID,
                    ShopID,
                    ParentCategoryID,
                    CategoryName,
                    Slug,
                    Description,
                    ImageURL,
                    SortOrder,
                    IsActive,
                    CreatedAt,
                    UpdatedAt
                FROM dbo.Categories
                WHERE
                    CategoryID = @CategoryID
                    AND ShopID = @ShopID;
            `);

        return res.status(200).json({
            success: true,
            message: "Category updated successfully.",
            data: result.recordset[0]
        });

    } catch (error) {
        console.error(
            "Update Shop Category Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to update category.",
            error: error.message
        });
    }
};


// =====================================================
// DELETE SHOP CATEGORY
// DELETE /api/shop-categories/:id
// =====================================================

export const deleteShopCategory = async (req, res) => {
    try {
        const shopID = getShopID(req);
        const categoryID = Number(req.params.id);

        if (!shopID) {
            return res.status(401).json({
                success: false,
                message: "Shop session not found."
            });
        }

        if (!categoryID) {
            return res.status(400).json({
                success: false,
                message: "Valid category ID is required."
            });
        }

        const db = getDB();

        // =================================================
        // CHECK CATEGORY BELONGS TO SHOP
        // =================================================

        const existing = await db
            .request()
            .input(
                "CategoryID",
                sql.Int,
                categoryID
            )
            .input(
                "ShopID",
                sql.Int,
                Number(shopID)
            )
            .query(`
                SELECT CategoryID
                FROM dbo.Categories
                WHERE
                    CategoryID = @CategoryID
                    AND ShopID = @ShopID
            `);

        if (existing.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Category not found."
            });
        }

        // =================================================
        // CHECK CHILD CATEGORIES
        // =================================================

        const children = await db
            .request()
            .input(
                "CategoryID",
                sql.Int,
                categoryID
            )
            .input(
                "ShopID",
                sql.Int,
                Number(shopID)
            )
            .query(`
                SELECT CategoryID
                FROM dbo.Categories
                WHERE
                    ParentCategoryID = @CategoryID
                    AND ShopID = @ShopID
            `);

        if (children.recordset.length > 0) {
            return res.status(409).json({
                success: false,
                message:
                    "Cannot delete this category because it has subcategories."
            });
        }

        const products = await db.request()
            .input("CategoryID", categoryID)
            .input("ShopID", Number(shopID))
            .query("SELECT TOP 1 ProductID FROM dbo.Products WHERE CategoryID = @CategoryID AND ShopID = @ShopID");
        if (products.recordset.length > 0) {
            return res.status(409).json({ success: false, message: "This category still has products. Move or delete them first." });
        }
        const hasTemplates = await db.request().query(`
            SELECT CASE WHEN OBJECT_ID(N'dbo.SpecificationTemplates', N'U') IS NULL THEN 0 ELSE 1 END AS HasTable
        `);
        const templates = hasTemplates.recordset[0]?.HasTable ? await db.request()
            .input("CategoryID", categoryID)
            .input("ShopID", Number(shopID))
            .query(`SELECT TOP 1 st.SpecificationTemplateID FROM dbo.SpecificationTemplates st INNER JOIN dbo.Categories c ON c.CategoryID = st.CategoryID WHERE st.CategoryID = @CategoryID AND c.ShopID = @ShopID`) : { recordset: [] };
        if (templates.recordset.length > 0) {
            return res.status(409).json({ success: false, message: "This category has specification templates and cannot be deleted." });
        }

        // =================================================
        // DELETE
        // =================================================

        const result = await db
            .request()
            .input(
                "CategoryID",
                sql.Int,
                categoryID
            )
            .input(
                "ShopID",
                sql.Int,
                Number(shopID)
            )
            .query(`
                DELETE FROM dbo.Categories
                OUTPUT DELETED.CategoryID
                WHERE
                    CategoryID = @CategoryID
                    AND ShopID = @ShopID
            `);

        if (!result.recordset.length) {
            return res.status(404).json({
                success: false,
                message: "Category not found."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Category deleted successfully."
        });

    } catch (error) {
        console.error(
            "Delete Shop Category Error:",
            error
        );

        const isForeignKeyError = /foreign key|reference constraint|conflicted with the reference/i.test(error.message || "");
        return res.status(isForeignKeyError ? 409 : 500).json({
            success: false,
            message: isForeignKeyError
                ? "This category is still in use and cannot be deleted. Move its related records first."
                : "Failed to delete category.",
            error: error.message
        });
    }
};
