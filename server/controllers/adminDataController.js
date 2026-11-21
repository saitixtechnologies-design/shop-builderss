import { getDB } from "../config/db.js";
import { sqlIndiaTime } from "../utils/indiaTime.js";

const sendDatabaseError = (res, error, label) => {
    console.error(`${label} Error:`, error);
    return res.status(
        error.message === "Database is not connected" ? 503 : 500
    ).json({
        success: false,
        message: error.message === "Database is not connected"
            ? "Database unavailable. Check the SQL Server connection."
            : `Unable to load ${label.toLowerCase()}.`
    });
};

export const getAdminDashboard = async (_req, res) => {
    try {
        const db = getDB();

        /*
         * ConfirmedAt may not exist in older databases.
         * We check first so dashboard never crashes.
         */
        const dashboardColumnsResult = await db.request().query(`
            SELECT
                CASE
                    WHEN COL_LENGTH('dbo.Orders', 'ConfirmedAt') IS NULL
                    THEN 0
                    ELSE 1
                END AS HasConfirmedAt,
                CASE
                    WHEN COL_LENGTH('dbo.Products', 'Status') IS NOT NULL
                    THEN 1
                    ELSE 0
                END AS ProductsHasStatus,
                CASE
                    WHEN COL_LENGTH('dbo.Products', 'IsActive') IS NOT NULL
                    THEN 1
                    ELSE 0
                END AS ProductsHasIsActive,
                CASE
                    WHEN COL_LENGTH('dbo.Coupons', 'Status') IS NOT NULL
                    THEN 1
                    ELSE 0
                END AS CouponsHasStatus,
                CASE
                    WHEN COL_LENGTH('dbo.Coupons', 'IsActive') IS NOT NULL
                    THEN 1
                    ELSE 0
                END AS CouponsHasIsActive
        `);

        const dashboardColumns = dashboardColumnsResult.recordset[0] || {};
        const hasConfirmedAt =
            Number(dashboardColumns.HasConfirmedAt) === 1;

        // Older installs use Status while the current schema uses IsActive.
        // Build predicates only from the column names verified above so the
        // dashboard works with either database layout.
        const productActivePredicate =
            Number(dashboardColumns.ProductsHasStatus) === 1
                ? "Status = 'Active'"
                : Number(dashboardColumns.ProductsHasIsActive) === 1
                    ? "IsActive = 1"
                    : "1 = 1";
        const couponActivePredicate =
            Number(dashboardColumns.CouponsHasStatus) === 1
                ? "Status = 'Active'"
                : Number(dashboardColumns.CouponsHasIsActive) === 1
                    ? "IsActive = 1"
                    : "1 = 1";


        /*
         * If ConfirmedAt exists -> use it.
         * Otherwise temporarily use UpdatedAt only when
         * current status is Confirmed.
         *
         * This keeps old databases compatible.
         */
        const confirmedAtSQL = hasConfirmedAt
            ? "o.ConfirmedAt"
            : `
                CASE
                    WHEN o.OrderStatus = 'Confirmed'
                    THEN o.UpdatedAt
                    ELSE NULL
                END
            `;


        const [
            shops,
            products,
            categories,
            brands,
            services,
            banners,
            coupons,
            orders,
            customers,

            activeShops,
            activeProducts,
            activeCategories,
            activeBrands,
            activeServices,
            activeBanners,
            activeCoupons,

            recentShops,
            recentOrders,
            orderStatuses,
            orderTrend,
            productCategories,
            recentActivity
        ] = await Promise.all([

            /* =================================================
               TOTAL COUNTS
            ================================================= */

            db.request().query(`
                SELECT COUNT(*) AS total
                FROM dbo.Shops
            `),

            db.request().query(`
                SELECT COUNT(*) AS total
                FROM dbo.Products
            `),

            db.request().query(`
                SELECT COUNT(*) AS total
                FROM dbo.Categories
            `),

            db.request().query(`
                SELECT COUNT(*) AS total
                FROM dbo.Brands
            `),

            db.request().query(`
                SELECT COUNT(*) AS total
                FROM dbo.Services
            `),

            db.request().query(`
                SELECT COUNT(*) AS total
                FROM dbo.Banners
            `),

            db.request().query(`
                SELECT COUNT(*) AS total
                FROM dbo.Coupons
            `),

            db.request().query(`
                SELECT COUNT(*) AS total
                FROM dbo.Orders
            `),

            db.request().query(`
                SELECT COUNT(*) AS total
                FROM dbo.Customers
            `),


            /* =================================================
               ACTIVE COUNTS

               IMPORTANT:
               Products -> Status
               Categories -> IsActive
               Brands -> IsActive
               Services -> Status
               Banners -> Status
               Coupons -> IsActive
            ================================================= */

            db.request().query(`
                SELECT COUNT(*) AS total
                FROM dbo.Shops
                WHERE Status = 'Active'
            `),

            db.request().query(`
                SELECT COUNT(*) AS total
                FROM dbo.Products
                WHERE ${productActivePredicate}
            `),

            db.request().query(`
                SELECT COUNT(*) AS total
                FROM dbo.Categories
                WHERE IsActive = 1
            `),

            db.request().query(`
                SELECT COUNT(*) AS total
                FROM dbo.Brands
                WHERE IsActive = 1
            `),

            db.request().query(`
                SELECT COUNT(*) AS total
                FROM dbo.Services
                WHERE Status = 'Active'
            `),

            db.request().query(`
                SELECT COUNT(*) AS total
                FROM dbo.Banners
                WHERE Status = 'Active'
            `),

            db.request().query(`
                SELECT COUNT(*) AS total
                FROM dbo.Coupons
                WHERE ${couponActivePredicate}
            `),


            /* =================================================
               RECENT SHOPS
            ================================================= */

            db.request().query(`
                SELECT TOP 6
                    s.ShopID,
                    s.ShopName,
                    s.ShopSlug,
                    s.OwnerName,
                    s.Email,
                    s.Status,
                    s.CreatedAt,

                    COUNT(p.ProductID) AS ProductCount

                FROM dbo.Shops s

                LEFT JOIN dbo.Products p
                    ON p.ShopID = s.ShopID

                GROUP BY
                    s.ShopID,
                    s.ShopName,
                    s.ShopSlug,
                    s.OwnerName,
                    s.Email,
                    s.Status,
                    s.CreatedAt

                ORDER BY s.CreatedAt DESC
            `),


            /* =================================================
               RECENT ORDERS
            ================================================= */

            db.request().query(`
                SELECT TOP 8

                    o.OrderID,
                    o.ShopID,

                    s.ShopName,

                    o.CustomerID,

                    COALESCE(
                        c.FullName,
                        o.ShippingName,
                        'Guest Customer'
                    ) AS CustomerName,

                    COALESCE(
                        c.Phone,
                        o.ShippingPhone
                    ) AS CustomerPhone,

                    o.OrderNumber,
                    o.OrderStatus,

                    o.PaymentStatus,
                    o.PaymentMethod,

                    o.SubTotal,
                    o.DiscountAmount,
                    o.ShippingAmount,
                    o.TaxAmount,
                    o.GrandTotal,

                    o.CreatedAt,

                    ${confirmedAtSQL} AS ConfirmedAt,

                    o.UpdatedAt

                FROM dbo.Orders o

                INNER JOIN dbo.Shops s
                    ON s.ShopID = o.ShopID

                LEFT JOIN dbo.Customers c
                    ON c.CustomerID = o.CustomerID
                    AND c.ShopID = o.ShopID

                ORDER BY o.CreatedAt DESC
            `),


            /* =================================================
               ORDER STATUS
            ================================================= */

            db.request().query(`
                SELECT
                    OrderStatus,
                    COUNT(*) AS Total

                FROM dbo.Orders

                GROUP BY OrderStatus

                ORDER BY Total DESC
            `),


            /* =================================================
               LAST 6 MONTHS ORDER TREND
            ================================================= */

            db.request().query(`
                ;WITH Months AS
                (
                    SELECT
                        DATEFROMPARTS(
                            YEAR(DATEADD(MONTH, -5, GETDATE())),
                            MONTH(DATEADD(MONTH, -5, GETDATE())),
                            1
                        ) AS MonthStart

                    UNION ALL

                    SELECT
                        DATEADD(MONTH, 1, MonthStart)

                    FROM Months

                    WHERE MonthStart <
                        DATEFROMPARTS(
                            YEAR(GETDATE()),
                            MONTH(GETDATE()),
                            1
                        )
                )

                SELECT
                    FORMAT(
                        m.MonthStart,
                        'MMM yyyy'
                    ) AS Month,

                    COUNT(o.OrderID) AS Orders

                FROM Months m

                LEFT JOIN dbo.Orders o
                    ON o.CreatedAt >= m.MonthStart
                    AND o.CreatedAt <
                        DATEADD(
                            MONTH,
                            1,
                            m.MonthStart
                        )

                GROUP BY
                    m.MonthStart

                ORDER BY
                    m.MonthStart

                OPTION (MAXRECURSION 12)
            `),


            /* =================================================
               PRODUCTS BY CATEGORY
            ================================================= */

            db.request().query(`
                SELECT TOP 10

                    c.CategoryName,

                    COUNT(p.ProductID) AS ProductCount

                FROM dbo.Categories c

                LEFT JOIN dbo.Products p
                    ON p.CategoryID = c.CategoryID
                    AND p.ShopID = c.ShopID

                GROUP BY
                    c.CategoryID,
                    c.CategoryName

                ORDER BY
                    ProductCount DESC
            `),


            /* =================================================
               PLATFORM ACTIVITY
            ================================================= */

            db.request().query(`
                SELECT TOP 12

                    ActivityType,
                    ActivityName,
                    ShopName,
                    ActivityDate

                FROM
                (
                    /* SHOPS */

                    SELECT
                        'Shop' AS ActivityType,
                        s.ShopName AS ActivityName,
                        s.ShopName,
                        s.CreatedAt AS ActivityDate

                    FROM dbo.Shops s


                    UNION ALL


                    /* PRODUCTS */

                    SELECT
                        'Product' AS ActivityType,
                        p.ProductName AS ActivityName,
                        s.ShopName,
                        p.CreatedAt AS ActivityDate

                    FROM dbo.Products p

                    INNER JOIN dbo.Shops s
                        ON s.ShopID = p.ShopID


                    UNION ALL


                    /* SERVICES */

                    SELECT
                        'Service' AS ActivityType,
                        sv.ServiceName AS ActivityName,
                        s.ShopName,
                        sv.CreatedAt AS ActivityDate

                    FROM dbo.Services sv

                    INNER JOIN dbo.Shops s
                        ON s.ShopID = sv.ShopID


                    UNION ALL


                    /* BANNERS */

                    SELECT
                        'Banner' AS ActivityType,
                        b.Title AS ActivityName,
                        s.ShopName,
                        b.CreatedAt AS ActivityDate

                    FROM dbo.Banners b

                    INNER JOIN dbo.Shops s
                        ON s.ShopID = b.ShopID


                    UNION ALL


                    /* COUPONS */

                    SELECT
                        'Coupon' AS ActivityType,
                        cp.CouponCode AS ActivityName,
                        s.ShopName,
                        cp.CreatedAt AS ActivityDate

                    FROM dbo.Coupons cp

                    INNER JOIN dbo.Shops s
                        ON s.ShopID = cp.ShopID


                    UNION ALL


                    /* ORDERS */

                    SELECT
                        'Order' AS ActivityType,
                        o.OrderNumber AS ActivityName,
                        s.ShopName,
                        o.CreatedAt AS ActivityDate

                    FROM dbo.Orders o

                    INNER JOIN dbo.Shops s
                        ON s.ShopID = o.ShopID

                ) AS activity

                ORDER BY
                    ActivityDate DESC
            `)

        ]);


        /* =====================================================
           RESPONSE
        ===================================================== */

        return res.json({

            success: true,

            data: {

                stats: {
                    shops:
                        shops.recordset[0]?.total || 0,

                    products:
                        products.recordset[0]?.total || 0,

                    categories:
                        categories.recordset[0]?.total || 0,

                    brands:
                        brands.recordset[0]?.total || 0,

                    services:
                        services.recordset[0]?.total || 0,

                    banners:
                        banners.recordset[0]?.total || 0,

                    coupons:
                        coupons.recordset[0]?.total || 0,

                    orders:
                        orders.recordset[0]?.total || 0,

                    customers:
                        customers.recordset[0]?.total || 0
                },


                activeStats: {
                    shops:
                        activeShops.recordset[0]?.total || 0,

                    products:
                        activeProducts.recordset[0]?.total || 0,

                    categories:
                        activeCategories.recordset[0]?.total || 0,

                    brands:
                        activeBrands.recordset[0]?.total || 0,

                    services:
                        activeServices.recordset[0]?.total || 0,

                    banners:
                        activeBanners.recordset[0]?.total || 0,

                    coupons:
                        activeCoupons.recordset[0]?.total || 0
                },


                recentShops:
                    recentShops.recordset,

                recentOrders:
                    recentOrders.recordset,

                orderStatuses:
                    orderStatuses.recordset,

                orderTrend:
                    orderTrend.recordset,

                productCategories:
                    productCategories.recordset,

                recentActivity:
                    recentActivity.recordset,

                meta: {
                    hasConfirmedAt
                }
            }
        });

    } catch (error) {

        console.error(
            "Dashboard Error:",
            error
        );

        return sendDatabaseError(
            res,
            error,
            "Dashboard"
        );
    }
};

