import { getDB } from "../config/db.js";
import sql from "mssql";

// =====================================================
// CREATE CATEGORY
// =====================================================

export const createCategory = async (req, res) => {
    try {
        const {
            shopID,
            parentCategoryID,
            categoryName,
            slug,
            description,
            imageURL,
            sortOrder,
            isActive
        } = req.body;

        // -------------------------------------------------
        // 1. BASIC VALIDATION
        // -------------------------------------------------

        if (!shopID || !categoryName || !slug) {
            return res.status(400).json({
                success: false,
                message: "ShopID, category name and slug are required."
            });
        }

        const pool = getDB();

        // -------------------------------------------------
        // 2. CHECK SHOP EXISTS
        // -------------------------------------------------

        const shopResult = await pool
            .request()
            .input("ShopID", sql.Int, shopID)
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

        // -------------------------------------------------
        // 3. CHECK DUPLICATE SLUG FOR SAME SHOP
        // -------------------------------------------------

        const duplicateSlug = await pool
            .request()
            .input("ShopID", sql.Int, shopID)
            .input("Slug", slug.trim())
            .query(`
                SELECT CategoryID
                FROM dbo.Categories
                WHERE ShopID = @ShopID
                AND Slug = @Slug
            `);

        if (duplicateSlug.recordset.length > 0) {
            return res.status(409).json({
                success: false,
                message: "This category slug already exists for this shop."
            });
        }

        // -------------------------------------------------
        // 4. CHECK PARENT CATEGORY
        // -------------------------------------------------

        if (parentCategoryID) {
            const parentResult = await pool
                .request()
                .input("ParentCategoryID", sql.Int, parentCategoryID)
                .input("ShopID", sql.Int, shopID)
                .query(`
                    SELECT CategoryID
                    FROM dbo.Categories
                    WHERE CategoryID = @ParentCategoryID
                    AND ShopID = @ShopID
                `);

            if (parentResult.recordset.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Parent category does not belong to this shop."
                });
            }
        }

        // -------------------------------------------------
        // 5. INSERT CATEGORY
        // -------------------------------------------------

        const result = await pool
            .request()
            .input("ShopID", sql.Int, shopID)
            .input(
                "ParentCategoryID",
                parentCategoryID ? Number(parentCategoryID) : null
            )
            .input("CategoryName", categoryName.trim())
            .input("Slug", slug.trim())
            .input(
                "Description",
                description?.trim() || null
            )
            .input(
                "ImageURL",
                imageURL?.trim() || null
            )
            .input(
                "SortOrder",
                sortOrder !== undefined
                    ? Number(sortOrder)
                    : 0
            )
            .input(
                "IsActive",
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
        console.error("Create Category Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create category.",
            error: error.message
        });
    }
};


// =====================================================
// GET ALL CATEGORIES
// =====================================================

export const getAllCategories = async (req, res) => {
    try {
        const { shopID } = req.query;

        const pool = getDB();

        let query = `
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
        `;

        const request = pool.request();

        // -------------------------------------------------
        // OPTIONAL SHOP FILTER
        // -------------------------------------------------

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
            ORDER BY
                SortOrder ASC,
                CategoryID DESC
        `;

        const result = await request.query(query);

        return res.status(200).json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error("Get Categories Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch categories.",
            error: error.message
        });
    }
};


// =====================================================
// GET CATEGORY BY ID
// =====================================================

export const getCategoryById = async (req, res) => {
    try {
        const { id } = req.params;

        const pool = getDB();

        const result = await pool
            .request()
            .input(
                "CategoryID",
                sql.Int,
                Number(id)
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
                WHERE CategoryID = @CategoryID
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
        console.error("Get Category Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch category.",
            error: error.message
        });
    }
};


// =====================================================
// UPDATE CATEGORY
// =====================================================

export const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            shopID,
            parentCategoryID,
            categoryName,
            slug,
            description,
            imageURL,
            sortOrder,
            isActive
        } = req.body;

        // -------------------------------------------------
        // 1. VALIDATION
        // -------------------------------------------------

        if (!shopID || !categoryName || !slug) {
            return res.status(400).json({
                success: false,
                message: "ShopID, category name and slug are required."
            });
        }

        const pool = getDB();

        // -------------------------------------------------
        // 2. CHECK CATEGORY EXISTS
        // -------------------------------------------------

        const categoryResult = await pool
            .request()
            .input(
                "CategoryID",
                sql.Int,
                Number(id)
            )
            .query(`
                SELECT
                    CategoryID,
                    ShopID
                FROM dbo.Categories
                WHERE CategoryID = @CategoryID
            `);

        if (categoryResult.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Category not found."
            });
        }

        const existingCategory =
            categoryResult.recordset[0];

        // -------------------------------------------------
        // 3. SHOP ISOLATION
        // -------------------------------------------------

        if (
            Number(existingCategory.ShopID) !==
            Number(shopID)
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "You cannot update a category from another shop."
            });
        }

        // -------------------------------------------------
        // 4. CHECK DUPLICATE SLUG
        // -------------------------------------------------

        const duplicateSlug = await pool
            .request()
            .input("ShopID", sql.Int, Number(shopID))
            .input("Slug", slug.trim())
            .input(
                "CategoryID",
                sql.Int,
                Number(id)
            )
            .query(`
                SELECT CategoryID
                FROM dbo.Categories
                WHERE ShopID = @ShopID
                AND Slug = @Slug
                AND CategoryID <> @CategoryID
            `);

        if (duplicateSlug.recordset.length > 0) {
            return res.status(409).json({
                success: false,
                message:
                    "This category slug already exists for this shop."
            });
        }

        // -------------------------------------------------
        // 5. CHECK PARENT
        // -------------------------------------------------

        if (parentCategoryID) {

            // Category cannot be its own parent
            if (
                Number(parentCategoryID) ===
                Number(id)
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "A category cannot be its own parent."
                });
            }

            const parentResult = await pool
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
                    WHERE CategoryID = @ParentCategoryID
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

        // -------------------------------------------------
        // 6. UPDATE
        // -------------------------------------------------

        const result = await pool
            .request()
            .input(
                "CategoryID",
                sql.Int,
                Number(id)
            )
            .input(
                "ParentCategoryID",
                parentCategoryID
                    ? Number(parentCategoryID)
                    : null
            )
            .input(
                "CategoryName",
                categoryName.trim()
            )
            .input(
                "Slug",
                slug.trim()
            )
            .input(
                "Description",
                description?.trim() || null
            )
            .input(
                "ImageURL",
                imageURL?.trim() || null
            )
            .input(
                "SortOrder",
                sortOrder !== undefined
                    ? Number(sortOrder)
                    : 0
            )
            .input(
                "IsActive",
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
                WHERE CategoryID = @CategoryID
            `);

        return res.status(200).json({
            success: true,
            message: "Category updated successfully.",
            data: result.recordset[0]
        });

    } catch (error) {
        console.error("Update Category Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update category.",
            error: error.message
        });
    }
};


