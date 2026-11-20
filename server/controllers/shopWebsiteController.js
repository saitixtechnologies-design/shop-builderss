import { getDB } from "../config/db.js";

const allowedPageTypes = new Set(["about", "services", "gallery", "contact", "custom"]);
const allowedStatuses = new Set(["Active", "Inactive"]);
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SQL_INT_MAX = 2147483647;
const pageColumns = {
    pageName: "PageName",
    slug: "Slug",
    pageTitle: "PageTitle",
    htmlContent: "HtmlContent",
    pageType: "PageType",
    status: "Status",
    displayOrder: "DisplayOrder"
};

const pageSelect = `
    PageID, ShopID, PageName, Slug, PageTitle, HtmlContent,
    PageType, Status, DisplayOrder, CreatedAt, UpdatedAt
`;
const insertedPageSelect = `
    INSERTED.PageID, INSERTED.ShopID, INSERTED.PageName, INSERTED.Slug,
    INSERTED.PageTitle, INSERTED.HtmlContent, INSERTED.PageType,
    INSERTED.Status, INSERTED.DisplayOrder, INSERTED.CreatedAt, INSERTED.UpdatedAt
`;

const isPositiveInteger = (value) => {
    if (typeof value === "number") return Number.isSafeInteger(value) && value > 0 && value <= SQL_INT_MAX;
    if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return false;
    return Number.isSafeInteger(Number(value)) && Number(value) <= SQL_INT_MAX;
};

const isUniqueSlugError = (error) =>
    error?.number === 2601 ||
    error?.number === 2627 ||
    String(error?.message || "").includes("UQ_ShopWebsitePages_ShopID_Slug");

const sendDatabaseError = (res, error, action) => {
    console.error(`${action} Shop Website Page Error:`, error);
    return res.status(500).json({
        success: false,
        message: `Failed to ${action.toLowerCase()} shop website page.`,
        error: error.message
    });
};

const validateField = (field, value) => {
    if (field === "pageName") {
        if (typeof value !== "string" || !value.trim()) return "Page name is required.";
        if (value.trim().length > 150) return "Page name cannot exceed 150 characters.";
    }
    if (field === "slug") {
        if (typeof value !== "string" || !value.trim()) return "Slug is required.";
        const slug = value.trim();
        if (slug.length > 180 || !slugPattern.test(slug)) {
            return "Slug must be lowercase letters or numbers separated by single hyphens (for example, about-us).";
        }
    }
    if (field === "pageTitle" && value !== null) {
        if (typeof value !== "string") return "Page title must be a string or null.";
        if (value.length > 250) return "Page title cannot exceed 250 characters.";
    }
    if (field === "htmlContent" && value !== null && typeof value !== "string") {
        return "HTML content must be a string or null.";
    }
    if (field === "pageType" && !allowedPageTypes.has(value)) {
        return "Page type must be about, services, gallery, contact, or custom.";
    }
    if (field === "status" && !allowedStatuses.has(value)) {
        return "Status must be Active or Inactive.";
    }
    if (field === "displayOrder" && (!Number.isSafeInteger(value) || value < 0 || value > SQL_INT_MAX)) {
        return "Display order must be a non-negative 32-bit integer.";
    }
    return null;
};

const validatePageIdParams = (req, res) => {
    if (!isPositiveInteger(req.params.shopId)) {
        res.status(400).json({ success: false, message: "A valid ShopID is required." });
        return null;
    }
    if (!isPositiveInteger(req.params.pageId)) {
        res.status(400).json({ success: false, message: "A valid PageID is required." });
        return null;
    }
    return { shopId: Number(req.params.shopId), pageId: Number(req.params.pageId) };
};

const shopExists = async (db, shopId) => {
    const result = await db.request()
        .input("ShopID", shopId)
        .query("SELECT ShopID FROM dbo.Shops WHERE ShopID = @ShopID");
    return result.recordset.length > 0;
};

const findDuplicateSlug = async (db, shopId, slug, excludedPageId = null) => {
    const request = db.request().input("ShopID", shopId).input("Slug", slug);
    let pageFilter = "";
    if (excludedPageId !== null) {
        request.input("PageID", excludedPageId);
        pageFilter = "AND PageID <> @PageID";
    }
    const result = await request.query(`
        SELECT PageID
        FROM dbo.ShopWebsitePages
        WHERE ShopID = @ShopID AND Slug = @Slug ${pageFilter}
    `);
    return result.recordset.length > 0;
};

