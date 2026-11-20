import { getDB } from "../config/db.js";

const getAuthenticatedShopID = (req) => {
    const shopID =
        req.user?.shopID ??
        req.user?.ShopID ??
        req.user?.shopId ??
        req.user?.ShopId ??
        null;

    const parsed = Number(shopID);

    if (!Number.isInteger(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
};

const cleanText = (value) => {
    if (value === undefined || value === null) {
        return null;
    }

    const text = String(value).trim();
    return text === "" ? null : text;
};

const normalizeBannerImages = (imageURLs, imageURL) => {
    const values = Array.isArray(imageURLs) ? imageURLs : imageURL ? [imageURL] : [];
    return [...new Set(values.filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim()))].slice(0, 10);
};

// =====================================================
// GET MY SHOP BANNERS
// GET /api/shop-banners
// =====================================================

export const getShopBanners = async (req, res) => {
    try {
        const shopID = getAuthenticatedShopID(req);

        if (!shopID) {
            return res.status(403).json({
                success: false,
                message: "Shop ID not found in authentication token."
            });
        }

        const db = getDB();

        const result = await db
            .request()
            .input("ShopID", shopID)
            .query(`
                SELECT
                    BannerID,
                    ShopID,
                    Title,
                    Subtitle,
                    ImageURL,
                    ImageURLs,
                    VideoURL,
                    ButtonText,
                    ButtonLink,
                    DisplayOrder,
                    Status,
                    StartDate,
                    EndDate,
                    CreatedAt,
                    UpdatedAt
                FROM dbo.Banners
                WHERE ShopID = @ShopID
                ORDER BY DisplayOrder ASC, BannerID DESC
            `);

        return res.status(200).json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error("Get Shop Banners Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch shop banners.",
            error: error.message
        });
    }
};

// =====================================================
// GET MY SHOP BANNER BY ID
// GET /api/shop-banners/:id
// =====================================================

export const getShopBannerById = async (req, res) => {
    try {
        const shopID = getAuthenticatedShopID(req);
        const bannerID = Number(req.params.id);

        if (!shopID) {
            return res.status(403).json({
                success: false,
                message: "Shop ID not found in authentication token."
            });
        }

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
            .input("ShopID", shopID)
            .query(`
                SELECT
                    BannerID,
                    ShopID,
                    Title,
                    Subtitle,
                    ImageURL,
                    ImageURLs,
                    VideoURL,
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
                  AND ShopID = @ShopID
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
        console.error("Get Shop Banner Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch banner.",
            error: error.message
        });
    }
};

// =====================================================
// CREATE MY SHOP BANNER
// POST /api/shop-banners
// =====================================================

export const createShopBanner = async (req, res) => {
    try {
        const shopID = getAuthenticatedShopID(req);

        if (!shopID) {
            return res.status(403).json({
                success: false,
                message: "Shop ID not found in authentication token."
            });
        }

        const {
            title,
            subtitle,
            imageURL,
            imageURLs,
            videoURL,
            buttonText,
            buttonLink,
            displayOrder,
            startDate,
            endDate,
            status
        } = req.body;

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

            if (end < start) {
                return res.status(400).json({
                    success: false,
                    message: "End date cannot be before start date."
                });
            }
        }

        let order = 0;

        if (
            displayOrder !== undefined &&
            displayOrder !== null &&
            displayOrder !== ""
        ) {
            order = Number(displayOrder);

            if (!Number.isFinite(order)) {
                return res.status(400).json({
                    success: false,
                    message: "Display order must be a valid number."
                });
            }
        }

        const bannerStatus =
            status === "Inactive" ? "Inactive" : "Active";
        const bannerImages = normalizeBannerImages(imageURLs, imageURL);

        const db = getDB();

        const result = await db
            .request()
            .input("ShopID", shopID)
            .input("Title", String(title).trim())
            .input("Subtitle", cleanText(subtitle))
            .input("ImageURL", bannerImages[0] || null)
            .input("ImageURLs", JSON.stringify(bannerImages))
            .input("VideoURL", cleanText(videoURL))
            .input("ButtonText", cleanText(buttonText))
            .input("ButtonLink", cleanText(buttonLink))
            .input("DisplayOrder", order)
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
                    ImageURLs,
                    VideoURL,
                    ButtonText,
                    ButtonLink,
                    DisplayOrder,
                    Status,
                    StartDate,
                    EndDate,
                    CreatedAt,
                    UpdatedAt
                )
                OUTPUT
                    INSERTED.BannerID,
                    INSERTED.ShopID,
                    INSERTED.Title,
                    INSERTED.Subtitle,
                    INSERTED.ImageURL,
                    INSERTED.ImageURLs,
                    INSERTED.VideoURL,
                    INSERTED.ButtonText,
                    INSERTED.ButtonLink,
                    INSERTED.DisplayOrder,
                    INSERTED.Status,
                    INSERTED.StartDate,
                    INSERTED.EndDate,
                    INSERTED.CreatedAt,
                    INSERTED.UpdatedAt
                VALUES
                (
                    @ShopID,
                    @Title,
                    @Subtitle,
                    @ImageURL,
                    @ImageURLs,
                    @VideoURL,
                    @ButtonText,
                    @ButtonLink,
                    @DisplayOrder,
                    @Status,
                    @StartDate,
                    @EndDate,
                    SYSUTCDATETIME(),
                    SYSUTCDATETIME()
                )
            `);

        return res.status(201).json({
            success: true,
            message: "Banner created successfully.",
            data: result.recordset[0]
        });

    } catch (error) {
        console.error("Create Shop Banner Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create banner.",
            error: error.message
        });
    }
};

