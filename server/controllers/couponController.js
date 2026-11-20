import { getDB } from "../config/db.js";

// =====================================================
// GET ALL COUPONS
// GET /api/coupons
// =====================================================

export const getCoupons = async (req, res) => {
    try {
        const db = getDB();

        const { shopID, isActive } = req.query;

        let query = `
            SELECT
                c.CouponID,
                c.ShopID,
                s.ShopName,
                c.CouponCode,
                c.DiscountType,
                c.DiscountValue,
                c.MinimumOrderAmount,
                c.MaximumDiscountAmount,
                c.UsageLimit,
                c.UsedCount,
                c.StartsAt,
                c.ExpiresAt,
                c.IsActive,
                c.CreatedAt,
                c.Description,
                c.StartDate,
                c.EndDate,
                c.UpdatedAt
            FROM dbo.Coupons c
            INNER JOIN dbo.Shops s
                ON c.ShopID = s.ShopID
            WHERE 1 = 1
        `;

        if (shopID) {
            query += ` AND c.ShopID = @shopID`;
        }

        if (isActive !== undefined) {
            query += ` AND c.IsActive = @isActive`;
        }

        query += `
            ORDER BY c.CreatedAt DESC
        `;

        const request = db.request();

        if (shopID) {
            request.input("shopID", shopID);
        }

        if (isActive !== undefined) {
            request.input(
                "isActive",
                isActive === "true" || isActive === "1" ? 1 : 0
            );
        }

        const result = await request.query(query);

        return res.status(200).json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error("Get Coupons Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch coupons.",
            error: error.message
        });
    }
};


// =====================================================
// GET COUPON BY ID
// GET /api/coupons/:id
// =====================================================

