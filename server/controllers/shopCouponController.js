import { getDB } from "../config/db.js";

/*
|--------------------------------------------------------------------------
| GET SHOP ID FROM JWT
|--------------------------------------------------------------------------
*/

const getShopID = (req) => {
    return (
        req.user?.shopID ??
        req.user?.ShopID ??
        req.user?.shopId ??
        req.user?.ShopId ??
        null
    );
};

/*
|--------------------------------------------------------------------------
| GET ALL COUPONS
|--------------------------------------------------------------------------
| Only coupons belonging to logged-in shop will be returned.
|--------------------------------------------------------------------------
*/

export const getShopCoupons = async (req, res) => {
    try {
        const shopID = getShopID(req);

        if (!shopID) {
            return res.status(403).json({
                success: false,
                message: "Shop ID not found in authentication token.",
            });
        }

        const db = getDB();

        const result = await db
            .request()
            .input("shopID", shopID)
            .query(`
                SELECT
                    CouponID,
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
                    StartDate,
                    EndDate,
                    UpdatedAt
                FROM Coupons
                WHERE ShopID = @shopID
                ORDER BY CreatedAt DESC
            `);

        return res.status(200).json({
            success: true,
            data: result.recordset,
        });
    } catch (error) {
        console.error("Get Shop Coupons Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch shop coupons.",
            error: error.message,
        });
    }
};

/*
|--------------------------------------------------------------------------
| GET SINGLE COUPON
|--------------------------------------------------------------------------
| Coupon must belong to logged-in shop.
|--------------------------------------------------------------------------
*/