export const getAdminUsers = async (_req, res) => {
    try {
        const result = await getDB().request().query(`
            SELECT
                u.UserID, u.ShopID, s.ShopName, r.RoleName AS Role,
                u.FullName, u.Email, u.Phone, u.IsActive,
                u.LastLoginAt, u.CreatedAt
            FROM dbo.Users u
            INNER JOIN dbo.Roles r ON r.RoleID = u.RoleID
            LEFT JOIN dbo.Shops s ON s.ShopID = u.ShopID
            ORDER BY u.CreatedAt DESC
        `);
        return res.json({ success: true, data: result.recordset });
    } catch (error) {
        return sendDatabaseError(res, error, "Users");
    }
};

export const getAdminOrders = async (_req, res) => {
    try {
        const result = await getDB().request().query(`
            SELECT
                o.OrderID, o.ShopID, s.ShopName, o.CustomerID,
                COALESCE(c.FullName, o.ShippingName) AS CustomerName,
                COALESCE(c.Phone, o.ShippingPhone) AS CustomerPhone,
                o.OrderNumber, o.OrderStatus, o.PaymentStatus,
                o.PaymentMethod, o.SubTotal, o.DiscountAmount,
                o.ShippingAmount, o.TaxAmount, o.GrandTotal,
                o.CreatedAt
            FROM dbo.Orders o
            INNER JOIN dbo.Shops s ON s.ShopID = o.ShopID
            LEFT JOIN dbo.Customers c ON c.CustomerID = o.CustomerID
            ORDER BY o.CreatedAt DESC
        `);
        return res.json({ success: true, data: result.recordset });
    } catch (error) {
        return sendDatabaseError(res, error, "Orders");
    }
};