export const getCouponById = async (req, res) => {
    try {
        const db = getDB();

        const couponID = req.params.id;

        if (!couponID) {
            return res.status(400).json({
                success: false,
                message: "Coupon ID is required."
            });
        }

        const result = await db
            .request()
            .input("couponID", couponID)
            .query(`
                SELECT
                    c.CouponID,
                    c.ShopID,
                    s.ShopName,
                    c.CouponCode,
                    c.DiscountType,
                    c.DiscountValue,
                    c.MinimumOrderAmount,
                    c.MaximumDiscountAmount,
                    c.UsageLimit,
                    c.UsedCount,
                    c.StartsAt,
                    c.ExpiresAt,
                    c.IsActive,
                    c.CreatedAt,
                    c.Description,
                    c.StartDate,
                    c.EndDate,
                    c.UpdatedAt
                FROM dbo.Coupons c
                INNER JOIN dbo.Shops s
                    ON c.ShopID = s.ShopID
                WHERE c.CouponID = @couponID
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Coupon not found."
            });
        }

        return res.status(200).json({
            success: true,
            data: result.recordset[0]
        });

    } catch (error) {
        console.error("Get Coupon Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch coupon.",
            error: error.message
        });
    }
};


// =====================================================
// CREATE COUPON
// POST /api/coupons
// =====================================================

export const createCoupon = async (req, res) => {
    try {
        const db = getDB();

        const {
            shopID,
            couponCode,
            description,
            discountType,
            discountValue,
            minimumOrderAmount,
            maximumDiscountAmount,
            usageLimit,
            startsAt,
            expiresAt,
            isActive
        } = req.body;

        // -------------------------------------------------
        // VALIDATION
        // -------------------------------------------------

        if (!shopID) {
            return res.status(400).json({
                success: false,
                message: "Shop ID is required."
            });
        }

        if (!couponCode || !couponCode.trim()) {
            return res.status(400).json({
                success: false,
                message: "Coupon code is required."
            });
        }

        if (!discountType) {
            return res.status(400).json({
                success: false,
                message: "Discount type is required."
            });
        }

        if (!["Percentage", "Fixed"].includes(discountType)) {
            return res.status(400).json({
                success: false,
                message: "Invalid discount type."
            });
        }

        if (
            discountValue === undefined ||
            discountValue === null ||
            discountValue === ""
        ) {
            return res.status(400).json({
                success: false,
                message: "Discount value is required."
            });
        }

        const numericDiscount = Number(discountValue);

        if (
            Number.isNaN(numericDiscount) ||
            numericDiscount < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Discount value must be a valid number."
            });
        }

        if (
            discountType === "Percentage" &&
            numericDiscount > 100
        ) {
            return res.status(400).json({
                success: false,
                message: "Percentage discount cannot exceed 100."
            });
        }

        // -------------------------------------------------
        // CHECK SHOP
        // -------------------------------------------------

        const shopResult = await db
            .request()
            .input("shopID", shopID)
            .query(`
                SELECT ShopID
                FROM dbo.Shops
                WHERE ShopID = @shopID
            `);

        if (shopResult.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Shop not found."
            });
        }

        // -------------------------------------------------
        // NORMALIZE COUPON CODE
        // -------------------------------------------------

        const normalizedCode = couponCode
            .trim()
            .toUpperCase();

        // -------------------------------------------------
        // CHECK DUPLICATE
        // -------------------------------------------------

        const duplicateResult = await db
            .request()
            .input("shopID", shopID)
            .input("couponCode", normalizedCode)
            .query(`
                SELECT CouponID
                FROM dbo.Coupons
                WHERE ShopID = @shopID
                AND CouponCode = @couponCode
            `);

        if (duplicateResult.recordset.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Coupon code already exists for this shop."
            });
        }

        // -------------------------------------------------
        // CREATE
        // -------------------------------------------------

        const result = await db
            .request()
            .input("shopID", shopID)
            .input("couponCode", normalizedCode)
            .input("discountType", discountType)
            .input("discountValue", numericDiscount)
            .input(
                "minimumOrderAmount",
                minimumOrderAmount || null
            )
            .input(
                "maximumDiscountAmount",
                maximumDiscountAmount || null
            )
            .input(
                "usageLimit",
                usageLimit || null
            )
            .input(
                "startsAt",
                startsAt || null
            )
            .input(
                "expiresAt",
                expiresAt || null
            )
            .input(
                "isActive",
                isActive === false ? 0 : 1
            )
            .input(
                "description",
                description || null
            )
            .query(`
                INSERT INTO dbo.Coupons
                (
                    ShopID,
                    CouponCode,
                    DiscountType,
                    DiscountValue,
                    MinimumOrderAmount,
                    MaximumDiscountAmount,
                    UsageLimit,
                    UsedCount,
                    StartsAt,
                    ExpiresAt,
                    IsActive,
                    CreatedAt,
                    Description,
                    UpdatedAt
                )
                OUTPUT
                    INSERTED.CouponID,
                    INSERTED.ShopID,
                    INSERTED.CouponCode,
                    INSERTED.DiscountType,
                    INSERTED.DiscountValue,
                    INSERTED.MinimumOrderAmount,
                    INSERTED.MaximumDiscountAmount,
                    INSERTED.UsageLimit,
                    INSERTED.UsedCount,
                    INSERTED.StartsAt,
                    INSERTED.ExpiresAt,
                    INSERTED.IsActive,
                    INSERTED.CreatedAt,
                    INSERTED.Description,
                    INSERTED.UpdatedAt
                VALUES
                (
                    @shopID,
                    @couponCode,
                    @discountType,
                    @discountValue,
                    @minimumOrderAmount,
                    @maximumDiscountAmount,
                    @usageLimit,
                    0,
                    @startsAt,
                    @expiresAt,
                    @isActive,
                    SYSUTCDATETIME(),
                    @description,
                    SYSUTCDATETIME()
                )
            `);

        return res.status(201).json({
            success: true,
            message: "Coupon created successfully.",
            data: result.recordset[0]
        });

    } catch (error) {
        console.error("Create Coupon Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create coupon.",
            error: error.message
        });
    }
};


// =====================================================
// UPDATE COUPON
// PUT /api/coupons/:id
// =====================================================

export const updateCoupon = async (req, res) => {
    try {
        const db = getDB();

        const couponID = req.params.id;

        const {
            shopID,
            couponCode,
            description,
            discountType,
            discountValue,
            minimumOrderAmount,
            maximumDiscountAmount,
            usageLimit,
            startsAt,
            expiresAt,
            isActive
        } = req.body;

        if (!couponID) {
            return res.status(400).json({
                success: false,
                message: "Coupon ID is required."
            });
        }

        if (!shopID) {
            return res.status(400).json({
                success: false,
                message: "Shop ID is required."
            });
        }

        if (!couponCode || !couponCode.trim()) {
            return res.status(400).json({
                success: false,
                message: "Coupon code is required."
            });
        }

        if (!["Percentage", "Fixed"].includes(discountType)) {
            return res.status(400).json({
                success: false,
                message: "Invalid discount type."
            });
        }

        const numericDiscount = Number(discountValue);

        if (
            Number.isNaN(numericDiscount) ||
            numericDiscount < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid discount value."
            });
        }

        if (
            discountType === "Percentage" &&
            numericDiscount > 100
        ) {
            return res.status(400).json({
                success: false,
                message: "Percentage discount cannot exceed 100."
            });
        }

        // -------------------------------------------------
        // CHECK EXISTING COUPON
        // -------------------------------------------------

        const existingResult = await db
            .request()
            .input("couponID", couponID)
            .query(`
                SELECT CouponID, ShopID
                FROM dbo.Coupons
                WHERE CouponID = @couponID
            `);

        if (existingResult.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Coupon not found."
            });
        }

        if (
            Number(existingResult.recordset[0].ShopID) !==
            Number(shopID)
        ) {
            return res.status(403).json({
                success: false,
                message: "Coupon does not belong to selected shop."
            });
        }

        const normalizedCode = couponCode
            .trim()
            .toUpperCase();

        // -------------------------------------------------
        // DUPLICATE CHECK
        // -------------------------------------------------

        const duplicateResult = await db
            .request()
            .input("shopID", shopID)
            .input("couponCode", normalizedCode)
            .input("couponID", couponID)
            .query(`
                SELECT CouponID
                FROM dbo.Coupons
                WHERE ShopID = @shopID
                AND CouponCode = @couponCode
                AND CouponID <> @couponID
            `);

        if (duplicateResult.recordset.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Coupon code already exists for this shop."
            });
        }

        // -------------------------------------------------
        // UPDATE
        // -------------------------------------------------

        const result = await db
            .request()
            .input("couponID", couponID)
            .input("shopID", shopID)
            .input("couponCode", normalizedCode)
            .input("discountType", discountType)
            .input("discountValue", numericDiscount)
            .input(
                "minimumOrderAmount",
                minimumOrderAmount || null
            )
            .input(
                "maximumDiscountAmount",
                maximumDiscountAmount || null
            )
            .input(
                "usageLimit",
                usageLimit || null
            )
            .input(
                "startsAt",
                startsAt || null
            )
            .input(
                "expiresAt",
                expiresAt || null
            )
            .input(
                "isActive",
                isActive === false ? 0 : 1
            )
            .input(
                "description",
                description || null
            )
            .query(`
                UPDATE dbo.Coupons
                SET
                    CouponCode = @couponCode,
                    DiscountType = @discountType,
                    DiscountValue = @discountValue,
                    MinimumOrderAmount = @minimumOrderAmount,
                    MaximumDiscountAmount = @maximumDiscountAmount,
                    UsageLimit = @usageLimit,
                    StartsAt = @startsAt,
                    ExpiresAt = @expiresAt,
                    IsActive = @isActive,
                    Description = @description,
                    UpdatedAt = SYSUTCDATETIME()
                OUTPUT
                    INSERTED.CouponID,
                    INSERTED.ShopID,
                    INSERTED.CouponCode,
                    INSERTED.DiscountType,
                    INSERTED.DiscountValue,
                    INSERTED.MinimumOrderAmount,
                    INSERTED.MaximumDiscountAmount,
                    INSERTED.UsageLimit,
                    INSERTED.UsedCount,
                    INSERTED.StartsAt,
                    INSERTED.ExpiresAt,
                    INSERTED.IsActive,
                    INSERTED.CreatedAt,
                    INSERTED.Description,
                    INSERTED.UpdatedAt
                WHERE CouponID = @couponID
                AND ShopID = @shopID
            `);

        return res.status(200).json({
            success: true,
            message: "Coupon updated successfully.",
            data: result.recordset[0]
        });

    } catch (error) {
        console.error("Update Coupon Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update coupon.",
            error: error.message
        });
    }
};


// =====================================================
// DELETE COUPON
// DELETE /api/coupons/:id?shopID=10
// =====================================================

export const deleteCoupon = async (req, res) => {
    try {
        const db = getDB();

        const couponID = req.params.id;

        const shopID =
            req.query.shopID ||
            req.body.shopID;

        if (!couponID) {
            return res.status(400).json({
                success: false,
                message: "Coupon ID is required."
            });
        }

        if (!shopID) {
            return res.status(400).json({
                success: false,
                message: "Shop ID is required."
            });
        }

        const result = await db
            .request()
            .input("couponID", couponID)
            .input("shopID", shopID)
            .query(`
                DELETE FROM dbo.Coupons
                WHERE CouponID = @couponID
                AND ShopID = @shopID
            `);

        if (
            result.rowsAffected &&
            result.rowsAffected[0] === 0
        ) {
            return res.status(404).json({
                success: false,
                message: "Coupon not found for selected shop."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Coupon deleted successfully."
        });

    } catch (error) {
        console.error("Delete Coupon Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete coupon.",
            error: error.message
        });
    }
};


// =====================================================
// TOGGLE ACTIVE / INACTIVE
// PATCH /api/coupons/:id/status
// =====================================================

export const toggleCouponStatus = async (req, res) => {
    try {
        const db = getDB();

        const couponID = req.params.id;

        const shopID =
            req.body.shopID ||
            req.query.shopID;

        if (!couponID) {
            return res.status(400).json({
                success: false,
                message: "Coupon ID is required."
            });
        }

        if (!shopID) {
            return res.status(400).json({
                success: false,
                message: "Shop ID is required."
            });
        }

        const existingResult = await db
            .request()
            .input("couponID", couponID)
            .input("shopID", shopID)
            .query(`
                SELECT IsActive
                FROM dbo.Coupons
                WHERE CouponID = @couponID
                AND ShopID = @shopID
            `);

        if (existingResult.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Coupon not found for selected shop."
            });
        }

        const currentStatus =
            existingResult.recordset[0].IsActive;

        const newStatus =
            currentStatus ? 0 : 1;

        const result = await db
            .request()
            .input("couponID", couponID)
            .input("shopID", shopID)
            .input("isActive", newStatus)
            .query(`
                UPDATE dbo.Coupons
                SET
                    IsActive = @isActive,
                    UpdatedAt = SYSUTCDATETIME()
                OUTPUT
                    INSERTED.CouponID,
                    INSERTED.ShopID,
                    INSERTED.IsActive,
                    INSERTED.UpdatedAt
                WHERE CouponID = @couponID
                AND ShopID = @shopID
            `);

        return res.status(200).json({
            success: true,
            message: newStatus
                ? "Coupon activated successfully."
                : "Coupon deactivated successfully.",
            data: result.recordset[0]
        });

    } catch (error) {
        console.error("Toggle Coupon Status Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update coupon status.",
            error: error.message
        });
    }
};