export const getShopCouponById = async (req, res) => {
    try {
        const shopID = getShopID(req);
        const couponID = Number(req.params.id);

        if (!shopID) {
            return res.status(403).json({
                success: false,
                message: "Shop ID not found in authentication token.",
            });
        }

        if (!Number.isInteger(couponID) || couponID <= 0) {
            return res.status(400).json({
                success: false,
                message: "Valid Coupon ID is required.",
            });
        }

        const db = getDB();

        const result = await db
            .request()
            .input("couponID", couponID)
            .input("shopID", shopID)
            .query(`
                SELECT
                    CouponID,
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
                    StartDate,
                    EndDate,
                    UpdatedAt
                FROM Coupons
                WHERE CouponID = @couponID
                  AND ShopID = @shopID
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Coupon not found.",
            });
        }

        return res.status(200).json({
            success: true,
            data: result.recordset[0],
        });
    } catch (error) {
        console.error("Get Shop Coupon By ID Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch coupon.",
            error: error.message,
        });
    }
};

/*
|--------------------------------------------------------------------------
| CREATE COUPON
|--------------------------------------------------------------------------
| ShopID is ALWAYS taken from JWT.
|--------------------------------------------------------------------------
*/

export const createShopCoupon = async (req, res) => {
    try {
        const shopID = getShopID(req);

        if (!shopID) {
            return res.status(403).json({
                success: false,
                message: "Shop ID not found in authentication token.",
            });
        }

        const {
            couponCode,
            description,
            discountType,
            discountValue,
            minimumOrderAmount,
            maximumDiscountAmount,
            usageLimit,
            startsAt,
            expiresAt,
            isActive,
        } = req.body;

        if (!couponCode || !String(couponCode).trim()) {
            return res.status(400).json({
                success: false,
                message: "Coupon code is required.",
            });
        }

        if (!discountType) {
            return res.status(400).json({
                success: false,
                message: "Discount type is required.",
            });
        }

        if (
            discountValue === undefined ||
            discountValue === null ||
            discountValue === ""
        ) {
            return res.status(400).json({
                success: false,
                message: "Discount value is required.",
            });
        }

        const numericDiscountValue = Number(discountValue);

        if (
            !Number.isFinite(numericDiscountValue) ||
            numericDiscountValue < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Discount value must be a valid positive number.",
            });
        }

        const validDiscountTypes = [
            "Percentage",
            "Fixed",
        ];

        if (!validDiscountTypes.includes(discountType)) {
            return res.status(400).json({
                success: false,
                message:
                    "Discount type must be Percentage or Fixed.",
            });
        }

        if (
            discountType === "Percentage" &&
            numericDiscountValue > 100
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Percentage discount cannot be greater than 100.",
            });
        }

        if (startsAt && expiresAt) {
            const start = new Date(startsAt);
            const end = new Date(expiresAt);

            if (
                Number.isNaN(start.getTime()) ||
                Number.isNaN(end.getTime())
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid start or expiry date.",
                });
            }

            if (start > end) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Expiry date cannot be before start date.",
                });
            }
        }

        const db = getDB();

        // Check duplicate coupon code inside the same shop
        const duplicateCheck = await db
            .request()
            .input(
                "couponCode",
                String(couponCode).trim()
            )
            .input("shopID", shopID)
            .query(`
                SELECT CouponID
                FROM Coupons
                WHERE ShopID = @shopID
                  AND CouponCode = @couponCode
            `);

        if (duplicateCheck.recordset.length > 0) {
            return res.status(409).json({
                success: false,
                message:
                    "This coupon code already exists in your shop.",
            });
        }

        const result = await db
            .request()
            .input("shopID", shopID)
            .input(
                "couponCode",
                String(couponCode).trim().toUpperCase()
            )
            .input(
                "description",
                description || null
            )
            .input(
                "discountType",
                discountType
            )
            .input(
                "discountValue",
                numericDiscountValue
            )
            .input(
                "minimumOrderAmount",
                minimumOrderAmount === undefined ||
                    minimumOrderAmount === ""
                    ? null
                    : Number(minimumOrderAmount)
            )
            .input(
                "maximumDiscountAmount",
                maximumDiscountAmount === undefined ||
                    maximumDiscountAmount === ""
                    ? null
                    : Number(maximumDiscountAmount)
            )
            .input(
                "usageLimit",
                usageLimit === undefined ||
                    usageLimit === ""
                    ? null
                    : Number(usageLimit)
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
                isActive === undefined
                    ? true
                    : Boolean(isActive)
            )
            .query(`
                INSERT INTO Coupons
                (
                    ShopID,
                    CouponCode,
                    Description,
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
                    UpdatedAt
                )
                OUTPUT
                    INSERTED.CouponID,
                    INSERTED.ShopID,
                    INSERTED.CouponCode,
                    INSERTED.Description,
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
                    INSERTED.UpdatedAt
                VALUES
                (
                    @shopID,
                    @couponCode,
                    @description,
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
                    SYSUTCDATETIME()
                )
            `);

        return res.status(201).json({
            success: true,
            message: "Coupon created successfully.",
            data: result.recordset[0],
        });
    } catch (error) {
        console.error("Create Shop Coupon Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create coupon.",
            error: error.message,
        });
    }
};

/*
|--------------------------------------------------------------------------
| UPDATE COUPON
|--------------------------------------------------------------------------
| Coupon can only be updated if it belongs to logged-in shop.
|--------------------------------------------------------------------------
*/

export const updateShopCoupon = async (req, res) => {
    try {
        const shopID = getShopID(req);
        const couponID = Number(req.params.id);

        if (!shopID) {
            return res.status(403).json({
                success: false,
                message: "Shop ID not found in authentication token.",
            });
        }

        if (!Number.isInteger(couponID) || couponID <= 0) {
            return res.status(400).json({
                success: false,
                message: "Valid Coupon ID is required.",
            });
        }

        const {
            couponCode,
            description,
            discountType,
            discountValue,
            minimumOrderAmount,
            maximumDiscountAmount,
            usageLimit,
            startsAt,
            expiresAt,
            isActive,
        } = req.body;

        if (!couponCode || !String(couponCode).trim()) {
            return res.status(400).json({
                success: false,
                message: "Coupon code is required.",
            });
        }

        if (!discountType) {
            return res.status(400).json({
                success: false,
                message: "Discount type is required.",
            });
        }

        const numericDiscountValue = Number(discountValue);

        if (
            !Number.isFinite(numericDiscountValue) ||
            numericDiscountValue < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid discount value is required.",
            });
        }

        const validDiscountTypes = [
            "Percentage",
            "Fixed",
        ];

        if (!validDiscountTypes.includes(discountType)) {
            return res.status(400).json({
                success: false,
                message:
                    "Discount type must be Percentage or Fixed.",
            });
        }

        if (
            discountType === "Percentage" &&
            numericDiscountValue > 100
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Percentage discount cannot be greater than 100.",
            });
        }

        if (startsAt && expiresAt) {
            const start = new Date(startsAt);
            const end = new Date(expiresAt);

            if (
                Number.isNaN(start.getTime()) ||
                Number.isNaN(end.getTime())
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid start or expiry date.",
                });
            }

            if (start > end) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Expiry date cannot be before start date.",
                });
            }
        }

        const db = getDB();

        // Check whether coupon belongs to this shop
        const ownershipCheck = await db
            .request()
            .input("couponID", couponID)
            .input("shopID", shopID)
            .query(`
                SELECT CouponID
                FROM Coupons
                WHERE CouponID = @couponID
                  AND ShopID = @shopID
            `);

        if (ownershipCheck.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Coupon not found.",
            });
        }

        // Check duplicate code excluding current coupon
        const duplicateCheck = await db
            .request()
            .input(
                "couponCode",
                String(couponCode).trim()
            )
            .input("couponID", couponID)
            .input("shopID", shopID)
            .query(`
                SELECT CouponID
                FROM Coupons
                WHERE ShopID = @shopID
                  AND CouponCode = @couponCode
                  AND CouponID <> @couponID
            `);

        if (duplicateCheck.recordset.length > 0) {
            return res.status(409).json({
                success: false,
                message:
                    "This coupon code already exists in your shop.",
            });
        }

        const result = await db
            .request()
            .input("couponID", couponID)
            .input("shopID", shopID)
            .input(
                "couponCode",
                String(couponCode).trim().toUpperCase()
            )
            .input(
                "description",
                description || null
            )
            .input(
                "discountType",
                discountType
            )
            .input(
                "discountValue",
                numericDiscountValue
            )
            .input(
                "minimumOrderAmount",
                minimumOrderAmount === undefined ||
                    minimumOrderAmount === ""
                    ? null
                    : Number(minimumOrderAmount)
            )
            .input(
                "maximumDiscountAmount",
                maximumDiscountAmount === undefined ||
                    maximumDiscountAmount === ""
                    ? null
                    : Number(maximumDiscountAmount)
            )
            .input(
                "usageLimit",
                usageLimit === undefined ||
                    usageLimit === ""
                    ? null
                    : Number(usageLimit)
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
                isActive === undefined
                    ? true
                    : Boolean(isActive)
            )
            .query(`
                UPDATE Coupons
                SET
                    CouponCode = @couponCode,
                    Description = @description,
                    DiscountType = @discountType,
                    DiscountValue = @discountValue,
                    MinimumOrderAmount = @minimumOrderAmount,
                    MaximumDiscountAmount = @maximumDiscountAmount,
                    UsageLimit = @usageLimit,
                    StartsAt = @startsAt,
                    ExpiresAt = @expiresAt,
                    IsActive = @isActive,
                    UpdatedAt = SYSUTCDATETIME()
                OUTPUT
                    INSERTED.CouponID,
                    INSERTED.ShopID,
                    INSERTED.CouponCode,
                    INSERTED.Description,
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
                    INSERTED.UpdatedAt
                WHERE CouponID = @couponID
                  AND ShopID = @shopID
            `);

        return res.status(200).json({
            success: true,
            message: "Coupon updated successfully.",
            data: result.recordset[0],
        });
    } catch (error) {
        console.error("Update Shop Coupon Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update coupon.",
            error: error.message,
        });
    }
};

/*
|--------------------------------------------------------------------------
| DELETE COUPON
|--------------------------------------------------------------------------
*/

export const deleteShopCoupon = async (req, res) => {
    try {
        const shopID = getShopID(req);
        const couponID = Number(req.params.id);

        if (!shopID) {
            return res.status(403).json({
                success: false,
                message: "Shop ID not found in authentication token.",
            });
        }

        if (!Number.isInteger(couponID) || couponID <= 0) {
            return res.status(400).json({
                success: false,
                message: "Valid Coupon ID is required.",
            });
        }

        const db = getDB();

        const result = await db
            .request()
            .input("couponID", couponID)
            .input("shopID", shopID)
            .query(`
                DELETE FROM Coupons
                OUTPUT
                    DELETED.CouponID,
                    DELETED.ShopID
                WHERE CouponID = @couponID
                  AND ShopID = @shopID
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Coupon not found.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Coupon deleted successfully.",
            data: result.recordset[0],
        });
    } catch (error) {
        console.error("Delete Shop Coupon Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete coupon.",
            error: error.message,
        });
    }
};