const allowedOrderStatuses = new Set([
    "Pending", "Confirmed", "Processing", "Ready",
    "Out For Delivery", "Delivered", "Cancelled"
]);

const orderScopeForUser = (req) => {
    if (["ShopAdmin", "Shop Admin"].includes(req.user?.role)) {
        return Number(req.user.shopID ?? req.user.ShopID) || 0;
    }
    if (["SuperAdmin", "Super Admin"].includes(req.user?.role)) return null;
    return undefined;
};

export const getOrderDetails = async (req, res) => {
    try {
        const shopID = orderScopeForUser(req);
        if (shopID === undefined) return res.status(403).json({ success: false, message: "Order access denied." });
        if (shopID === 0) return res.status(403).json({ success: false, message: "Shop ID is missing from your session." });

        const orderID = Number(req.params.id);
        if (!Number.isInteger(orderID) || orderID < 1) {
            return res.status(400).json({ success: false, message: "A valid order ID is required." });
        }
        const db = getDB();
        const orderResult = await db.request()
            .input("OrderID", orderID)
            .input("ShopID", shopID)
            .query(`
                SELECT o.OrderID, o.ShopID, s.ShopName, o.CustomerID,
                    COALESCE(c.FullName, o.ShippingName) AS CustomerName,
                    COALESCE(c.Phone, o.ShippingPhone) AS CustomerPhone,
                    c.Email AS CustomerEmail, o.OrderNumber, o.OrderStatus,
                    o.PaymentStatus, o.PaymentMethod, o.SubTotal, o.DiscountAmount,
                    o.ShippingAmount, o.TaxAmount, o.GrandTotal, o.ShippingName,
                    o.ShippingPhone, o.ShippingAddress, o.ShippingCity,
                    o.ShippingState, o.ShippingPostalCode, o.CreatedAt, o.UpdatedAt
                FROM dbo.Orders o
                INNER JOIN dbo.Shops s ON s.ShopID = o.ShopID
                LEFT JOIN dbo.Customers c ON c.CustomerID = o.CustomerID AND c.ShopID = o.ShopID
                WHERE o.OrderID = @OrderID AND (@ShopID IS NULL OR o.ShopID = @ShopID)
            `);
        if (!orderResult.recordset.length) return res.status(404).json({ success: false, message: "Order not found." });

        const orderItemSchema = await db.request().query(`
            SELECT CASE WHEN COL_LENGTH(N'dbo.OrderItems', N'Size') IS NULL THEN 0 ELSE 1 END AS HasSize
        `);
        const orderSizeExpression = orderItemSchema.recordset[0]?.HasSize ? "oi.Size" : "CAST(NULL AS NVARCHAR(50)) AS Size";
        const itemResult = await db.request()
            .input("OrderID", orderID)
            .input("ShopID", shopID)
            .query(`
                SELECT oi.OrderItemID, oi.ProductID, oi.ProductName, oi.SKU, ${orderSizeExpression},
                    oi.Quantity, oi.UnitPrice, oi.TotalPrice
                FROM dbo.OrderItems oi
                INNER JOIN dbo.Orders o ON o.OrderID = oi.OrderID
                WHERE oi.OrderID = @OrderID AND (@ShopID IS NULL OR o.ShopID = @ShopID)
                ORDER BY oi.OrderItemID
            `);
        return res.json({ success: true, data: { order: orderResult.recordset[0], items: itemResult.recordset } });
    } catch (error) {
        return sendDatabaseError(res, error, "Order details");
    }
};

