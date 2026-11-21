import { getDB } from "../config/db.js";
import { sqlIndiaDate, sqlIndiaToday } from "../utils/indiaTime.js";

const sendDatabaseError = (res, error, label) => {
    console.error(`${label} Error:`, error);

    return res.status(500).json({
        success: false,
        message: `Unable to load ${label.toLowerCase()}.`
    });
};


export const getShopDashboard = async (req, res) => {

    try {

        /*
         * IMPORTANT
         * ShopID JWT se aayega.
         * Frontend se nahi.
         */

        const shopID = Number(
            req.user?.shopID ??
            req.user?.ShopID
        );

        if (!Number.isInteger(shopID) || shopID < 1) {

            return res.status(403).json({
                success: false,
                message: "Shop ID missing from login session."
            });

        }


        const db = getDB();


        const [

            shop,

            products,
            services,
            categories,
            brands,
            customers,
            orders,

            todayOrders,
            pendingOrders,
            confirmedOrders,
            deliveredOrders,

            totalSales,
            todaySales,

            recentOrders

        ] = await Promise.all([


            // =================================================
            // SHOP
            // =================================================

            db.request()
                .input("ShopID", shopID)
                .query(`
                    SELECT
                        ShopID,
                        ShopName,
                        ShopSlug,
                        OwnerName,
                        Email,
                        Status,
                        LogoURL,
                        CreatedAt

                    FROM dbo.Shops

                    WHERE ShopID = @ShopID
                `),


            // =================================================
            // PRODUCTS
            // =================================================

            db.request()
                .input("ShopID", shopID)
                .query(`
                    SELECT COUNT(*) AS total

                    FROM dbo.Products

                    WHERE ShopID = @ShopID
                `),


            // =================================================
            // SERVICES
            // =================================================

            db.request()
                .input("ShopID", shopID)
                .query(`
                    SELECT COUNT(*) AS total

                    FROM dbo.Services

                    WHERE ShopID = @ShopID
                `),


            // =================================================
            // CATEGORIES
            // =================================================

            db.request()
                .input("ShopID", shopID)
                .query(`
                    SELECT COUNT(*) AS total

                    FROM dbo.Categories

                    WHERE ShopID = @ShopID
                `),


            // =================================================
            // BRANDS
            // =================================================

            db.request()
                .input("ShopID", shopID)
                .query(`
                    SELECT COUNT(*) AS total

                    FROM dbo.Brands

                    WHERE ShopID = @ShopID
                `),


            // =================================================
            // CUSTOMERS
            // =================================================

            db.request()
                .input("ShopID", shopID)
                .query(`
                    SELECT COUNT(*) AS total

                    FROM dbo.Customers

                    WHERE ShopID = @ShopID
                `),


            // =================================================
            // ORDERS
            // =================================================

            db.request()
                .input("ShopID", shopID)
                .query(`
                    SELECT COUNT(*) AS total

                    FROM dbo.Orders

                    WHERE ShopID = @ShopID
                `),


            // =================================================
            // TODAY ORDERS
            // =================================================

            db.request()
                .input("ShopID", shopID)
                .query(`
                    SELECT COUNT(*) AS total

                    FROM dbo.Orders

                    WHERE ShopID = @ShopID

                    AND ${sqlIndiaDate("CreatedAt")}
                        = ${sqlIndiaToday}
                `),


            // =================================================
            // PENDING
            // =================================================

            db.request()
                .input("ShopID", shopID)
                .query(`
                    SELECT COUNT(*) AS total

                    FROM dbo.Orders

                    WHERE ShopID = @ShopID
                    AND OrderStatus = 'Pending'
                `),


            // =================================================
            // CONFIRMED
            // =================================================

            db.request()
                .input("ShopID", shopID)
                .query(`
                    SELECT COUNT(*) AS total

                    FROM dbo.Orders

                    WHERE ShopID = @ShopID
                    AND OrderStatus = 'Confirmed'
                `),


            // =================================================
            // DELIVERED
            // =================================================

            db.request()
                .input("ShopID", shopID)
                .query(`
                    SELECT COUNT(*) AS total

                    FROM dbo.Orders

                    WHERE ShopID = @ShopID
                    AND OrderStatus = 'Delivered'
                `),


            // =================================================
            // TOTAL SALES
            // =================================================

            db.request()
                .input("ShopID", shopID)
                .query(`
                    SELECT
                        ISNULL(
                            SUM(GrandTotal),
                            0
                        ) AS total

                    FROM dbo.Orders

                    WHERE ShopID = @ShopID

                    AND OrderStatus <> 'Cancelled'
                `),


            // =================================================
            // TODAY SALES
            // =================================================

            db.request()
                .input("ShopID", shopID)
                .query(`
                    SELECT
                        ISNULL(
                            SUM(GrandTotal),
                            0
                        ) AS total

                    FROM dbo.Orders

                    WHERE ShopID = @ShopID

                    AND OrderStatus <> 'Cancelled'

                    AND ${sqlIndiaDate("CreatedAt")}
                        = ${sqlIndiaToday}
                `),


            // =================================================
            // RECENT ORDERS
            // =================================================

            db.request()
                .input("ShopID", shopID)
                .query(`
                    SELECT TOP 10

                        o.OrderID,
                        o.OrderNumber,

                        COALESCE(
                            c.FullName,
                            o.ShippingName,
                            'Customer'
                        ) AS CustomerName,

                        COALESCE(
                            c.Phone,
                            o.ShippingPhone
                        ) AS CustomerPhone,

                        o.GrandTotal AS TotalAmount,

                        o.OrderStatus AS Status,

                        o.PaymentStatus,
                        o.PaymentMethod,

                        o.CreatedAt

                    FROM dbo.Orders o

                    LEFT JOIN dbo.Customers c
                        ON c.CustomerID = o.CustomerID

                    WHERE o.ShopID = @ShopID

                    ORDER BY
                        o.CreatedAt DESC
                `)

        ]);


        // =====================================================
        // SHOP NOT FOUND
        // =====================================================

        if (!shop.recordset.length) {

            return res.status(404).json({
                success: false,
                message: "Shop not found."
            });

        }


        // =====================================================
        // RESPONSE
        // =====================================================

        return res.json({

            success: true,

            data: {

                shop: shop.recordset[0],

                stats: {

                    totalProducts:
                        products.recordset[0]?.total || 0,

                    totalServices:
                        services.recordset[0]?.total || 0,

                    totalCategories:
                        categories.recordset[0]?.total || 0,

                    totalBrands:
                        brands.recordset[0]?.total || 0,

                    totalCustomers:
                        customers.recordset[0]?.total || 0,

                    totalOrders:
                        orders.recordset[0]?.total || 0,


                    todayOrders:
                        todayOrders.recordset[0]?.total || 0,

                    pendingOrders:
                        pendingOrders.recordset[0]?.total || 0,

                    confirmedOrders:
                        confirmedOrders.recordset[0]?.total || 0,

                    deliveredOrders:
                        deliveredOrders.recordset[0]?.total || 0,


                    totalSales:
                        totalSales.recordset[0]?.total || 0,

                    todaySales:
                        todaySales.recordset[0]?.total || 0
                },


                recentOrders:
                    recentOrders.recordset

            }

        });

    } catch (error) {

        return sendDatabaseError(
            res,
            error,
            "Shop Dashboard"
        );

    }

};