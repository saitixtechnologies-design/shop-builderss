import { getDB } from "../config/db.js";
import { randomUUID } from "node:crypto";

const clean = (value) => String(value ?? "").trim();

export const getPublicShopfront = async (req, res) => {
    try {
        const slug = clean(req.params.slug).toLowerCase();
        if (!slug) {
            return res.status(400).json({ success: false, message: "Shop slug is required." });
        }

        const db = getDB();
        const shopResult = await db.request().input("ShopSlug", slug).query(`
            SELECT ShopID, ShopName, ShopSlug, OwnerName, Email, Phone, LogoURL, ShopType, WebsiteTemplate, Status
            FROM dbo.Shops
            WHERE LOWER(ShopSlug) = @ShopSlug AND Status = 'Active'
        `);

        if (!shopResult.recordset.length) {
            return res.status(404).json({ success: false, message: "This shop is unavailable." });
        }

        const shop = shopResult.recordset[0];
        const shopID = Number(shop.ShopID);
        const isEcommerce = String(shop.ShopType || "Ecommerce").toLowerCase() === "ecommerce";
        // Older product records store their primary image directly on Products.
        // Newer records use ProductImages. Select the legacy field only when it
        // exists so this remains compatible with both database generations.
        const productImageColumnResult = await db.request().query(`
            SELECT
                CASE WHEN COL_LENGTH(N'dbo.Products', N'ImageURL') IS NULL THEN 0 ELSE 1 END AS HasLegacyImageURL,
                CASE WHEN COL_LENGTH(N'dbo.Products', N'SizeOptions') IS NULL THEN 0 ELSE 1 END AS HasSizeOptions,
                CASE WHEN COL_LENGTH(N'dbo.OrderItems', N'Size') IS NULL THEN 0 ELSE 1 END AS HasOrderItemSize
        `);
        const productImageExpression = productImageColumnResult.recordset[0]?.HasLegacyImageURL
            ? "COALESCE((SELECT TOP 1 pi.ImageURL FROM dbo.ProductImages pi WHERE pi.ProductID = p.ProductID ORDER BY pi.IsPrimary DESC, pi.SortOrder, pi.ProductImageID), p.ImageURL)"
            : "(SELECT TOP 1 pi.ImageURL FROM dbo.ProductImages pi WHERE pi.ProductID = p.ProductID ORDER BY pi.IsPrimary DESC, pi.SortOrder, pi.ProductImageID)";
        const hasSizeOptions = Boolean(productImageColumnResult.recordset[0]?.HasSizeOptions);
        const productSizesExpression = hasSizeOptions ? "p.SizeOptions" : "CAST(NULL AS NVARCHAR(MAX))";
        const [settingsResult, categoriesResult, productsResult, servicesResult, bannersResult, portfolioResult, pagesResult, brandsResult, brandingColumnsResult, couponColumnsResult] = await Promise.all([
           db.request().input("ShopID", shopID).query(`
    SELECT TOP 1
        ShopLogo,
        Tagline,
        Phone,
        WhatsAppNumber,
        Email,

        Address,
        City,
        State,
        Pincode,

        AboutUs,

        OpeningTime,
        ClosingTime,

        FacebookURL,
        InstagramURL,
        YouTubeURL,

        WebsiteStatus,

        -- SHOP LOCATION
        MapURL,
        Latitude,
        Longitude,
        ShowMap

    FROM dbo.ShopSettings
    WHERE ShopID = @ShopID
`),
            isEcommerce ? db.request().input("ShopID", shopID).query(`
                SELECT CategoryID, CategoryName, Slug, Description, ImageURL, SortOrder
                FROM dbo.Categories WHERE ShopID = @ShopID AND IsActive = 1
                ORDER BY SortOrder, CategoryName
            `) : Promise.resolve({ recordset: [] }),
            isEcommerce ? db.request().input("ShopID", shopID).query(`
                SELECT p.ProductID, p.CategoryID, p.BrandID, p.ProductName, p.Slug, p.SKU,
                    p.ShortDescription, p.Description, p.MRP, p.SellingPrice, p.StockQuantity,
                    ${productSizesExpression} AS SizesJson, p.Tags,
                    p.IsAvailable, p.IsActive, c.CategoryName, b.BrandName,
                    (SELECT pi.ImageURL, pi.AltText, pi.SortOrder, pi.IsPrimary
                     FROM dbo.ProductImages pi
                     WHERE pi.ProductID = p.ProductID
                     ORDER BY pi.SortOrder, pi.ProductImageID
                     FOR JSON PATH) AS ImagesJson,
                    ${productImageExpression} AS ImageURL
                FROM dbo.Products p
                LEFT JOIN dbo.Categories c ON c.CategoryID = p.CategoryID AND c.ShopID = p.ShopID
                LEFT JOIN dbo.Brands b ON b.BrandID = p.BrandID AND b.ShopID = p.ShopID
                WHERE p.ShopID = @ShopID AND p.IsActive = 1 AND p.IsAvailable = 1
                ORDER BY p.CreatedAt DESC
            `) : Promise.resolve({ recordset: [] }),
            db.request().input("ShopID", shopID).query(`
                SELECT ServiceID, ServiceName, Slug, ShortDescription, Description, Price, ImageURL, ImageURLs, VideoURL
                FROM dbo.Services WHERE ShopID = @ShopID AND Status = 'Active'
                ORDER BY ServiceID DESC
            `),
            db.request().input("ShopID", shopID).query(`
                SELECT BannerID, Title, Subtitle, ImageURL, ImageURLs, VideoURL, ButtonText, ButtonLink, DisplayOrder
                FROM dbo.Banners
                WHERE ShopID = @ShopID AND Status = 'Active'
                ORDER BY DisplayOrder, BannerID DESC
            `),
            db.request().input("ShopID", shopID).query(`
                SELECT PortfolioID, Title, Category, Description, ImageURL, ImageURLs, VideoURL, ClientName, Location, ProjectDate, DisplayOrder
                FROM dbo.ShopPortfolio
                WHERE ShopID = @ShopID AND Status = 'Active'
                ORDER BY DisplayOrder, PortfolioID DESC
            `),
            db.request().input("ShopID", shopID).query(`
                SELECT PageID, ShopID, PageName, Slug, PageTitle, HtmlContent, PageType, DisplayOrder
                FROM dbo.ShopWebsitePages
                WHERE ShopID = @ShopID AND Status = 'Active'
                ORDER BY DisplayOrder, PageID
            `),
            isEcommerce ? db.request().input("ShopID", shopID).query(`
                SELECT BrandID, BrandName, LogoURL, Description
                FROM dbo.Brands
                WHERE ShopID = @ShopID AND IsActive = 1
                ORDER BY BrandName
            `) : Promise.resolve({ recordset: [] }),
            db.request().query(`
                SELECT
                    CASE WHEN COL_LENGTH(N'dbo.ShopSettings', N'PrimaryColor') IS NULL THEN 0 ELSE 1 END AS HasPrimaryColor,
                    CASE WHEN COL_LENGTH(N'dbo.ShopSettings', N'SecondaryColor') IS NULL THEN 0 ELSE 1 END AS HasSecondaryColor
            `),
            db.request().query(`
                SELECT
                    CASE WHEN COL_LENGTH(N'dbo.Coupons', N'IsActive') IS NULL THEN 0 ELSE 1 END AS HasIsActive,
                    CASE WHEN COL_LENGTH(N'dbo.Coupons', N'Status') IS NULL THEN 0 ELSE 1 END AS HasStatus,
                    CASE WHEN COL_LENGTH(N'dbo.Coupons', N'StartsAt') IS NULL THEN 0 ELSE 1 END AS HasStartsAt,
                    CASE WHEN COL_LENGTH(N'dbo.Coupons', N'StartDate') IS NULL THEN 0 ELSE 1 END AS HasStartDate,
                    CASE WHEN COL_LENGTH(N'dbo.Coupons', N'ExpiresAt') IS NULL THEN 0 ELSE 1 END AS HasExpiresAt,
                    CASE WHEN COL_LENGTH(N'dbo.Coupons', N'EndDate') IS NULL THEN 0 ELSE 1 END AS HasEndDate,
                    CASE WHEN COL_LENGTH(N'dbo.Coupons', N'UsageLimit') IS NULL THEN 0 ELSE 1 END AS HasUsageLimit,
                    CASE WHEN COL_LENGTH(N'dbo.Coupons', N'UsedCount') IS NULL THEN 0 ELSE 1 END AS HasUsedCount
            `)
        ]);

        const couponColumns = couponColumnsResult.recordset[0] || {};
        const activeFilter = couponColumns.HasIsActive ? "IsActive = 1" : couponColumns.HasStatus ? "Status = N'Active'" : "1 = 0";
        const startsColumn = couponColumns.HasStartsAt ? "StartsAt" : couponColumns.HasStartDate ? "StartDate" : null;
        const endsColumn = couponColumns.HasExpiresAt ? "ExpiresAt" : couponColumns.HasEndDate ? "EndDate" : null;
        const couponsResult = isEcommerce
            ? await db.request().input("ShopID", shopID).query(`
            SELECT CouponID, CouponCode, DiscountType, DiscountValue,
                   MinimumOrderAmount, MaximumDiscountAmount, ${startsColumn || "NULL"} AS StartsAt,
                   ${endsColumn || "NULL"} AS ExpiresAt,
                   ${couponColumns.HasUsageLimit ? "UsageLimit" : "NULL"} AS UsageLimit,
                   ${couponColumns.HasUsedCount ? "UsedCount" : "0"} AS UsedCount
            FROM dbo.Coupons
            WHERE ShopID = @ShopID AND ${activeFilter}
            ORDER BY CouponID DESC
        `)
            : { recordset: [] };

        const settings = settingsResult.recordset[0] || {};
        settings.PrimaryColor = "#193b35";
        settings.SecondaryColor = "#d49b60";
        const brandingColumns = brandingColumnsResult.recordset[0] || {};
        if (brandingColumns.HasPrimaryColor && brandingColumns.HasSecondaryColor) {
            const colorsResult = await db.request().input("ShopID", shopID).query(`
                SELECT TOP 1 PrimaryColor, SecondaryColor
                FROM dbo.ShopSettings WHERE ShopID = @ShopID
            `);
            if (colorsResult.recordset[0]) Object.assign(settings, colorsResult.recordset[0]);
        }
        if (settings.WebsiteStatus && settings.WebsiteStatus !== "Active") {
            return res.status(404).json({ success: false, message: "This shop's website is currently closed." });
        }

        return res.json({
            success: true,
            data: {
                shop,
                settings,
                categories: categoriesResult.recordset,
                products: productsResult.recordset,
                services: servicesResult.recordset,
                banners: bannersResult.recordset,
                portfolio: portfolioResult.recordset,
                pages: pagesResult.recordset,
                brands: brandsResult.recordset,
                coupons: couponsResult.recordset
            }
        });
    } catch (error) {
        console.error("Public shopfront error:", error.message);
        const unavailable = error.message === "Database is not connected";
        return res.status(unavailable ? 503 : 500).json({
            success: false,
            message: unavailable ? "Shop data is temporarily unavailable." : "Unable to load this shop.",
            ...(process.env.NODE_ENV === "development" ? { detail: error.message } : {})
        });
    }
};

