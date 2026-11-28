import { getDB } from "../config/db.js";

// Shop Admin notifications (the bell in the top bar). Mounted at /api/shop-notifications.
// Built from the shop's own data, so nothing extra is stored and every query is limited to the
// signed-in owner's shop (ShopID from the sign-in token):
//   attention: stock that ran out or is low, and orders still "Pending" after a day
//   activity:  the latest website orders, customers (online shops) or enquiries (service shops)
// Each item has a stable key; the browser remembers which keys the owner has seen.

const DEFAULT_LOW_STOCK = 5;
const WAITING_HOURS = 24;

const shopIdFrom = (req) => Number(req.user?.shopID ?? req.user?.ShopID);
const isServiceShop = (req) => String(req.user?.shopType || "").trim().toLowerCase() === "service";
const money = (value) => Number(value || 0);

// Online shop: four small queries in one round trip.
const ECOMMERCE_SQL = `
    SELECT TOP 20 OrderID, OrderNumber, OrderStatus, GrandTotal, ShippingName,
           DATEDIFF(second, CreatedAt, GETDATE()) AS AgeSeconds
    FROM dbo.Orders
    WHERE ShopID = @ShopID AND OrderSource = N'Online'
    ORDER BY OrderID DESC;

    SELECT COUNT(*) AS Waiting, MAX(OrderID) AS NewestID,
           MIN(DATEDIFF(second, CreatedAt, GETDATE())) - ${WAITING_HOURS * 3600} AS AgeSeconds
    FROM dbo.Orders
    WHERE ShopID = @ShopID AND OrderStatus = N'Pending'
      AND CreatedAt < DATEADD(hour, -${WAITING_HOURS}, GETDATE());

    SELECT TOP 15 ProductID, ProductName, StockQuantity,
           COALESCE(NULLIF(LowStockThreshold, 0), ${DEFAULT_LOW_STOCK}) AS LowAt
    FROM dbo.Products
    WHERE ShopID = @ShopID AND IsActive = 1 AND StockQuantity IS NOT NULL
      AND StockQuantity <= COALESCE(NULLIF(LowStockThreshold, 0), ${DEFAULT_LOW_STOCK})
    ORDER BY StockQuantity, ProductName;

    SELECT TOP 10 CustomerID, FullName, DATEDIFF(second, CreatedAt, GETDATE()) AS AgeSeconds
    FROM dbo.Customers
    WHERE ShopID = @ShopID
    ORDER BY CustomerID DESC;
`;

const SERVICE_SQL = `
    SELECT TOP 20 EnquiryID, CustomerName, ServiceName, Status,
           DATEDIFF(second, CreatedAt, GETDATE()) AS AgeSeconds
    FROM dbo.ShopServiceEnquiries
    WHERE ShopID = @ShopID
    ORDER BY EnquiryID DESC;
`;

function ecommerceItems([orders, waiting, stock, customers]) {
    const attention = [];
    const activity = [];

    for (const product of stock) {
        const out = Number(product.StockQuantity) <= 0;
        attention.push({
            key: `stock-${product.ProductID}-${out ? "out" : "low"}`,
            type: out ? "stock-out" : "stock-low",
            link: "/shop-admin/products",
            data: { product: product.ProductName, left: Math.max(0, Number(product.StockQuantity)), lowAt: product.LowAt }
        });
    }

    const late = waiting[0];
    if (late?.Waiting > 0) {
        attention.unshift({
            key: `waiting-${late.NewestID}-${late.Waiting}`,
            type: "orders-waiting",
            ageSeconds: Math.max(0, late.AgeSeconds),
            link: "/shop-admin/orders",
            data: { count: late.Waiting, hours: WAITING_HOURS }
        });
    }

    for (const order of orders) {
        activity.push({
            key: `order-${order.OrderID}`,
            type: order.OrderStatus === "Cancelled" ? "order-cancelled" : "order-new",
            ageSeconds: order.AgeSeconds,
            link: "/shop-admin/orders",
            data: { number: order.OrderNumber, customer: order.ShippingName, total: money(order.GrandTotal), status: order.OrderStatus }
        });
    }
    for (const customer of customers) {
        activity.push({
            key: `customer-${customer.CustomerID}`,
            type: "customer-new",
            ageSeconds: customer.AgeSeconds,
            link: "/shop-admin/customers",
            data: { name: customer.FullName }
        });
    }

    activity.sort((a, b) => a.ageSeconds - b.ageSeconds);
    return { attention, activity };
}

function serviceItems([enquiries]) {
    return {
        attention: [],
        activity: enquiries.map((enquiry) => ({
            key: `enquiry-${enquiry.EnquiryID}`,
            type: "enquiry-new",
            ageSeconds: enquiry.AgeSeconds,
            link: "/shop-admin/services",
            data: { name: enquiry.CustomerName, service: enquiry.ServiceName, status: enquiry.Status }
        }))
    };
}

export const getShopNotifications = async (req, res) => {
    try {
        const service = isServiceShop(req);
        const result = await getDB().request()
            .input("ShopID", shopIdFrom(req))
            .query(service ? SERVICE_SQL : ECOMMERCE_SQL);

        res.set("Cache-Control", "no-store");
        return res.json({
            success: true,
            data: service ? serviceItems(result.recordsets) : ecommerceItems(result.recordsets)
        });
    } catch (error) {
        console.error("Shop notifications error:", error.message);
        const unavailable = error.message === "Database is not connected";
        return res.status(unavailable ? 503 : 500).json({
            success: false,
            message: unavailable ? "The database is not reachable right now. Please try again shortly." : "Could not load notifications."
        });
    }
};