export const updateOrderStatus = async (req, res) => {
    try {
        const shopID = orderScopeForUser(req);

        if (shopID === undefined) {
            return res.status(403).json({
                success: false,
                message: "Order access denied."
            });
        }

        if (shopID === 0) {
            return res.status(403).json({
                success: false,
                message: "Shop ID is missing from your session."
            });
        }

        const orderID = Number(req.params.id);
        const status = String(req.body?.status || "").trim();

        if (!Number.isInteger(orderID) || orderID < 1) {
            return res.status(400).json({
                success: false,
                message: "A valid order ID is required."
            });
        }

        if (!allowedOrderStatuses.has(status)) {
            return res.status(400).json({
                success: false,
                message: "Choose a valid order status."
            });
        }

        const db = getDB();

        // Cancelling gives the order's stock back; reopening a cancelled order takes it again.
        // Only orders marked StockDeducted took stock (see database/OrderStockMigration.sql).
        // Every real change is also written to dbo.OrderHistory (who, from, to, when).
        const changedBy = String(req.user?.fullName || req.user?.name || req.user?.email || "").slice(0, 150) ||
            (shopID ? "Shop owner" : "Platform admin");
        const result = await db.request()
            .input("OrderID", orderID)
            .input("ShopID", shopID)
            .input("OrderStatus", status)
            .input("ChangedBy", changedBy)
            .query(`
                SET NOCOUNT ON;
                BEGIN TRY
                BEGIN TRANSACTION;

                DECLARE @PreviousStatus NVARCHAR(40);
                SELECT @PreviousStatus = OrderStatus
                FROM dbo.Orders WITH (UPDLOCK, ROWLOCK)
                WHERE OrderID = @OrderID AND (@ShopID IS NULL OR ShopID = @ShopID);

                IF COL_LENGTH('dbo.Orders', 'StockDeducted') IS NOT NULL
                BEGIN
                    DECLARE @OldStatus NVARCHAR(40), @Deducted BIT;
                    EXEC sp_executesql
                        N'SELECT @OldStatus = OrderStatus, @Deducted = StockDeducted
                          FROM dbo.Orders WITH (UPDLOCK, ROWLOCK)
                          WHERE OrderID = @OrderID AND (@ShopID IS NULL OR ShopID = @ShopID);',
                        N'@OrderID INT, @ShopID INT, @OldStatus NVARCHAR(40) OUTPUT, @Deducted BIT OUTPUT',
                        @OrderID, @ShopID, @OldStatus OUTPUT, @Deducted OUTPUT;

                    IF @OrderStatus = N'Cancelled' AND @OldStatus <> N'Cancelled' AND @Deducted = 1
                    BEGIN
                        UPDATE p SET p.StockQuantity = p.StockQuantity + items.Quantity
                        FROM dbo.Products p
                        INNER JOIN (SELECT ProductID, SUM(Quantity) AS Quantity FROM dbo.OrderItems WHERE OrderID = @OrderID GROUP BY ProductID) items
                            ON items.ProductID = p.ProductID
                        INNER JOIN dbo.Orders o ON o.OrderID = @OrderID AND o.ShopID = p.ShopID;
                        EXEC sp_executesql N'UPDATE dbo.Orders SET StockDeducted = 0 WHERE OrderID = @OrderID;', N'@OrderID INT', @OrderID;
                    END

                    IF @OrderStatus <> N'Cancelled' AND @OldStatus = N'Cancelled' AND @Deducted = 0
                    BEGIN
                        IF EXISTS (
                            SELECT 1
                            FROM dbo.Products p
                            INNER JOIN (SELECT ProductID, SUM(Quantity) AS Quantity FROM dbo.OrderItems WHERE OrderID = @OrderID GROUP BY ProductID) items
                                ON items.ProductID = p.ProductID
                            INNER JOIN dbo.Orders o ON o.OrderID = @OrderID AND o.ShopID = p.ShopID
                            WHERE p.StockQuantity < items.Quantity
                        )
                            THROW 50003, N'Not enough stock to reopen this order. Add stock to its products first.', 1;

                        UPDATE p SET p.StockQuantity = p.StockQuantity - items.Quantity
                        FROM dbo.Products p
                        INNER JOIN (SELECT ProductID, SUM(Quantity) AS Quantity FROM dbo.OrderItems WHERE OrderID = @OrderID GROUP BY ProductID) items
                            ON items.ProductID = p.ProductID
                        INNER JOIN dbo.Orders o ON o.OrderID = @OrderID AND o.ShopID = p.ShopID;
                        EXEC sp_executesql N'UPDATE dbo.Orders SET StockDeducted = 1 WHERE OrderID = @OrderID;', N'@OrderID INT', @OrderID;
                    END
                END

                UPDATE dbo.Orders
                SET
                    OrderStatus = @OrderStatus,
                    ConfirmedAt =
                        CASE
                            WHEN @OrderStatus = 'Confirmed'
                                 AND ConfirmedAt IS NULL
                            THEN SYSDATETIME()
                            ELSE ConfirmedAt
                        END,
                    UpdatedAt = SYSDATETIME()
                OUTPUT
                    inserted.OrderID,
                    inserted.ShopID,
                    inserted.OrderStatus,
                    inserted.ConfirmedAt,
                    inserted.UpdatedAt
                WHERE
                    OrderID = @OrderID
                    AND (@ShopID IS NULL OR ShopID = @ShopID);

                IF @PreviousStatus IS NOT NULL AND @PreviousStatus <> @OrderStatus
                   AND OBJECT_ID(N'dbo.OrderHistory', N'U') IS NOT NULL
                    EXEC sp_executesql
                        N'INSERT INTO dbo.OrderHistory (OrderID, ShopID, EntryType, FromStatus, ToStatus, CreatedBy)
                          SELECT OrderID, ShopID, N''Status'', @From, @To, @By FROM dbo.Orders WHERE OrderID = @OrderID;',
                        N'@OrderID INT, @From NVARCHAR(40), @To NVARCHAR(40), @By NVARCHAR(150)',
                        @OrderID, @PreviousStatus, @OrderStatus, @ChangedBy;

                COMMIT TRANSACTION;
                END TRY
                BEGIN CATCH
                    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                    THROW;
                END CATCH;
            `);

        if (!result.recordset.length) {
            return res.status(404).json({
                success: false,
                message: "Order not found in your shop."
            });
        }

        return res.json({
            success: true,
            message: "Order status updated.",
            data: result.recordset[0]
        });

    } catch (error) {
        if (error.number === 50003 || /Not enough stock to reopen/.test(String(error.message))) {
            return res.status(409).json({ success: false, message: error.message });
        }
        return sendDatabaseError(res, error, "Order status");
    }
};