export const createPublicShopOrder = async (req, res) => {
    try {
        const slug = clean(req.params.slug).toLowerCase();
        const { customer = {}, items = [], couponCode: requestedCouponCode = "" } = req.body || {};
        const fullName = clean(customer.fullName);
        const phone = clean(customer.phone).replace(/[^\d+]/g, "");
        const email = clean(customer.email);
        const address = clean(customer.address);
        const city = clean(customer.city);
        const postalCode = clean(customer.postalCode);
        const notes = clean(customer.notes);

        if (!fullName || phone.replace(/\D/g, "").length < 10 || !address || !city) {
            return res.status(400).json({ success: false, message: "Name, valid phone, address and city are required." });
        }
        if (!Array.isArray(items) || !items.length || items.length > 40) {
            return res.status(400).json({ success: false, message: "Your cart is empty or contains too many items." });
        }

        const db = getDB();
        const shopResult = await db.request().input("ShopSlug", slug).query(`
            SELECT s.ShopID, s.ShopType, ss.WhatsAppNumber
            FROM dbo.Shops s LEFT JOIN dbo.ShopSettings ss ON ss.ShopID = s.ShopID
            WHERE LOWER(s.ShopSlug) = @ShopSlug AND s.Status = 'Active'
                AND (ss.WebsiteStatus IS NULL OR ss.WebsiteStatus = 'Active')
        `);
        if (!shopResult.recordset.length) {
            return res.status(404).json({ success: false, message: "This shop is unavailable." });
        }

        const shop = shopResult.recordset[0];
        if (String(shop.ShopType || "Ecommerce").toLowerCase() !== "ecommerce") {
            return res.status(403).json({ success: false, message: "Online orders are not available for service-based shops." });
        }
        const shopID = Number(shop.ShopID);
        const normalizedItems = new Map();
        for (const item of items) {
            const productID = Number(item.productID);
            const quantity = Number(item.quantity);
            const size = clean(item.size || item.Size);
            if (!Number.isInteger(productID) || productID <= 0 || !Number.isInteger(quantity) || quantity < 1 || quantity > 99 || size.length > 50) {
                return res.status(400).json({ success: false, message: "Cart contains an invalid product, size or quantity." });
            }
            const key = `${productID}|${size}`;
            const existing = normalizedItems.get(key);
            normalizedItems.set(key, { productID, size, quantity: (existing?.quantity || 0) + quantity });
        }

        const productIDs = [...new Set([...normalizedItems.values()].map((item) => item.productID))];
        const productList = productIDs.join(",");
        const sizeSchemaResult = await db.request().query(`
            SELECT
                CASE WHEN COL_LENGTH(N'dbo.Products', N'SizeOptions') IS NULL THEN 0 ELSE 1 END AS HasSizeOptions,
                CASE WHEN COL_LENGTH(N'dbo.OrderItems', N'Size') IS NULL THEN 0 ELSE 1 END AS HasOrderItemSize
        `);
        const orderHasProductSizes = Boolean(sizeSchemaResult.recordset[0]?.HasSizeOptions);
        const orderHasItemSize = Boolean(sizeSchemaResult.recordset[0]?.HasOrderItemSize);
        const sizeSelectionExpression = orderHasProductSizes ? "SizeOptions" : "CAST(NULL AS NVARCHAR(MAX)) AS SizeOptions";
        const productsResult = await db.request().input("ShopID", shopID).query(`
            SELECT ProductID, ProductName, SKU, SellingPrice, StockQuantity, ${sizeSelectionExpression}
            FROM dbo.Products
            WHERE ShopID = @ShopID AND IsActive = 1 AND IsAvailable = 1
                AND ProductID IN (${productList})
        `);
        const productsByID = new Map(productsResult.recordset.map((product) => [Number(product.ProductID), product]));
        if (productsByID.size !== productIDs.length) {
            return res.status(409).json({ success: false, message: "A cart item is no longer available. Please refresh your cart." });
        }

        const quantitiesByProduct = new Map();
        for (const item of normalizedItems.values()) quantitiesByProduct.set(item.productID, (quantitiesByProduct.get(item.productID) || 0) + item.quantity);
        for (const [productID, quantity] of quantitiesByProduct) {
            if (Number(productsByID.get(productID).StockQuantity) < quantity) throw new Error(`${productsByID.get(productID).ProductName} does not have enough stock.`);
        }

        let subtotal = 0;
        const orderItems = [...normalizedItems.values()].map((item) => {
            const product = productsByID.get(item.productID);
            let sizes = [];
            try { sizes = Array.isArray(product.SizeOptions) ? product.SizeOptions : JSON.parse(product.SizeOptions || "[]"); } catch { sizes = []; }
            if (sizes.length && !sizes.includes(item.size)) throw new Error(`Choose a valid size for ${product.ProductName}.`);
            if (!sizes.length && item.size) throw new Error(`Size is not available for ${product.ProductName}.`);
            if (item.size && !orderHasItemSize) throw new Error("Please apply the latest Database.sql update before placing a size-specific order.");
            const unitPrice = Number(product.SellingPrice);
            subtotal += unitPrice * item.quantity;
            return { ...product, ...item, unitPrice };
        });

        const couponCode = clean(requestedCouponCode).toUpperCase();
        let coupon = null;
        let couponHasUsedCount = false;
        let discountAmount = 0;
        if (couponCode) {
            const couponColumnsResult = await db.request().query(`
                SELECT
                    CASE WHEN COL_LENGTH(N'dbo.Coupons', N'IsActive') IS NULL THEN 0 ELSE 1 END AS HasIsActive,
                    CASE WHEN COL_LENGTH(N'dbo.Coupons', N'Status') IS NULL THEN 0 ELSE 1 END AS HasStatus,
                    CASE WHEN COL_LENGTH(N'dbo.Coupons', N'StartsAt') IS NULL THEN 0 ELSE 1 END AS HasStartsAt,
                    CASE WHEN COL_LENGTH(N'dbo.Coupons', N'StartDate') IS NULL THEN 0 ELSE 1 END AS HasStartDate,
                    CASE WHEN COL_LENGTH(N'dbo.Coupons', N'ExpiresAt') IS NULL THEN 0 ELSE 1 END AS HasExpiresAt,
                    CASE WHEN COL_LENGTH(N'dbo.Coupons', N'EndDate') IS NULL THEN 0 ELSE 1 END AS HasEndDate,
                    CASE WHEN COL_LENGTH(N'dbo.Coupons', N'UsageLimit') IS NULL THEN 0 ELSE 1 END AS HasUsageLimit,
                    CASE WHEN COL_LENGTH(N'dbo.Coupons', N'UsedCount') IS NULL THEN 0 ELSE 1 END AS HasUsedCount
            `);
            const cols = couponColumnsResult.recordset[0] || {};
            couponHasUsedCount = Boolean(cols.HasUsedCount);
            const activeFilter = cols.HasIsActive ? "IsActive = 1" : cols.HasStatus ? "Status = N'Active'" : "1 = 0";
            const startsColumn = cols.HasStartsAt ? "StartsAt" : cols.HasStartDate ? "StartDate" : null;
            const endsColumn = cols.HasExpiresAt ? "ExpiresAt" : cols.HasEndDate ? "EndDate" : null;
            const found = await db.request().input("ShopID", shopID).input("CouponCode", couponCode).query(`
                SELECT TOP 1 CouponID, CouponCode, DiscountType, DiscountValue, MinimumOrderAmount,
                    MaximumDiscountAmount, ${startsColumn || "NULL"} AS StartsAt, ${endsColumn || "NULL"} AS ExpiresAt,
                    ${cols.HasUsageLimit ? "UsageLimit" : "NULL"} AS UsageLimit,
                    ${cols.HasUsedCount ? "UsedCount" : "0"} AS UsedCount
                FROM dbo.Coupons
                WHERE ShopID = @ShopID AND UPPER(LTRIM(RTRIM(CouponCode))) = @CouponCode AND ${activeFilter}
            `);
            coupon = found.recordset[0] || null;
            if (!coupon) throw new Error("This offer code is invalid or inactive.");
            const now = Date.now();
            if (coupon.StartsAt && new Date(coupon.StartsAt).getTime() > now) throw new Error("This offer has not started yet.");
            if (coupon.ExpiresAt && new Date(coupon.ExpiresAt).getTime() < now) throw new Error("This offer has expired.");
            if (Number(coupon.UsageLimit) > 0 && Number(coupon.UsedCount || 0) >= Number(coupon.UsageLimit)) throw new Error("This offer has reached its redemption limit.");
            if (subtotal < Number(coupon.MinimumOrderAmount || 0)) throw new Error(`This offer needs a minimum order of ${Number(coupon.MinimumOrderAmount).toFixed(2)}.`);
            discountAmount = String(coupon.DiscountType).toLowerCase() === "percentage"
                ? subtotal * Number(coupon.DiscountValue) / 100
                : Number(coupon.DiscountValue);
            if (Number(coupon.MaximumDiscountAmount) > 0) discountAmount = Math.min(discountAmount, Number(coupon.MaximumDiscountAmount));
            discountAmount = Math.max(0, Math.min(subtotal, Math.round(discountAmount * 100) / 100));
        }
        const grandTotal = Math.max(0, subtotal - discountAmount);
        const orderNumber = `SB-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 6).toUpperCase()}`;
        const quote = (value) => `'${String(value ?? "").replace(/'/g, "''")}'`;
        const itemSQL = orderItems.map((item) => orderHasItemSize
            ? `(@OrderID, ${item.ProductID}, ${quote(item.ProductName)}, ${quote(item.SKU)}, ${item.size ? quote(item.size) : "NULL"}, ${item.quantity}, ${item.unitPrice.toFixed(2)})`
            : `(@OrderID, ${item.ProductID}, ${quote(item.ProductName)}, ${quote(item.SKU)}, ${item.quantity}, ${item.unitPrice.toFixed(2)})`).join(",\n");
        const orderItemColumns = orderHasItemSize
            ? "OrderID, ProductID, ProductName, SKU, Size, Quantity, UnitPrice"
            : "OrderID, ProductID, ProductName, SKU, Quantity, UnitPrice";
        const dbBatch = `
            SET NOCOUNT ON;
            BEGIN TRY
                BEGIN TRANSACTION;
                DECLARE @CustomerID INT;
                ${coupon && couponHasUsedCount ? `UPDATE dbo.Coupons WITH (UPDLOCK, ROWLOCK) SET UsedCount = UsedCount + 1 WHERE CouponID = ${Number(coupon.CouponID)} AND ShopID = ${shopID} AND (${Number(coupon.UsageLimit) > 0 ? `UsedCount < ${Number(coupon.UsageLimit)}` : "1 = 1"}); IF @@ROWCOUNT = 0 THROW 50001, 'This offer has reached its redemption limit.', 1;` : ""}
                SELECT TOP 1 @CustomerID = CustomerID FROM dbo.Customers WITH (UPDLOCK, HOLDLOCK)
                WHERE ShopID = ${shopID} AND Phone = ${quote(phone)};
                IF @CustomerID IS NULL
                BEGIN
                    INSERT INTO dbo.Customers (ShopID, FullName, Email, Phone, IsActive, CreatedAt, UpdatedAt)
                    VALUES (${shopID}, ${quote(fullName)}, ${email ? quote(email) : "NULL"}, ${quote(phone)}, 1, GETDATE(), GETDATE());
                    SET @CustomerID = SCOPE_IDENTITY();
                END
                ELSE
                BEGIN
                    UPDATE dbo.Customers SET FullName = ${quote(fullName)}, Email = ${email ? quote(email) : "NULL"}, UpdatedAt = GETDATE()
                    WHERE CustomerID = @CustomerID AND ShopID = ${shopID};
                END;
                INSERT INTO dbo.Orders
                    (ShopID, CustomerID, OrderNumber, OrderStatus, PaymentStatus, PaymentMethod,
                     SubTotal, DiscountAmount, ShippingAmount, TaxAmount, GrandTotal,
                     ShippingName, ShippingPhone, ShippingAddress, ShippingCity, ShippingState, ShippingPostalCode, CreatedAt, UpdatedAt)
                VALUES
                    (${shopID}, @CustomerID, ${quote(orderNumber)}, 'Pending', 'Pending', 'WhatsApp',
                     ${subtotal.toFixed(2)}, ${discountAmount.toFixed(2)}, 0, 0, ${grandTotal.toFixed(2)},
                     ${quote(fullName)}, ${quote(phone)}, ${quote(address)}, ${quote(city)}, ${quote("India")}, ${quote(postalCode)}, GETDATE(), GETDATE());
                DECLARE @OrderID INT = SCOPE_IDENTITY();
                INSERT INTO dbo.OrderItems (${orderItemColumns})
                VALUES ${itemSQL};
                COMMIT TRANSACTION;
                SELECT @OrderID AS OrderID, ${quote(orderNumber)} AS OrderNumber, ${quote(shop.WhatsAppNumber || "")} AS WhatsAppNumber;
            END TRY
            BEGIN CATCH
                IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                THROW;
            END CATCH;
        `;
        const savedOrder = await db.request().query(dbBatch);
        const result = savedOrder.recordset?.[0] || {};

        return res.status(201).json({
            success: true,
            message: "Order saved successfully.",
            data: {
                orderID: result.OrderID,
                orderNumber,
                whatsappNumber: result.WhatsAppNumber || shop.WhatsAppNumber || "",
                subtotal,
                discountAmount,
                total: grandTotal,
                couponCode: discountAmount ? coupon?.CouponCode : "",
                items: orderItems.map(({ ProductID, ProductName, quantity, unitPrice, size }) => ({
                    productID: ProductID, name: ProductName, size, quantity, unitPrice
                }))
            }
        });
    } catch (error) {
        console.error("Create public shop order error:", error.message);
        const unavailable = error.message === "Database is not connected";
        return res.status(unavailable ? 503 : 400).json({
            success: false,
            message: unavailable ? "Ordering is temporarily unavailable. Please try again shortly." : error.message
        });
    }
};
