import { getDB } from "../config/db.js";

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

const normalizeServiceImages = (imageURLs, imageURL) => {
    const values = Array.isArray(imageURLs) ? imageURLs : imageURL ? [imageURL] : [];
    return [...new Set(values.filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim()))].slice(0, 10);
};

// =====================================================
// GET ALL SHOP SERVICES
// GET /api/shop-services
// =====================================================

export const getShopServices = async (req, res) => {
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
                    ServiceID,
                    ShopID,
                    ServiceName,
                    Slug,
                    ShortDescription,
                    Description,
                    Price,
                    ImageURL,
                    ImageURLs,
                    VideoURL,
                    Status,
                    CreatedAt,
                    UpdatedAt
                FROM dbo.Services
                WHERE ShopID = @ShopID
                ORDER BY ServiceID DESC
            `);

        return res.status(200).json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error("Get Shop Services Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch services.",
            error: error.message
        });
    }
};

// =====================================================
// GET SINGLE SHOP SERVICE
// GET /api/shop-services/:id
// =====================================================

export const getShopServiceById = async (req, res) => {
    try {
        const shopID = getShopID(req);
        const serviceID = Number(req.params.id);

        if (!shopID) {
            return res.status(401).json({
                success: false,
                message: "Shop session not found."
            });
        }

        if (!serviceID) {
            return res.status(400).json({
                success: false,
                message: "Valid service ID is required."
            });
        }

        const db = getDB();

        const result = await db
            .request()
            .input("ServiceID", serviceID)
            .input("ShopID", Number(shopID))
            .query(`
                SELECT
                    ServiceID,
                    ShopID,
                    ServiceName,
                    Slug,
                    ShortDescription,
                    Description,
                    Price,
                    ImageURL,
                    ImageURLs,
                    VideoURL,
                    Status,
                    CreatedAt,
                    UpdatedAt
                FROM dbo.Services
                WHERE
                    ServiceID = @ServiceID
                    AND ShopID = @ShopID
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Service not found."
            });
        }

        return res.status(200).json({
            success: true,
            data: result.recordset[0]
        });

    } catch (error) {
        console.error("Get Shop Service Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch service.",
            error: error.message
        });
    }
};

// =====================================================
// CREATE SHOP SERVICE
// POST /api/shop-services
// =====================================================

export const createShopService = async (req, res) => {
    try {
        const shopID = getShopID(req);

        if (!shopID) {
            return res.status(401).json({
                success: false,
                message: "Shop session not found."
            });
        }

        const {
            serviceName,
            shortDescription,
            description,
            price,
            imageURL,
            imageURLs,
            videoURL,
            status
        } = req.body;

        if (!serviceName || !serviceName.trim()) {
            return res.status(400).json({
                success: false,
                message: "Service name is required."
            });
        }
        const serviceImages = normalizeServiceImages(imageURLs, imageURL);

        const slug = serviceName
            .toString()
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");

        const db = getDB();

        // =================================================
        // CHECK DUPLICATE SERVICE FOR SAME SHOP
        // =================================================

        const existing = await db
            .request()
            .input("ShopID", Number(shopID))
            .input("Slug", slug)
            .query(`
                SELECT ServiceID
                FROM dbo.Services
                WHERE
                    ShopID = @ShopID
                    AND Slug = @Slug
            `);

        if (existing.recordset.length > 0) {
            return res.status(409).json({
                success: false,
                message: "A service with this name already exists."
            });
        }

        // =================================================
        // INSERT
        // =================================================

        const result = await db
            .request()
            .input("ShopID", Number(shopID))
            .input("ServiceName", serviceName.trim())
            .input("Slug", slug)
            .input(
                "ShortDescription",
                shortDescription?.trim() || null
            )
            .input(
                "Description",
                description?.trim() || null
            )
            .input(
                "Price",
                price === "" ||
                price === undefined ||
                price === null
                    ? null
                    : Number(price)
            )
            .input(
                "ImageURL",
                serviceImages[0] || null
            )
            .input(
                "ImageURLs",
                JSON.stringify(serviceImages)
            )
            .input(
                "VideoURL",
                videoURL?.trim() || null
            )
            .input(
                "Status",
                status === "Inactive"
                    ? "Inactive"
                    : "Active"
            )
            .query(`
                INSERT INTO dbo.Services
                (
                    ShopID,
                    ServiceName,
                    Slug,
                    ShortDescription,
                    Description,
                    Price,
                    ImageURL,
                    ImageURLs,
                    VideoURL,
                    Status
                )
                VALUES
                (
                    @ShopID,
                    @ServiceName,
                    @Slug,
                    @ShortDescription,
                    @Description,
                    @Price,
                    @ImageURL,
                    @ImageURLs,
                    @VideoURL,
                    @Status
                );

                SELECT *
                FROM dbo.Services
                WHERE ServiceID = SCOPE_IDENTITY();
            `);

        return res.status(201).json({
            success: true,
            message: "Service created successfully.",
            data: result.recordset[0]
        });

    } catch (error) {
        console.error("Create Shop Service Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create service.",
            error: error.message
        });
    }
};

// =====================================================
// UPDATE SHOP SERVICE
// PUT /api/shop-services/:id
// =====================================================

