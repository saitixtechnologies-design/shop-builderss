import { getDB } from "../config/db.js";

const cleanText = (value) => {
    if (value === undefined || value === null) {
        return null;
    }

    const text = String(value).trim();
    return text === "" ? null : text;
};

// =====================================================
// GET ALL BANNERS
// GET /api/banners
// Optional: /api/banners?shopID=10
// =====================================================

export const getBanners = async (req, res) => {
    try {
        const db = getDB();

        const rawShopID = req.query.shopID;
        const shopID =
            rawShopID !== undefined && rawShopID !== ""
                ? Number(rawShopID)
                : null;

        if (
            rawShopID !== undefined &&
            (!Number.isInteger(shopID) || shopID <= 0)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid Shop ID."
            });
        }

        let query = `
            SELECT
                BannerID,
                ShopID,
                Title,
                Subtitle,
                ImageURL,
                ButtonText,
                ButtonLink,
                DisplayOrder,
                Status,
                StartDate,
                EndDate,
                CreatedAt,
                UpdatedAt
            FROM dbo.Banners
        `;

        const request = db.request();

        if (shopID !== null) {
            query += `
                WHERE ShopID = @ShopID
            `;

            request.input("ShopID", shopID);
        }

        query += `
            ORDER BY DisplayOrder ASC, BannerID DESC
        `;

        const result = await request.query(query);

        return res.status(200).json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error("Get Banners Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch banners.",
            error: error.message
        });
    }
};

// =====================================================
// GET SINGLE BANNER
// GET /api/banners/:id
// =====================================================