export const getAdminCustomers = async (_req, res) => {
    try {
        const result = await getDB().request().query(`
            SELECT
                c.CustomerID, c.ShopID, s.ShopName,
                c.FullName, c.Email, c.Phone, c.IsActive, c.CreatedAt
            FROM dbo.Customers c
            INNER JOIN dbo.Shops s ON s.ShopID = c.ShopID
            ORDER BY c.CreatedAt DESC
        `);
        return res.json({ success: true, data: result.recordset });
    } catch (error) {
        return sendDatabaseError(res, error, "Customers");
    }
};

export const getShopOrders = async (req, res) => {
    try {
        const result = await getDB().request()
            .input("ShopID", Number(req.user.shopID ?? req.user.ShopID))
            .query(`
                SELECT
                    o.OrderID, o.OrderNumber, o.CustomerID,
                    COALESCE(c.FullName, o.ShippingName) AS CustomerName,
                    COALESCE(c.Phone, o.ShippingPhone) AS CustomerPhone,
                    c.Email AS CustomerEmail,
                    o.OrderStatus, o.PaymentStatus, o.PaymentMethod,
                    o.SubTotal, o.DiscountAmount, o.ShippingAmount,
                    o.TaxAmount, o.GrandTotal, o.CreatedAt
                FROM dbo.Orders o
                LEFT JOIN dbo.Customers c ON c.CustomerID = o.CustomerID
                WHERE o.ShopID = @ShopID
                ORDER BY o.CreatedAt DESC
            `);
        return res.json({ success: true, data: result.recordset });
    } catch (error) {
        return sendDatabaseError(res, error, "Shop orders");
    }
};