export const updateShopService = async (req, res) => {
    try {
        const shopID = getShopID(req);
        const serviceID = Number(req.params.id);

        if (!shopID) {
            return res.status(401).json({
                success: false,
                message: "Shop session not found."
            });
        }

        if (!serviceID) {
            return res.status(400).json({
                success: false,
                message: "Valid service ID is required."
            });
        }

        const {
            serviceName,
            shortDescription,
            description,
            price,
            imageURL,
            imageURLs,
            videoURL,
            status
        } = req.body;

        if (!serviceName || !serviceName.trim()) {
            return res.status(400).json({
                success: false,
                message: "Service name is required."
            });
        }
        const serviceImages = normalizeServiceImages(imageURLs, imageURL);

        const slug = serviceName
            .toString()
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");

        const db = getDB();

        // =================================================
        // CHECK SERVICE BELONGS TO LOGGED-IN SHOP
        // =================================================

        const existingService = await db
            .request()
            .input("ServiceID", serviceID)
            .input("ShopID", Number(shopID))
            .query(`
                SELECT ServiceID
                FROM dbo.Services
                WHERE
                    ServiceID = @ServiceID
                    AND ShopID = @ShopID
            `);

        if (existingService.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Service not found."
            });
        }

        // =================================================
        // CHECK DUPLICATE SLUG
        // =================================================

        const duplicate = await db
            .request()
            .input("ServiceID", serviceID)
            .input("ShopID", Number(shopID))
            .input("Slug", slug)
            .query(`
                SELECT ServiceID
                FROM dbo.Services
                WHERE
                    ShopID = @ShopID
                    AND Slug = @Slug
                    AND ServiceID <> @ServiceID
            `);

        if (duplicate.recordset.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Another service with this name already exists."
            });
        }

        // =================================================
        // UPDATE
        // =================================================

        const result = await db
            .request()
            .input("ServiceID", serviceID)
            .input("ShopID", Number(shopID))
            .input("ServiceName", serviceName.trim())
            .input("Slug", slug)
            .input(
                "ShortDescription",
                shortDescription?.trim() || null
            )
            .input(
                "Description",
                description?.trim() || null
            )
            .input(
                "Price",
                price === "" ||
                price === undefined ||
                price === null
                    ? null
                    : Number(price)
            )
            .input(
                "ImageURL",
                serviceImages[0] || null
            )
            .input(
                "ImageURLs",
                JSON.stringify(serviceImages)
            )
            .input(
                "VideoURL",
                videoURL?.trim() || null
            )
            .input(
                "Status",
                status === "Inactive"
                    ? "Inactive"
                    : "Active"
            )
            .query(`
                UPDATE dbo.Services
                SET
                    ServiceName = @ServiceName,
                    Slug = @Slug,
                    ShortDescription = @ShortDescription,
                    Description = @Description,
                    Price = @Price,
                    ImageURL = @ImageURL,
                    ImageURLs = @ImageURLs,
                    VideoURL = @VideoURL,
                    Status = @Status,
                    UpdatedAt = SYSUTCDATETIME()
                WHERE
                    ServiceID = @ServiceID
                    AND ShopID = @ShopID;

                SELECT *
                FROM dbo.Services
                WHERE
                    ServiceID = @ServiceID
                    AND ShopID = @ShopID;
            `);

        return res.status(200).json({
            success: true,
            message: "Service updated successfully.",
            data: result.recordset[0]
        });

    } catch (error) {
        console.error("Update Shop Service Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update service.",
            error: error.message
        });
    }
};

// =====================================================
// DELETE SHOP SERVICE
// DELETE /api/shop-services/:id
// =====================================================

export const deleteShopService = async (req, res) => {
    try {
        const shopID = getShopID(req);
        const serviceID = Number(req.params.id);

        if (!shopID) {
            return res.status(401).json({
                success: false,
                message: "Shop session not found."
            });
        }

        if (!serviceID) {
            return res.status(400).json({
                success: false,
                message: "Valid service ID is required."
            });
        }

        const db = getDB();

        const result = await db
            .request()
            .input("ServiceID", serviceID)
            .input("ShopID", Number(shopID))
            .query(`
                DELETE FROM dbo.Services
                WHERE
                    ServiceID = @ServiceID
                    AND ShopID = @ShopID
            `);

        if (!result.rowsAffected?.[0]) {
            return res.status(404).json({
                success: false,
                message: "Service not found."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Service deleted successfully."
        });

    } catch (error) {
        console.error("Delete Shop Service Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete service.",
            error: error.message
        });
    }
};

// =====================================================
// TOGGLE SERVICE STATUS
// PATCH /api/shop-services/:id/status
// =====================================================

export const toggleShopServiceStatus = async (req, res) => {
    try {
        const shopID = getShopID(req);
        const serviceID = Number(req.params.id);

        if (!shopID) {
            return res.status(401).json({
                success: false,
                message: "Shop session not found."
            });
        }

        if (!serviceID) {
            return res.status(400).json({
                success: false,
                message: "Valid service ID is required."
            });
        }

        const db = getDB();

        const result = await db
            .request()
            .input("ServiceID", serviceID)
            .input("ShopID", Number(shopID))
            .query(`
                UPDATE dbo.Services
                SET
                    Status =
                        CASE
                            WHEN Status = 'Active'
                            THEN 'Inactive'
                            ELSE 'Active'
                        END,
                    UpdatedAt = SYSUTCDATETIME()
                WHERE
                    ServiceID = @ServiceID
                    AND ShopID = @ShopID;

                SELECT *
                FROM dbo.Services
                WHERE
                    ServiceID = @ServiceID
                    AND ShopID = @ShopID;
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Service not found."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Service status updated successfully.",
            data: result.recordset[0]
        });

    } catch (error) {
        console.error(
            "Toggle Shop Service Status Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to update service status.",
            error: error.message
        });
    }
};