// =====================================================
// UPDATE MY SHOP BANNER
// PUT /api/shop-banners/:id
// =====================================================

export const updateShopBanner = async (req, res) => {
    try {
        const shopID = getAuthenticatedShopID(req);
        const bannerID = Number(req.params.id);

        if (!shopID) {
            return res.status(403).json({
                success: false,
                message: "Shop ID not found in authentication token."
            });
        }

        if (!Number.isInteger(bannerID) || bannerID <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid banner ID."
            });
        }

        const {
            title,
            subtitle,
            imageURL,
            imageURLs,
            videoURL,
            buttonText,
            buttonLink,
            displayOrder,
            startDate,
            endDate,
            status
        } = req.body;

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

            if (end < start) {
                return res.status(400).json({
                    success: false,
                    message: "End date cannot be before start date."
                });
            }
        }

        let order = 0;

        if (
            displayOrder !== undefined &&
            displayOrder !== null &&
            displayOrder !== ""
        ) {
            order = Number(displayOrder);

            if (!Number.isFinite(order)) {
                return res.status(400).json({
                    success: false,
                    message: "Display order must be a valid number."
                });
            }
        }

        const bannerStatus =
            status === "Inactive" ? "Inactive" : "Active";
        const bannerImages = normalizeBannerImages(imageURLs, imageURL);

        const db = getDB();

        const existingResult = await db
            .request()
            .input("BannerID", bannerID)
            .input("ShopID", shopID)
            .query(`
                SELECT BannerID
                FROM dbo.Banners
                WHERE BannerID = @BannerID
                  AND ShopID = @ShopID
            `);

        if (existingResult.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Banner not found."
            });
        }

        const result = await db
            .request()
            .input("BannerID", bannerID)
            .input("ShopID", shopID)
            .input("Title", String(title).trim())
            .input("Subtitle", cleanText(subtitle))
            .input("ImageURL", bannerImages[0] || null)
            .input("ImageURLs", JSON.stringify(bannerImages))
            .input("VideoURL", cleanText(videoURL))
            .input("ButtonText", cleanText(buttonText))
            .input("ButtonLink", cleanText(buttonLink))
            .input("DisplayOrder", order)
            .input("Status", bannerStatus)
            .input("StartDate", startDate || null)
            .input("EndDate", endDate || null)
            .query(`
                UPDATE dbo.Banners
                SET
                    Title = @Title,
                    Subtitle = @Subtitle,
                    ImageURL = @ImageURL,
                    ImageURLs = @ImageURLs,
                    VideoURL = @VideoURL,
                    ButtonText = @ButtonText,
                    ButtonLink = @ButtonLink,
                    DisplayOrder = @DisplayOrder,
                    Status = @Status,
                    StartDate = @StartDate,
                    EndDate = @EndDate,
                    UpdatedAt = SYSUTCDATETIME()
                OUTPUT
                    INSERTED.BannerID,
                    INSERTED.ShopID,
                    INSERTED.Title,
                    INSERTED.Subtitle,
                    INSERTED.ImageURL,
                    INSERTED.ImageURLs,
                    INSERTED.VideoURL,
                    INSERTED.ButtonText,
                    INSERTED.ButtonLink,
                    INSERTED.DisplayOrder,
                    INSERTED.Status,
                    INSERTED.StartDate,
                    INSERTED.EndDate,
                    INSERTED.CreatedAt,
                    INSERTED.UpdatedAt
                WHERE BannerID = @BannerID
                  AND ShopID = @ShopID
            `);

        return res.status(200).json({
            success: true,
            message: "Banner updated successfully.",
            data: result.recordset[0]
        });

    } catch (error) {
        console.error("Update Shop Banner Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update banner.",
            error: error.message
        });
    }
};