// =====================================================
// DELETE CATEGORY
// =====================================================

export const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const categoryID = Number(id);
        if (!Number.isInteger(categoryID) || categoryID < 1) {
            return res.status(400).json({ success: false, message: "Valid Category ID is required." });
        }

        const pool = getDB();

        // -------------------------------------------------
        // 1. CHECK CATEGORY
        // -------------------------------------------------

        const categoryResult = await pool
            .request()
            .input(
                "CategoryID",
                sql.Int,
                categoryID
            )
            .query(`
                SELECT
                    CategoryID,
                    ShopID
                FROM dbo.Categories
                WHERE CategoryID = @CategoryID
            `);

        if (categoryResult.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Category not found."
            });
        }

        // -------------------------------------------------
        // 2. SHOP ISOLATION
        // -------------------------------------------------

        if (
            Number(categoryResult.recordset[0].ShopID) !==
            Number(shopID)
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "You cannot delete a category from another shop."
            });
        }

        // -------------------------------------------------
        // 3. CHECK CHILD CATEGORIES
        // -------------------------------------------------

        const childResult = await pool
            .request()
            .input(
                "ParentCategoryID",
                sql.Int,
                categoryID
            )
            .query(`
                SELECT CategoryID
                FROM dbo.Categories
                WHERE ParentCategoryID = @ParentCategoryID
            `);

        if (childResult.recordset.length > 0) {
            return res.status(409).json({
                success: false,
                message:
                    "This category has subcategories. Delete or move the subcategories first."
            });
        }

        const productResult = await pool.request()
            .input("CategoryID", sql.Int, categoryID)
            .query("SELECT TOP 1 ProductID FROM dbo.Products WHERE CategoryID = @CategoryID");
        if (productResult.recordset.length > 0) {
            return res.status(409).json({ success: false, message: "This category still has products. Move or delete them first." });
        }

        const templateResult = await pool.request()
            .input("CategoryID", sql.Int, categoryID)
            .query("SELECT TOP 1 SpecificationTemplateID FROM dbo.SpecificationTemplates WHERE CategoryID = @CategoryID");
        if (templateResult.recordset.length > 0) {
            return res.status(409).json({ success: false, message: "This category has specification templates and cannot be deleted." });
        }

        // -------------------------------------------------
        // 4. DELETE
        // -------------------------------------------------

        await pool
            .request()
            .input(
                "CategoryID",
                sql.Int,
                categoryID
            )
            .query(`
                DELETE FROM dbo.Categories
                OUTPUT DELETED.CategoryID
                WHERE CategoryID = @CategoryID
            `);
        if (!result.recordset.length) {
            return res.status(404).json({ success: false, message: "Category not found." });
        }

        return res.status(200).json({
            success: true,
            message: "Category deleted successfully."
        });

    } catch (error) {
        console.error("Delete Category Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete category.",
            error: error.message
        });
    }
};