/*
|--------------------------------------------------------------------------
| TOGGLE COUPON STATUS
|--------------------------------------------------------------------------
| IsActive true  -> false
| IsActive false -> true
|--------------------------------------------------------------------------
*/

export const toggleShopCouponStatus = async (req, res) => {
    try {
        const shopID = getShopID(req);
        const couponID = Number(req.params.id);

        if (!shopID) {
            return res.status(403).json({
                success: false,
                message: "Shop ID not found in authentication token.",
            });
        }

        if (!Number.isInteger(couponID) || couponID <= 0) {
            return res.status(400).json({
                success: false,
                message: "Valid Coupon ID is required.",
            });
        }

        const db = getDB();

        const result = await db
            .request()
            .input("couponID", couponID)
            .input("shopID", shopID)
            .query(`
                UPDATE Coupons
                SET
                    IsActive =
                        CASE
                            WHEN IsActive = 1 THEN 0
                            ELSE 1
                        END,
                    UpdatedAt = SYSUTCDATETIME()
                OUTPUT
                    INSERTED.CouponID,
                    INSERTED.ShopID,
                    INSERTED.CouponCode,
                    INSERTED.IsActive,
                    INSERTED.UpdatedAt
                WHERE CouponID = @couponID
                  AND ShopID = @shopID
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Coupon not found.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Coupon status updated successfully.",
            data: result.recordset[0],
        });
    } catch (error) {
        console.error(
            "Toggle Shop Coupon Status Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to update coupon status.",
            error: error.message,
        });
    }
};