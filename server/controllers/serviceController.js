import { getDB } from "../config/db.js";

/* =========================================================
   GENERATE SLUG
   ========================================================= */

const generateSlug = (text) => {
    return text
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
};

/* =========================================================
   GET ALL SERVICES
   ========================================================= */

export const getServices = async (req, res) => {
    try {
        const db = getDB();

        const result = await db
            .request()
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
                    Status,
                    CreatedAt,
                    UpdatedAt
                FROM dbo.Services
                ORDER BY ServiceID DESC
            `);

        res.status(200).json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error("Get Services Error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch services."
        });
    }
};

/* =========================================================
   GET SINGLE SERVICE
   ========================================================= */

export const getServiceById = async (req, res) => {
    try {
        const serviceId = Number(req.params.id);

        if (!serviceId) {
            return res.status(400).json({
                success: false,
                message: "Invalid service ID."
            });
        }

        const db = getDB();

        const result = await db
            .request()
            .input("ServiceID", serviceId)
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
                    Status,
                    CreatedAt,
                    UpdatedAt
                FROM dbo.Services
                WHERE ServiceID = @ServiceID
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Service not found."
            });
        }

        res.status(200).json({
            success: true,
            data: result.recordset[0]
        });

    } catch (error) {
        console.error("Get Service Error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch service."
        });
    }
};

/* =========================================================
   CREATE SERVICE
   ========================================================= */

export const createService = async (req, res) => {
    try {
        const {
            shopID,
            serviceName,
            shortDescription,
            description,
            price,
            imageURL,
            status
        } = req.body;

        if (!shopID) {
            return res.status(400).json({
                success: false,
                message: "Shop ID is required."
            });
        }

        if (!serviceName || !serviceName.trim()) {
            return res.status(400).json({
                success: false,
                message: "Service name is required."
            });
        }

        const slug = generateSlug(serviceName);

        const db = getDB();

        /* CHECK DUPLICATE */

        const existing = await db
            .request()
            .input("ShopID", Number(shopID))
            .input("Slug", slug)
            .query(`
                SELECT ServiceID
                FROM dbo.Services
                WHERE ShopID = @ShopID
                  AND Slug = @Slug
            `);

        if (existing.recordset.length > 0) {
            return res.status(409).json({
                success: false,
                message: "A service with this name already exists."
            });
        }

        /* INSERT */

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
                imageURL?.trim() || null
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
                    @Status
                );

                SELECT *
                FROM dbo.Services
                WHERE ServiceID = SCOPE_IDENTITY();
            `);

        res.status(201).json({
            success: true,
            message: "Service created successfully.",
            data: result.recordset[0]
        });

    } catch (error) {
        console.error("Create Service Error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create service."
        });
    }
};

/* =========================================================
   UPDATE SERVICE
   ========================================================= */

export const updateService = async (req, res) => {
    try {
        const serviceId = Number(req.params.id);

        const {
            shopID,
            serviceName,
            shortDescription,
            description,
            price,
            imageURL,
            status
        } = req.body;

        if (!serviceId) {
            return res.status(400).json({
                success: false,
                message: "Invalid service ID."
            });
        }

        if (!shopID) {
            return res.status(400).json({
                success: false,
                message: "Shop ID is required."
            });
        }

        if (!serviceName || !serviceName.trim()) {
            return res.status(400).json({
                success: false,
                message: "Service name is required."
            });
        }

        const slug = generateSlug(serviceName);

        const db = getDB();

        /* CHECK EXISTING SERVICE */

        const existingService = await db
            .request()
            .input("ServiceID", serviceId)
            .input("ShopID", Number(shopID))
            .query(`
                SELECT ServiceID
                FROM dbo.Services
                WHERE ServiceID = @ServiceID
                  AND ShopID = @ShopID
            `);

        if (existingService.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Service not found."
            });
        }

        /* CHECK DUPLICATE SLUG */

        const duplicate = await db
            .request()
            .input("ServiceID", serviceId)
            .input("ShopID", Number(shopID))
            .input("Slug", slug)
            .query(`
                SELECT ServiceID
                FROM dbo.Services
                WHERE ShopID = @ShopID
                  AND Slug = @Slug
                  AND ServiceID <> @ServiceID
            `);

        if (duplicate.recordset.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Another service with this name already exists."
            });
        }

        /* UPDATE */

        const result = await db
            .request()
            .input("ServiceID", serviceId)
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
                imageURL?.trim() || null
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
                    Status = @Status,
                    UpdatedAt = SYSUTCDATETIME()
                WHERE ServiceID = @ServiceID
                  AND ShopID = @ShopID;

                SELECT *
                FROM dbo.Services
                WHERE ServiceID = @ServiceID
                  AND ShopID = @ShopID;
            `);

        res.status(200).json({
            success: true,
            message: "Service updated successfully.",
            data: result.recordset[0]
        });

    } catch (error) {
        console.error("Update Service Error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update service."
        });
    }
};

/* =========================================================
   DELETE SERVICE
   ========================================================= */

export const deleteService = async (req, res) => {
    try {
        const serviceId = Number(req.params.id);

        const shopID =
            req.body?.shopID ||
            req.query?.shopID;

        if (!serviceId) {
            return res.status(400).json({
                success: false,
                message: "Invalid service ID."
            });
        }

        if (!shopID) {
            return res.status(400).json({
                success: false,
                message: "Shop ID is required."
            });
        }

        const db = getDB();

        const result = await db
            .request()
            .input("ServiceID", serviceId)
            .input("ShopID", Number(shopID))
            .query(`
                DELETE FROM dbo.Services
                WHERE ServiceID = @ServiceID
                  AND ShopID = @ShopID
            `);

        if (!result.rowsAffected?.[0]) {
            return res.status(404).json({
                success: false,
                message: "Service not found."
            });
        }

        res.status(200).json({
            success: true,
            message: "Service deleted successfully."
        });

    } catch (error) {
        console.error("Delete Service Error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to delete service."
        });
    }
};

/* =========================================================
   TOGGLE SERVICE STATUS
   ========================================================= */

export const toggleServiceStatus = async (req, res) => {
    try {
        const serviceId = Number(req.params.id);
        const { shopID } = req.body;

        if (!serviceId) {
            return res.status(400).json({
                success: false,
                message: "Invalid service ID."
            });
        }

        if (!shopID) {
            return res.status(400).json({
                success: false,
                message: "Shop ID is required."
            });
        }

        const db = getDB();

        const result = await db
            .request()
            .input("ServiceID", serviceId)
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
                WHERE ServiceID = @ServiceID
                  AND ShopID = @ShopID;

                SELECT *
                FROM dbo.Services
                WHERE ServiceID = @ServiceID
                  AND ShopID = @ShopID;
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Service not found."
            });
        }

        res.status(200).json({
            success: true,
            message: "Service status updated successfully.",
            data: result.recordset[0]
        });

    }  catch (error) {
    console.error("=================================");
    console.error("CREATE SERVICE ERROR");
    console.error(error);
    console.error("=================================");

    res.status(500).json({
        success: false,
        message: "Failed to create service.",
        error: error.message
    });
    }
};