export const getBannerById = async (req, res) => {
    try {
        const bannerID = Number(req.params.id);

        if (!Number.isInteger(bannerID) || bannerID <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid banner ID."
            });
        }

        const db = getDB();

        const result = await db
            .request()
            .input("BannerID", bannerID)
            .query(`
                SELECT
                    BannerID,
                    ShopID,
                    Title,
                    Subtitle,
                    ImageURL,
                    ButtonText,
                    ButtonLink,
                    DisplayOrder,
                    Status,
                    StartDate,
                    EndDate,
                    CreatedAt,
                    UpdatedAt
                FROM dbo.Banners
                WHERE BannerID = @BannerID
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Banner not found."
            });
        }

        return res.status(200).json({
            success: true,
            data: result.recordset[0]
        });

    } catch (error) {
        console.error("Get Banner Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch banner.",
            error: error.message
        });
    }
};

// =====================================================
// CREATE BANNER
// POST /api/banners
// =====================================================

export const createBanner = async (req, res) => {
    try {
        const {
            shopID,
            title,
            subtitle,
            imageURL,
            buttonText,
            buttonLink,
            displayOrder,
            status,
            startDate,
            endDate
        } = req.body;

        const parsedShopID = Number(shopID);

        if (!Number.isInteger(parsedShopID) || parsedShopID <= 0) {
            return res.status(400).json({
                success: false,
                message: "Valid Shop ID is required."
            });
        }

        if (!title || !String(title).trim()) {
            return res.status(400).json({
                success: false,
                message: "Banner title is required."
            });
        }

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);

            if (
                Number.isNaN(start.getTime()) ||
                Number.isNaN(end.getTime())
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid banner dates."
                });
            }

            if (start > end) {
                return res.status(400).json({
                    success: false,
                    message: "Start date cannot be greater than end date."
                });
            }
        }

        let parsedDisplayOrder = 0;

        if (
            displayOrder !== undefined &&
            displayOrder !== null &&
            displayOrder !== ""
        ) {
            parsedDisplayOrder = Number(displayOrder);

            if (!Number.isFinite(parsedDisplayOrder)) {
                return res.status(400).json({
                    success: false,
                    message: "Display order must be a valid number."
                });
            }
        }

        const bannerStatus =
            status === "Inactive" ? "Inactive" : "Active";

        const db = getDB();

        // Check shop
        const shopResult = await db
            .request()
            .input("ShopID", parsedShopID)
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

        const result = await db
            .request()
            .input("ShopID", parsedShopID)
            .input("Title", String(title).trim())
            .input("Subtitle", cleanText(subtitle))
            .input("ImageURL", cleanText(imageURL))
            .input("ButtonText", cleanText(buttonText))
            .input("ButtonLink", cleanText(buttonLink))
            .input("DisplayOrder", parsedDisplayOrder)
            .input("Status", bannerStatus)
            .input("StartDate", startDate || null)
            .input("EndDate", endDate || null)
            .query(`
                INSERT INTO dbo.Banners
                (
                    ShopID,
                    Title,
                    Subtitle,
                    ImageURL,
                    ButtonText,
                    ButtonLink,
                    DisplayOrder,
                    Status,
                    StartDate,
                    EndDate
                )
                VALUES
                (
                    @ShopID,
                    @Title,
                    @Subtitle,
                    @ImageURL,
                    @ButtonText,
                    @ButtonLink,
                    @DisplayOrder,
                    @Status,
                    @StartDate,
                    @EndDate
                );

                SELECT
                    BannerID,
                    ShopID,
                    Title,
                    Subtitle,
                    ImageURL,
                    ButtonText,
                    ButtonLink,
                    DisplayOrder,
                    Status,
                    StartDate,
                    EndDate,
                    CreatedAt,
                    UpdatedAt
                FROM dbo.Banners
                WHERE BannerID = SCOPE_IDENTITY();
            `);

        return res.status(201).json({
            success: true,
            message: "Banner created successfully.",
            data: result.recordset[0]
        });

    } catch (error) {
        console.error("Create Banner Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create banner.",
            error: error.message
        });
    }
};

// =====================================================
// UPDATE BANNER
// PUT /api/banners/:id
// =====================================================

export const updateBanner = async (req, res) => {
    try {
        const bannerID = Number(req.params.id);

        if (!Number.isInteger(bannerID) || bannerID <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid banner ID."
            });
        }

        const {
            shopID,
            title,
            subtitle,
            imageURL,
            buttonText,
            buttonLink,
            displayOrder,
            status,
            startDate,
            endDate
        } = req.body;

        const parsedShopID = Number(shopID);

        if (!Number.isInteger(parsedShopID) || parsedShopID <= 0) {
            return res.status(400).json({
                success: false,
                message: "Valid Shop ID is required."
            });
        }

        if (!title || !String(title).trim()) {
            return res.status(400).json({
                success: false,
                message: "Banner title is required."
            });
        }

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);

            if (
                Number.isNaN(start.getTime()) ||
                Number.isNaN(end.getTime())
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid banner dates."
                });
            }

            if (start > end) {
                return res.status(400).json({
                    success: false,
                    message: "Start date cannot be greater than end date."
                });
            }
        }

        let parsedDisplayOrder = 0;

        if (
            displayOrder !== undefined &&
            displayOrder !== null &&
            displayOrder !== ""
        ) {
            parsedDisplayOrder = Number(displayOrder);

            if (!Number.isFinite(parsedDisplayOrder)) {
                return res.status(400).json({
                    success: false,
                    message: "Display order must be a valid number."
                });
            }
        }

        const bannerStatus =
            status === "Inactive" ? "Inactive" : "Active";

        const db = getDB();

        const existing = await db
            .request()
            .input("BannerID", bannerID)
            .input("ShopID", parsedShopID)
            .query(`
                SELECT BannerID
                FROM dbo.Banners
                WHERE BannerID = @BannerID
                  AND ShopID = @ShopID
            `);

        if (existing.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Banner not found for this shop."
            });
        }

        const result = await db
            .request()
            .input("BannerID", bannerID)
            .input("ShopID", parsedShopID)
            .input("Title", String(title).trim())
            .input("Subtitle", cleanText(subtitle))
            .input("ImageURL", cleanText(imageURL))
            .input("ButtonText", cleanText(buttonText))
            .input("ButtonLink", cleanText(buttonLink))
            .input("DisplayOrder", parsedDisplayOrder)
            .input("Status", bannerStatus)
            .input("StartDate", startDate || null)
            .input("EndDate", endDate || null)
            .query(`
                UPDATE dbo.Banners
                SET
                    Title = @Title,
                    Subtitle = @Subtitle,
                    ImageURL = @ImageURL,
                    ButtonText = @ButtonText,
                    ButtonLink = @ButtonLink,
                    DisplayOrder = @DisplayOrder,
                    Status = @Status,
                    StartDate = @StartDate,
                    EndDate = @EndDate,
                    UpdatedAt = SYSUTCDATETIME()
                WHERE BannerID = @BannerID
                  AND ShopID = @ShopID;

                SELECT
                    BannerID,
                    ShopID,
                    Title,
                    Subtitle,
                    ImageURL,
                    ButtonText,
                    ButtonLink,
                    DisplayOrder,
                    Status,
                    StartDate,
                    EndDate,
                    CreatedAt,
                    UpdatedAt
                FROM dbo.Banners
                WHERE BannerID = @BannerID
                  AND ShopID = @ShopID;
            `);

        return res.status(200).json({
            success: true,
            message: "Banner updated successfully.",
            data: result.recordset[0]
        });

    } catch (error) {
        console.error("Update Banner Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update banner.",
            error: error.message
        });
    }
};

// =====================================================
// DELETE BANNER
// DELETE /api/banners/:id?shopID=10
// =====================================================

export const deleteBanner = async (req, res) => {
    try {
        const bannerID = Number(req.params.id);

        if (!Number.isInteger(bannerID) || bannerID <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid banner ID."
            });
        }

        const shopID =
            req.body?.shopID ??
            req.query?.shopID;

        const parsedShopID = Number(shopID);

        if (!Number.isInteger(parsedShopID) || parsedShopID <= 0) {
            return res.status(400).json({
                success: false,
                message: "Valid Shop ID is required."
            });
        }

        const db = getDB();

        const result = await db
            .request()
            .input("BannerID", bannerID)
            .input("ShopID", parsedShopID)
            .query(`
                DELETE FROM dbo.Banners
                WHERE BannerID = @BannerID
                  AND ShopID = @ShopID
            `);

        if (
            !result.rowsAffected ||
            result.rowsAffected[0] === 0
        ) {
            return res.status(404).json({
                success: false,
                message: "Banner not found."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Banner deleted successfully."
        });

    } catch (error) {
        console.error("Delete Banner Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete banner.",
            error: error.message
        });
    }
};

// =====================================================
// TOGGLE BANNER STATUS
// PATCH /api/banners/:id/status
// =====================================================

export const toggleBannerStatus = async (req, res) => {
    try {
        const bannerID = Number(req.params.id);

        if (!Number.isInteger(bannerID) || bannerID <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid banner ID."
            });
        }

        const shopID =
            req.body?.shopID ??
            req.query?.shopID;

        const parsedShopID = Number(shopID);

        if (!Number.isInteger(parsedShopID) || parsedShopID <= 0) {
            return res.status(400).json({
                success: false,
                message: "Valid Shop ID is required."
            });
        }

        const db = getDB();

        const result = await db
            .request()
            .input("BannerID", bannerID)
            .input("ShopID", parsedShopID)
            .query(`
                UPDATE dbo.Banners
                SET
                    Status =
                        CASE
                            WHEN Status = N'Active'
                                THEN N'Inactive'
                            ELSE N'Active'
                        END,
                    UpdatedAt = SYSUTCDATETIME()
                WHERE BannerID = @BannerID
                  AND ShopID = @ShopID;

                SELECT
                    BannerID,
                    ShopID,
                    Title,
                    Subtitle,
                    ImageURL,
                    ButtonText,
                    ButtonLink,
                    DisplayOrder,
                    Status,
                    StartDate,
                    EndDate,
                    CreatedAt,
                    UpdatedAt
                FROM dbo.Banners
                WHERE BannerID = @BannerID
                  AND ShopID = @ShopID;
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Banner not found."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Banner status updated successfully.",
            data: result.recordset[0]
        });

    } catch (error) {
        console.error("Toggle Banner Status Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update banner status.",
            error: error.message
        });
    }
};