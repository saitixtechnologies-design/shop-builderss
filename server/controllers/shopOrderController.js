import { getDB } from "../config/db.js";
import { eachDate, readDateRange, sqlIndiaDate, sqlIndiaDateRange, sqlIndiaTime } from "../utils/indiaTime.js";

// Shop Admin orders and sales reports. Mounted at /api/shop-orders (routes/shopOrderRoutes.js).
// Every query is limited to the signed-in owner's shop (ShopID from the sign-in token).
// Dates are Indian dates (see utils/indiaTime.js). Revenue = orders that are not cancelled.

export const ORDER_STATUSES = ["Pending", "Confirmed", "Processing", "Ready", "Out For Delivery", "Delivered", "Cancelled"];
// Online = the shop's website; the others are sales entered in Shop Admin → Add Sale.
export const ORDER_SOURCES = ["Online", "Counter", "Phone", "WhatsApp", "Other"];
const MAX_PAGE_SIZE = 100;
const MAX_EXPORT_ROWS = 10_000;

const shopIdFrom = (req) => Number(req.user?.shopID ?? req.user?.ShopID);

function fail(res, error, action) {
    console.error(`Shop orders ${action} error:`, error.message);
    const unavailable = error.message === "Database is not connected";
    return res.status(unavailable ? 503 : 500).json({
        success: false,
        message: unavailable ? "The database is not reachable right now. Please try again shortly." : "Something went wrong. Please try again."
    });
}

/**
 * Shared filters for the list and the export: dates, status, customer and a search over order
 * number, customer name and phone. Returns { where, bind } or { error }.
 */
function orderFilters(req) {
    const range = readDateRange(req.query);
    if (range.error) return { error: range.error };

    const where = ["o.ShopID = @ShopID", sqlIndiaDateRange("o.CreatedAt")];
    const params = { ShopID: shopIdFrom(req), From: range.from, To: range.to };

    const status = String(req.query.status || "");
    if (ORDER_STATUSES.includes(status)) {
        where.push("o.OrderStatus = @Status");
        params.Status = status;
    }
    const source = String(req.query.source || "");
    if (ORDER_SOURCES.includes(source)) {
        where.push("o.OrderSource = @Source");
        params.Source = source;
    }
    const customerID = Number.parseInt(req.query.customerId, 10);
    if (customerID > 0) {
        where.push("o.CustomerID = @CustomerID");
        params.CustomerID = customerID;
    }
    const search = String(req.query.search || "").trim().slice(0, 100);
    if (search) {
        where.push("(o.OrderNumber LIKE @Search OR o.ShippingName LIKE @Search OR o.ShippingPhone LIKE @Search OR c.FullName LIKE @Search OR c.Phone LIKE @Search)");
        params.Search = `%${search.replace(/[%_[\]]/g, (char) => `[${char}]`)}%`;
    }

    const bind = (request) => {
        for (const [name, value] of Object.entries(params)) request.input(name, value);
        return request;
    };
    return { where: where.join(" AND "), bind, range };
}

const ORDER_COLUMNS = `
    o.OrderID, o.OrderNumber, o.OrderStatus, o.CustomerID,
    o.OrderSource, o.PaymentStatus, o.PaymentMethod,
    COALESCE(c.FullName, o.ShippingName) AS CustomerName,
    COALESCE(c.Phone, o.ShippingPhone) AS CustomerPhone,
    o.ShippingCity, o.SubTotal, o.DiscountAmount, o.ShippingAmount, o.TaxAmount, o.GrandTotal,
    ${sqlIndiaTime("o.CreatedAt")} AS CreatedAtIndia,
    (SELECT COALESCE(SUM(oi.Quantity), 0) FROM dbo.OrderItems oi WHERE oi.OrderID = o.OrderID) AS ItemCount`;

const ORDER_FROM = `
    FROM dbo.Orders o
    LEFT JOIN dbo.Customers c ON c.CustomerID = o.CustomerID AND c.ShopID = o.ShopID`;

// ------------------------------------------------------------ list

/** GET /api/shop-orders?from&to&status&search&customerId&page&pageSize */
export const listOrders = async (req, res) => {
    try {
        const filters = orderFilters(req);
        if (filters.error) return res.status(400).json({ success: false, message: filters.error });

        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(5, Number.parseInt(req.query.pageSize, 10) || 20));
        const db = getDB();

        const [rows, count] = await Promise.all([
            filters.bind(db.request()).input("Offset", (page - 1) * pageSize).input("PageSize", pageSize).query(`
                SELECT ${ORDER_COLUMNS}
                ${ORDER_FROM}
                WHERE ${filters.where}
                ORDER BY o.CreatedAt DESC, o.OrderID DESC
                OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY
            `),
            filters.bind(db.request()).query(`SELECT COUNT(*) AS Total ${ORDER_FROM} WHERE ${filters.where}`)
        ]);

        return res.json({
            success: true,
            data: rows.recordset,
            meta: { page, pageSize, total: count.recordset[0].Total, from: filters.range.from, to: filters.range.to }
        });
    } catch (error) {
        return fail(res, error, "list");
    }
};