export const getShopCustomers = async (req, res) => {
    try {
        const result = await getDB().request()
            .input("ShopID", Number(req.user.shopID ?? req.user.ShopID))
            .query(`
                SELECT
                    c.CustomerID, c.FullName, c.Email, c.Phone, c.IsActive,
                    ${sqlIndiaTime("c.CreatedAt")} AS JoinedAtIndia,
                    COUNT(CASE WHEN o.OrderStatus <> N'Cancelled' THEN 1 END) AS OrderCount,
                    COALESCE(SUM(CASE WHEN o.OrderStatus <> N'Cancelled' THEN o.GrandTotal END), 0) AS TotalSpent,
                    MAX(${sqlIndiaTime("o.CreatedAt")}) AS LastOrderAtIndia
                FROM dbo.Customers c
                LEFT JOIN dbo.Orders o ON o.CustomerID = c.CustomerID AND o.ShopID = c.ShopID
                WHERE c.ShopID = @ShopID
                GROUP BY c.CustomerID, c.FullName, c.Email, c.Phone, c.IsActive, c.CreatedAt
                ORDER BY MAX(o.CreatedAt) DESC, c.CreatedAt DESC
            `);
        return res.json({ success: true, data: result.recordset });
    } catch (error) {
        return sendDatabaseError(res, error, "Shop customers");
    }
};