// POST /api/shop-website/pages
export const createShopWebsitePage = async (req, res) => {
    try {
        const body = req.body || {};
        if (!isPositiveInteger(body.shopId)) {
            return res.status(400).json({ success: false, message: "A valid ShopID is required." });
        }

        const page = {
            pageName: body.pageName,
            slug: body.slug,
            pageTitle: body.pageTitle ?? null,
            htmlContent: body.htmlContent ?? null,
            pageType: body.pageType ?? "custom",
            status: body.status ?? "Active",
            displayOrder: body.displayOrder ?? 0
        };
        for (const [field, value] of Object.entries(page)) {
            const validationError = validateField(field, value);
            if (validationError) return res.status(400).json({ success: false, message: validationError });
            if (typeof value === "string" && ["pageName", "slug"].includes(field)) page[field] = value.trim();
        }

        const shopId = Number(body.shopId);
        const db = getDB();
        if (!(await shopExists(db, shopId))) {
            return res.status(404).json({ success: false, message: "Shop not found." });
        }
        if (await findDuplicateSlug(db, shopId, page.slug)) {
            return res.status(409).json({ success: false, message: "This page slug already exists for this shop." });
        }

        const result = await db.request()
            .input("ShopID", shopId)
            .input("PageName", page.pageName)
            .input("Slug", page.slug)
            .input("PageTitle", page.pageTitle)
            .input("HtmlContent", page.htmlContent)
            .input("PageType", page.pageType)
            .input("Status", page.status)
            .input("DisplayOrder", page.displayOrder)
            .query(`
                INSERT INTO dbo.ShopWebsitePages
                    (ShopID, PageName, Slug, PageTitle, HtmlContent, PageType, Status, DisplayOrder)
                OUTPUT ${insertedPageSelect}
                VALUES
                    (@ShopID, @PageName, @Slug, @PageTitle, @HtmlContent, @PageType, @Status, @DisplayOrder)
            `);

        return res.status(201).json({
            success: true,
            message: "Shop website page created successfully.",
            data: result.recordset[0]
        });
    } catch (error) {
        if (isUniqueSlugError(error)) {
            return res.status(409).json({ success: false, message: "This page slug already exists for this shop." });
        }
        return sendDatabaseError(res, error, "Create");
    }
};

// GET /api/shop-website/pages/:shopId
export const getShopWebsitePages = async (req, res) => {
    try {
        if (!isPositiveInteger(req.params.shopId)) {
            return res.status(400).json({ success: false, message: "A valid ShopID is required." });
        }
        const shopId = Number(req.params.shopId);
        const db = getDB();
        if (!(await shopExists(db, shopId))) {
            return res.status(404).json({ success: false, message: "Shop not found." });
        }
        const result = await db.request()
            .input("ShopID", shopId)
            .query(`
                SELECT ${pageSelect}
                FROM dbo.ShopWebsitePages
                WHERE ShopID = @ShopID
                ORDER BY DisplayOrder ASC, PageID ASC
            `);
        return res.status(200).json({ success: true, data: result.recordset });
    } catch (error) {
        return sendDatabaseError(res, error, "Fetch");
    }
};

// GET /api/shop-website/pages/:shopId/:pageId
export const getShopWebsitePage = async (req, res) => {
    try {
        const ids = validatePageIdParams(req, res);
        if (!ids) return;
        const db = getDB();
        if (!(await shopExists(db, ids.shopId))) {
            return res.status(404).json({ success: false, message: "Shop not found." });
        }
        const result = await db.request()
            .input("ShopID", ids.shopId)
            .input("PageID", ids.pageId)
            .query(`
                SELECT ${pageSelect}
                FROM dbo.ShopWebsitePages
                WHERE ShopID = @ShopID AND PageID = @PageID
            `);
        if (!result.recordset.length) {
            return res.status(404).json({ success: false, message: "Page not found for this shop." });
        }
        return res.status(200).json({ success: true, data: result.recordset[0] });
    } catch (error) {
        return sendDatabaseError(res, error, "Fetch");
    }
};