// ------------------------------------------------------------ sales summary

/** GET /api/shop-orders/summary?from&to: totals, a value for every day, and orders by status. */
export const getOrderSummary = async (req, res) => {
    try {
        const range = readDateRange(req.query);
        if (range.error) return res.status(400).json({ success: false, message: range.error });

        const db = getDB();
        const scoped = () => db.request().input("ShopID", shopIdFrom(req)).input("From", range.from).input("To", range.to);
        const inRange = `o.ShopID = @ShopID AND ${sqlIndiaDateRange("o.CreatedAt")}`;

        const [totals, daily, byStatus, topProducts, bySource] = await Promise.all([
            scoped().query(`
                SELECT
                    COUNT(CASE WHEN o.OrderStatus <> N'Cancelled' THEN 1 END) AS Orders,
                    COALESCE(SUM(CASE WHEN o.OrderStatus <> N'Cancelled' THEN o.GrandTotal END), 0) AS Revenue,
                    COALESCE(SUM(CASE WHEN o.OrderStatus = N'Delivered' THEN o.GrandTotal END), 0) AS DeliveredRevenue,
                    COALESCE(SUM(CASE WHEN o.OrderStatus <> N'Cancelled' THEN o.DiscountAmount END), 0) AS Discounts,
                    COUNT(CASE WHEN o.OrderStatus = N'Cancelled' THEN 1 END) AS CancelledOrders,
                    COALESCE(SUM(CASE WHEN o.OrderStatus = N'Cancelled' THEN o.GrandTotal END), 0) AS CancelledValue,
                    COUNT(CASE WHEN o.OrderStatus IN (N'Pending', N'Confirmed', N'Processing', N'Ready', N'Out For Delivery') THEN 1 END) AS OpenOrders,
                    COUNT(DISTINCT CASE WHEN o.OrderStatus <> N'Cancelled' THEN o.CustomerID END) AS Customers
                FROM dbo.Orders o
                WHERE ${inRange}
            `),
            scoped().query(`
                SELECT ${sqlIndiaDate("o.CreatedAt")} AS Day,
                    COUNT(*) AS Orders,
                    COALESCE(SUM(o.GrandTotal), 0) AS Revenue
                FROM dbo.Orders o
                WHERE ${inRange} AND o.OrderStatus <> N'Cancelled'
                GROUP BY ${sqlIndiaDate("o.CreatedAt")}
            `),
            scoped().query(`
                SELECT o.OrderStatus AS Status, COUNT(*) AS Orders, COALESCE(SUM(o.GrandTotal), 0) AS Value
                FROM dbo.Orders o
                WHERE ${inRange}
                GROUP BY o.OrderStatus
            `),
            scoped().query(`
                SELECT TOP 5 oi.ProductName, SUM(oi.Quantity) AS Units, COALESCE(SUM(oi.TotalPrice), 0) AS Revenue
                FROM dbo.OrderItems oi
                INNER JOIN dbo.Orders o ON o.OrderID = oi.OrderID
                WHERE ${inRange} AND o.OrderStatus <> N'Cancelled'
                GROUP BY oi.ProductName
                ORDER BY SUM(oi.TotalPrice) DESC
            `),
            scoped().query(`
                SELECT o.OrderSource AS Source, COUNT(*) AS Orders, COALESCE(SUM(o.GrandTotal), 0) AS Revenue
                FROM dbo.Orders o
                WHERE ${inRange} AND o.OrderStatus <> N'Cancelled'
                GROUP BY o.OrderSource
            `)
        ]);

        const t = totals.recordset[0];
        const perDay = new Map(daily.recordset.map((row) => [new Date(row.Day).toISOString().slice(0, 10), row]));
        return res.json({
            success: true,
            data: {
                from: range.from,
                to: range.to,
                totals: {
                    revenue: Number(t.Revenue),
                    orders: t.Orders,
                    averageOrderValue: t.Orders ? Math.round((Number(t.Revenue) / t.Orders) * 100) / 100 : 0,
                    deliveredRevenue: Number(t.DeliveredRevenue),
                    discounts: Number(t.Discounts),
                    openOrders: t.OpenOrders,
                    cancelledOrders: t.CancelledOrders,
                    cancelledValue: Number(t.CancelledValue),
                    customers: t.Customers
                },
                daily: eachDate(range.from, range.to).map((day) => ({
                    date: day,
                    orders: perDay.get(day)?.Orders || 0,
                    revenue: Number(perDay.get(day)?.Revenue || 0)
                })),
                byStatus: ORDER_STATUSES.map((status) => {
                    const row = byStatus.recordset.find((entry) => entry.Status === status);
                    return { status, orders: row?.Orders || 0, value: Number(row?.Value || 0) };
                }),
                topProducts: topProducts.recordset.map((row) => ({ name: row.ProductName, units: row.Units, revenue: Number(row.Revenue) })),
                bySource: ORDER_SOURCES.map((source) => {
                    const row = bySource.recordset.find((entry) => entry.Source === source);
                    return { source, orders: row?.Orders || 0, revenue: Number(row?.Revenue || 0) };
                })
            }
        });
    } catch (error) {
        return fail(res, error, "summary");
    }
};