// =====================================================
// DELETE MY SHOP BANNER
// DELETE /api/shop-banners/:id
// =====================================================

export const deleteShopBanner = async (req, res) => {
    try {
        const shopID = getAuthenticatedShopID(req);
        const bannerID = Number(req.params.id);

        if (!shopID) {
            return res.status(403).json({
                success: false,
                message: "Shop ID not found in authentication token."
            });
        }

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
            .input("ShopID", shopID)
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
        console.error("Delete Shop Banner Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete banner.",
            error: error.message
        });
    }
};

// =====================================================
// TOGGLE BANNER STATUS
// PATCH /api/shop-banners/:id/status
// =====================================================

export const toggleShopBannerStatus = async (req, res) => {
    try {
        const shopID = getAuthenticatedShopID(req);
        const bannerID = Number(req.params.id);

        if (!shopID) {
            return res.status(403).json({
                success: false,
                message: "Shop ID not found in authentication token."
            });
        }

        if (!Number.isInteger(bannerID) || bannerID <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid banner ID."
            });
        }

        const db = getDB();

        const existingResult = await db
            .request()
            .input("BannerID", bannerID)
            .input("ShopID", shopID)
            .query(`
                SELECT Status
                FROM dbo.Banners
                WHERE BannerID = @BannerID
                  AND ShopID = @ShopID
            `);

        if (existingResult.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Banner not found."
            });
        }

        const currentStatus = existingResult.recordset[0].Status;

        const newStatus =
            currentStatus === "Active"
                ? "Inactive"
                : "Active";

        const result = await db
            .request()
            .input("BannerID", bannerID)
            .input("ShopID", shopID)
            .input("Status", newStatus)
            .query(`
                UPDATE dbo.Banners
                SET
                    Status = @Status,
                    UpdatedAt = SYSUTCDATETIME()
                OUTPUT
                    INSERTED.BannerID,
                    INSERTED.ShopID,
                    INSERTED.Status,
                    INSERTED.UpdatedAt
                WHERE BannerID = @BannerID
                  AND ShopID = @ShopID
            `);

        return res.status(200).json({
            success: true,
            message:
                newStatus === "Active"
                    ? "Banner activated successfully."
                    : "Banner deactivated successfully.",
            data: result.recordset[0]
        });

    } catch (error) {
        console.error("Toggle Shop Banner Status Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update banner status.",
            error: error.message
        });
    }
};