// PUT /api/shop-website/pages/:shopId/:pageId
export const updateShopWebsitePage = async (req, res) => {
    try {
        const ids = validatePageIdParams(req, res);
        if (!ids) return;
        const body = req.body || {};
        const fields = Object.keys(pageColumns).filter((field) =>
            Object.prototype.hasOwnProperty.call(body, field)
        );
        if (!fields.length) {
            return res.status(400).json({ success: false, message: "At least one page field must be provided." });
        }
        for (const field of fields) {
            const validationError = validateField(field, body[field]);
            if (validationError) return res.status(400).json({ success: false, message: validationError });
        }

        const db = getDB();
        if (!(await shopExists(db, ids.shopId))) {
            return res.status(404).json({ success: false, message: "Shop not found." });
        }
        const existing = await db.request()
            .input("ShopID", ids.shopId)
            .input("PageID", ids.pageId)
            .query(`
                SELECT PageID
                FROM dbo.ShopWebsitePages
                WHERE ShopID = @ShopID AND PageID = @PageID
            `);
        if (!existing.recordset.length) {
            return res.status(404).json({ success: false, message: "Page not found for this shop." });
        }
        if (Object.prototype.hasOwnProperty.call(body, "slug")) {
            const slug = body.slug.trim();
            if (await findDuplicateSlug(db, ids.shopId, slug, ids.pageId)) {
                return res.status(409).json({ success: false, message: "This page slug already exists for this shop." });
            }
        }

        const request = db.request().input("ShopID", ids.shopId).input("PageID", ids.pageId);
        const assignments = fields.map((field, index) => {
            const parameter = `Field${index}`;
            let value = body[field];
            if (typeof value === "string" && ["pageName", "slug"].includes(field)) value = value.trim();
            request.input(parameter, value);
            return `${pageColumns[field]} = @${parameter}`;
        });
        assignments.push("UpdatedAt = SYSUTCDATETIME()");

        const result = await request.query(`
            UPDATE dbo.ShopWebsitePages
            SET ${assignments.join(", ")}
            OUTPUT ${insertedPageSelect}
            WHERE ShopID = @ShopID AND PageID = @PageID
        `);
        return res.status(200).json({
            success: true,
            message: "Shop website page updated successfully.",
            data: result.recordset[0]
        });
    } catch (error) {
        if (isUniqueSlugError(error)) {
            return res.status(409).json({ success: false, message: "This page slug already exists for this shop." });
        }
        return sendDatabaseError(res, error, "Update");
    }
};

// DELETE /api/shop-website/pages/:shopId/:pageId
export const deleteShopWebsitePage = async (req, res) => {
    try {
        const ids = validatePageIdParams(req, res);
        if (!ids) return;
        const result = await getDB().request()
            .input("ShopID", ids.shopId)
            .input("PageID", ids.pageId)
            .query(`
                DELETE FROM dbo.ShopWebsitePages
                OUTPUT DELETED.PageID, DELETED.ShopID
                WHERE ShopID = @ShopID AND PageID = @PageID
            `);
        if (!result.recordset.length) {
            return res.status(404).json({ success: false, message: "Page not found for this shop." });
        }
        return res.status(200).json({
            success: true,
            message: "Shop website page deleted successfully.",
            data: result.recordset[0]
        });
    } catch (error) {
        return sendDatabaseError(res, error, "Delete");
    }
};

// PATCH /api/shop-website/pages/:shopId/:pageId/status
export const updateShopWebsitePageStatus = async (req, res) => {
    try {
        const ids = validatePageIdParams(req, res);
        if (!ids) return;
        const status = req.body?.status;
        const validationError = validateField("status", status);
        if (validationError) return res.status(400).json({ success: false, message: validationError });

        const result = await getDB().request()
            .input("ShopID", ids.shopId)
            .input("PageID", ids.pageId)
            .input("Status", status)
            .query(`
                UPDATE dbo.ShopWebsitePages
                SET Status = @Status, UpdatedAt = SYSUTCDATETIME()
                OUTPUT ${insertedPageSelect}
                WHERE ShopID = @ShopID AND PageID = @PageID
            `);
        if (!result.recordset.length) {
            return res.status(404).json({ success: false, message: "Page not found for this shop." });
        }
        return res.status(200).json({
            success: true,
            message: "Shop website page status updated successfully.",
            data: result.recordset[0]
        });
    } catch (error) {
        return sendDatabaseError(res, error, "Update status for");
    }
};