// ------------------------------------------------------------ export

const csvCell = (value) => {
    const text = value === null || value === undefined ? "" : String(value);
    // Quote every cell. Text starting with = + - @ would run as a spreadsheet formula, so it gets a
    // leading apostrophe; plain numbers such as "+91 98765 43210" or "-5.00" are left as they are.
    const isPlainNumber = /^[+-]?[\d\s.,]+$/.test(text);
    const safe = /^[=+\-@]/.test(text) && !isPlainNumber ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
};

/** GET /api/shop-orders/export?(same filters as the list) -> CSV file (opens in Excel). */
export const exportOrders = async (req, res) => {
    try {
        const filters = orderFilters(req);
        if (filters.error) return res.status(400).json({ success: false, message: filters.error });

        const result = await filters.bind(getDB().request()).query(`
            SELECT TOP ${MAX_EXPORT_ROWS} ${ORDER_COLUMNS}
            ${ORDER_FROM}
            WHERE ${filters.where}
            ORDER BY o.CreatedAt DESC, o.OrderID DESC
        `);

        const header = ["Order number", "Date (IST)", "Source", "Customer", "Phone", "City", "Items", "Status", "Payment", "Paid", "Subtotal", "Discount", "Total"];
        const lines = result.recordset.map((order) => [
            order.OrderNumber,
            new Date(order.CreatedAtIndia).toISOString().slice(0, 16).replace("T", " "),
            order.OrderSource,
            order.CustomerName,
            order.CustomerPhone,
            order.ShippingCity,
            order.ItemCount,
            order.OrderStatus,
            order.PaymentMethod,
            order.PaymentStatus,
            Number(order.SubTotal).toFixed(2),
            Number(order.DiscountAmount).toFixed(2),
            Number(order.GrandTotal).toFixed(2)
        ].map(csvCell).join(","));

        res.set({
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="orders-${filters.range.from}-to-${filters.range.to}.csv"`,
            "Cache-Control": "no-store"
        });
        // The BOM makes Excel read Hindi and other non-English text correctly.
        return res.send(`\uFEFF${[header.map(csvCell).join(","), ...lines].join("\r\n")}`);
    } catch (error) {
        return fail(res, error, "export");
    }
};

// ------------------------------------------------------------ one order

async function findOrder(db, shopID, orderID) {
    const result = await db.request().input("ShopID", shopID).input("OrderID", orderID).query(`
        SELECT o.OrderID, o.OrderNumber, o.OrderStatus, o.CustomerID,
            o.OrderSource, o.PaymentStatus, o.PaymentMethod,
            COALESCE(c.FullName, o.ShippingName) AS CustomerName,
            COALESCE(c.Phone, o.ShippingPhone) AS CustomerPhone,
            c.Email AS CustomerEmail,
            o.ShippingName, o.ShippingPhone, o.ShippingAddress, o.ShippingCity, o.ShippingState, o.ShippingPostalCode,
            o.SubTotal, o.DiscountAmount, o.ShippingAmount, o.TaxAmount, o.GrandTotal,
            ${sqlIndiaTime("o.CreatedAt")} AS CreatedAtIndia
        ${ORDER_FROM}
        WHERE o.OrderID = @OrderID AND o.ShopID = @ShopID
    `);
    return result.recordset[0] || null;
}

/** GET /api/shop-orders/:id -> order, items and its history (status changes and notes). */
export const getOrder = async (req, res) => {
    try {
        const orderID = Number.parseInt(req.params.id, 10);
        if (!(orderID > 0)) return res.status(400).json({ success: false, message: "Choose a valid order." });

        const db = getDB();
        const shopID = shopIdFrom(req);
        const order = await findOrder(db, shopID, orderID);
        if (!order) return res.status(404).json({ success: false, message: "Order not found in your shop." });

        const sizeColumn = await db.request().query("SELECT CASE WHEN COL_LENGTH(N'dbo.OrderItems', N'Size') IS NULL THEN 0 ELSE 1 END AS HasSize");
        const [items, history] = await Promise.all([
            db.request().input("OrderID", orderID).query(`
                SELECT OrderItemID, ProductID, ProductName, SKU,
                    ${sizeColumn.recordset[0].HasSize ? "Size" : "CAST(NULL AS NVARCHAR(50)) AS Size"},
                    Quantity, UnitPrice, TotalPrice
                FROM dbo.OrderItems
                WHERE OrderID = @OrderID
                ORDER BY OrderItemID
            `),
            db.request().input("OrderID", orderID).input("ShopID", shopID).query(`
                SELECT OrderHistoryID, EntryType, FromStatus, ToStatus, Note, CreatedBy,
                    DATEADD(MINUTE, 330, CreatedAt) AS CreatedAtIndia
                FROM dbo.OrderHistory
                WHERE OrderID = @OrderID AND ShopID = @ShopID
                ORDER BY CreatedAt DESC, OrderHistoryID DESC
            `)
        ]);

        return res.json({ success: true, data: { order, items: items.recordset, history: history.recordset } });
    } catch (error) {
        return fail(res, error, "details");
    }
};

/** POST /api/shop-orders/:id/notes { note } -> a private note on the order (customers never see it). */
export const addOrderNote = async (req, res) => {
    try {
        const orderID = Number.parseInt(req.params.id, 10);
        const note = String(req.body?.note || "").trim();
        if (!(orderID > 0)) return res.status(400).json({ success: false, message: "Choose a valid order." });
        if (!note) return res.status(400).json({ success: false, message: "Write a note first." });
        if (note.length > 1000) return res.status(400).json({ success: false, message: "Keep notes under 1000 characters." });

        const db = getDB();
        const shopID = shopIdFrom(req);
        if (!(await findOrder(db, shopID, orderID))) return res.status(404).json({ success: false, message: "Order not found in your shop." });

        const saved = await db.request()
            .input("OrderID", orderID)
            .input("ShopID", shopID)
            .input("Note", note)
            .input("CreatedBy", String(req.user?.email || "Shop owner").slice(0, 150))
            .query(`
                INSERT INTO dbo.OrderHistory (OrderID, ShopID, EntryType, Note, CreatedBy)
                OUTPUT inserted.OrderHistoryID, inserted.EntryType, inserted.Note, inserted.CreatedBy,
                    DATEADD(MINUTE, 330, inserted.CreatedAt) AS CreatedAtIndia
                VALUES (@OrderID, @ShopID, N'Note', @Note, @CreatedBy)
            `);
        return res.status(201).json({ success: true, message: "Note added.", data: saved.recordset[0] });
    } catch (error) {
        return fail(res, error, "note");
    }
};

// ------------------------------------------------------------ new-order alerts

/**
 * GET /api/shop-orders/alerts?afterId=123 -> how many orders arrived after order 123, and the
 * newest one. The browser remembers the last order the owner has seen.
 */
export const getOrderAlerts = async (req, res) => {
    try {
        const afterID = Math.max(0, Number.parseInt(req.query.afterId, 10) || 0);
        const result = await getDB().request().input("ShopID", shopIdFrom(req)).input("AfterID", afterID).query(`
            SELECT
                (SELECT COUNT(*) FROM dbo.Orders WHERE ShopID = @ShopID AND OrderSource = N'Online' AND OrderID > @AfterID) AS NewOrders,
                (SELECT TOP 1 OrderID FROM dbo.Orders WHERE ShopID = @ShopID AND OrderSource = N'Online' ORDER BY OrderID DESC) AS LatestOrderID,
                (SELECT TOP 1 OrderNumber FROM dbo.Orders WHERE ShopID = @ShopID AND OrderSource = N'Online' ORDER BY OrderID DESC) AS LatestOrderNumber
        `);
        const row = result.recordset[0];
        res.set("Cache-Control", "no-store");
        return res.json({
            success: true,
            data: { newOrders: afterID ? row.NewOrders : 0, latestOrderId: row.LatestOrderID || 0, latestOrderNumber: row.LatestOrderNumber || null }
        });
    } catch (error) {
        return fail(res, error, "alerts");
    }
};
