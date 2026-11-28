import { randomUUID } from "node:crypto";
import sql from "mssql";
import { getDB } from "../config/db.js";

// Shop Admin → Add Sale: sales the owner makes outside the website (counter, phone, WhatsApp).
// They are saved as ordinary orders with OrderSource set, so Orders, Reports, the dashboard and
// stock all include them. Mounted under /api/shop-orders (routes/shopOrderRoutes.js); every query
// is limited to the signed-in owner's shop.

export const SALE_SOURCES = ["Counter", "Phone", "WhatsApp", "Other"];
export const SALE_PAYMENT_METHODS = ["Cash", "UPI", "Card", "Bank transfer", "Other"];
const SALE_STATUSES = ["Delivered", "Pending", "Confirmed", "Processing", "Ready", "Out For Delivery"];
const MAX_ITEMS = 60;
const MAX_QUANTITY = 9999;
const MAX_PRICE = 10_000_000;

const shopIdFrom = (req) => Number(req.user?.shopID ?? req.user?.ShopID);
const text = (value, max) => String(value ?? "").trim().slice(0, max);
const money = (value) => Math.round(Number(value) * 100) / 100;

class SaleError extends Error {}

function fail(res, error, action) {
    if (error instanceof SaleError) return res.status(400).json({ success: false, message: error.message });
    console.error(`Add sale ${action} error:`, error.message);
    const unavailable = error.message === "Database is not connected";
    return res.status(unavailable ? 503 : 500).json({
        success: false,
        message: unavailable ? "The database is not reachable right now. Please try again shortly." : "The sale could not be saved. Please try again."
    });
}

const readSizes = (value) => {
    try {
        const sizes = Array.isArray(value) ? value : JSON.parse(value || "[]");
        return Array.isArray(sizes) ? sizes.map(String) : [];
    } catch {
        return [];
    }
};

// ------------------------------------------------------------ product search for the sale screen

/** GET /api/shop-orders/sale-products?search= → active products with price, stock and sizes. */
export const listSaleProducts = async (req, res) => {
    try {
        const search = text(req.query.search, 100);
        const request = getDB().request().input("ShopID", shopIdFrom(req));
        let filter = "";
        if (search) {
            request.input("Search", `%${search.replace(/[%_[\]]/g, (char) => `[${char}]`)}%`);
            filter = "AND (p.ProductName LIKE @Search OR p.SKU LIKE @Search OR p.ModelNo LIKE @Search)";
        }
        const result = await request.query(`
            SELECT TOP 40 p.ProductID, p.ProductName, p.SKU, p.SellingPrice, p.MRP, p.StockQuantity, p.SizeOptions,
                (SELECT TOP 1 pi.ImageURL FROM dbo.ProductImages pi WHERE pi.ProductID = p.ProductID
                 ORDER BY pi.IsPrimary DESC, pi.SortOrder, pi.ProductImageID) AS ImageURL
            FROM dbo.Products p
            WHERE p.ShopID = @ShopID AND p.IsActive = 1 ${filter}
            ORDER BY CASE WHEN p.StockQuantity > 0 THEN 0 ELSE 1 END, p.ProductName
        `);
        res.set("Cache-Control", "no-store");
        return res.json({
            success: true,
            data: result.recordset.map((product) => ({
                productID: product.ProductID,
                name: product.ProductName,
                sku: product.SKU,
                price: Number(product.SellingPrice),
                mrp: product.MRP === null ? null : Number(product.MRP),
                stock: Number(product.StockQuantity || 0),
                sizes: readSizes(product.SizeOptions),
                image: product.ImageURL || null
            }))
        });
    } catch (error) {
        return fail(res, error, "products");
    }
};

// ------------------------------------------------------------ save a sale

/** Checks the request and returns a clean sale, or throws SaleError with a message for the owner. */
function readSale(body = {}) {
    const source = SALE_SOURCES.includes(body.source) ? body.source : null;
    if (!source) throw new SaleError("Choose where the sale happened: Counter, Phone, WhatsApp or Other.");

    const paymentMethod = SALE_PAYMENT_METHODS.includes(body.paymentMethod) ? body.paymentMethod : null;
    if (!paymentMethod) throw new SaleError("Choose how the customer paid.");
    const paymentStatus = body.paid === false ? "Pending" : "Paid";
    const status = SALE_STATUSES.includes(body.status) ? body.status : "Delivered";

    const customerName = text(body.customer?.name, 150);
    const phone = text(body.customer?.phone, 20).replace(/[^\d+]/g, "");
    if (phone && phone.replace(/\D/g, "").length < 10) throw new SaleError("Enter a 10-digit phone number, or leave it empty.");
    const address = text(body.customer?.address, 500);
    const city = text(body.customer?.city, 100);
    const note = text(body.note, 1000);

    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) throw new SaleError("Add at least one product to the sale.");
    if (items.length > MAX_ITEMS) throw new SaleError(`A sale can have up to ${MAX_ITEMS} products.`);

    const lines = new Map();
    for (const item of items) {
        const productID = Number(item.productID);
        const quantity = Number(item.quantity);
        const size = text(item.size, 50);
        const hasPrice = item.unitPrice !== undefined && item.unitPrice !== null && item.unitPrice !== "";
        const unitPrice = hasPrice ? Number(item.unitPrice) : null;
        if (!Number.isInteger(productID) || productID <= 0) throw new SaleError("One of the products is not valid. Remove it and add it again.");
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) throw new SaleError(`Quantity must be a whole number from 1 to ${MAX_QUANTITY}.`);
        if (hasPrice && (!Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice > MAX_PRICE)) throw new SaleError("Enter a valid price for every product.");
        const key = `${productID}|${size}|${hasPrice ? money(unitPrice) : ""}`;
        const existing = lines.get(key);
        lines.set(key, { productID, size, unitPrice: hasPrice ? money(unitPrice) : null, quantity: (existing?.quantity || 0) + quantity });
    }

    const discount = body.discount === undefined || body.discount === "" ? 0 : Number(body.discount);
    if (!Number.isFinite(discount) || discount < 0) throw new SaleError("Discount must be zero or more.");

    return { source, paymentMethod, paymentStatus, status, customerName, phone, address, city, note, lines: [...lines.values()], discount: money(discount) };
}

/**
 * POST /api/shop-orders { source, items: [{ productID, quantity, unitPrice?, size? }], discount,
 *   paymentMethod, paid, status, customer: { name, phone, address, city }, note }
 * Saves the sale as an order and takes the stock, all in one transaction.
 */
export const createManualSale = async (req, res) => {
    let transaction;
    try {
        const sale = readSale(req.body);
        const shopID = shopIdFrom(req);
        const db = getDB();

        // Products of this shop only; the price and stock come from the database, never the browser.
        const productIDs = [...new Set(sale.lines.map((line) => line.productID))];
        const productRequest = db.request().input("ShopID", shopID);
        productIDs.forEach((id, index) => productRequest.input(`P${index}`, id));
        const productResult = await productRequest.query(`
            SELECT ProductID, ProductName, SKU, SellingPrice, StockQuantity, SizeOptions
            FROM dbo.Products
            WHERE ShopID = @ShopID AND IsActive = 1 AND ProductID IN (${productIDs.map((_, index) => `@P${index}`).join(", ")})
        `);
        const products = new Map(productResult.recordset.map((product) => [Number(product.ProductID), product]));
        const missing = productIDs.find((id) => !products.has(id));
        if (missing) throw new SaleError("A product in this sale was removed or turned off. Remove it and try again.");

        const neededByProduct = new Map();
        let subtotal = 0;
        const orderLines = sale.lines.map((line) => {
            const product = products.get(line.productID);
            const sizes = readSizes(product.SizeOptions);
            if (sizes.length && !sizes.includes(line.size)) throw new SaleError(`Choose a size for ${product.ProductName}.`);
            if (!sizes.length && line.size) throw new SaleError(`${product.ProductName} has no sizes.`);
            const unitPrice = line.unitPrice ?? money(product.SellingPrice);
            subtotal += unitPrice * line.quantity;
            neededByProduct.set(line.productID, (neededByProduct.get(line.productID) || 0) + line.quantity);
            return { ...line, unitPrice, name: product.ProductName, sku: product.SKU };
        });
        for (const [productID, needed] of neededByProduct) {
            const product = products.get(productID);
            const left = Number(product.StockQuantity || 0);
            if (left < needed) throw new SaleError(`Only ${Math.max(0, left)} left of ${product.ProductName}. Lower the quantity or add stock in Products first.`);
        }
        subtotal = money(subtotal);
        if (sale.discount > subtotal) throw new SaleError("Discount cannot be more than the sale amount.");
        const grandTotal = money(subtotal - sale.discount);
        const orderNumber = `SB-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 6).toUpperCase()}`;
        const createdBy = text(req.user?.email || "Shop owner", 150);

        transaction = new sql.Transaction(db);
        await transaction.begin();
        const run = () => new sql.Request(transaction).input("ShopID", shopID);

        // Take the stock first; the StockQuantity check stops two sales taking the last unit.
        for (const [productID, needed] of neededByProduct) {
            const taken = await run().input("ProductID", productID).input("Quantity", needed).query(`
                UPDATE dbo.Products SET StockQuantity = StockQuantity - @Quantity, UpdatedAt = GETDATE()
                WHERE ProductID = @ProductID AND ShopID = @ShopID AND StockQuantity >= @Quantity
            `);
            if (!taken.rowsAffected[0]) throw new SaleError(`${products.get(productID).ProductName} just sold out. Check the stock and try again.`);
        }

        // A phone number links the sale to a customer (found or created), like website orders.
        let customerID = null;
        if (sale.phone) {
            const found = await run().input("Phone", sale.phone).query(`
                SELECT TOP 1 CustomerID, FullName FROM dbo.Customers WITH (UPDLOCK, HOLDLOCK)
                WHERE ShopID = @ShopID AND Phone = @Phone
            `);
            if (found.recordset.length) {
                customerID = found.recordset[0].CustomerID;
                if (sale.customerName && !found.recordset[0].FullName) {
                    await run().input("CustomerID", customerID).input("FullName", sale.customerName)
                        .query("UPDATE dbo.Customers SET FullName = @FullName, UpdatedAt = GETDATE() WHERE CustomerID = @CustomerID AND ShopID = @ShopID");
                }
            } else {
                const created = await run().input("Phone", sale.phone).input("FullName", sale.customerName || "Customer").query(`
                    INSERT INTO dbo.Customers (ShopID, FullName, Phone, IsActive, CreatedAt, UpdatedAt)
                    OUTPUT inserted.CustomerID
                    VALUES (@ShopID, @FullName, @Phone, 1, GETDATE(), GETDATE())
                `);
                customerID = created.recordset[0].CustomerID;
            }
        }

        const order = await run()
            .input("CustomerID", customerID)
            .input("OrderNumber", orderNumber)
            .input("OrderStatus", sale.status)
            .input("PaymentStatus", sale.paymentStatus)
            .input("PaymentMethod", sale.paymentMethod)
            .input("SubTotal", sql.Decimal(18, 2), subtotal)
            .input("Discount", sql.Decimal(18, 2), sale.discount)
            .input("GrandTotal", sql.Decimal(18, 2), grandTotal)
            .input("Name", sale.customerName || (sale.source === "Counter" ? "Walk-in customer" : "Customer"))
            .input("Phone", sale.phone || null)
            .input("Address", sale.address || null)
            .input("City", sale.city || null)
            .input("Source", sale.source)
            .query(`
                INSERT INTO dbo.Orders
                    (ShopID, CustomerID, OrderNumber, OrderStatus, PaymentStatus, PaymentMethod,
                     SubTotal, DiscountAmount, ShippingAmount, TaxAmount, GrandTotal,
                     ShippingName, ShippingPhone, ShippingAddress, ShippingCity, ShippingState,
                     CreatedAt, UpdatedAt, ConfirmedAt, StockDeducted, OrderSource)
                OUTPUT inserted.OrderID
                VALUES
                    (@ShopID, @CustomerID, @OrderNumber, @OrderStatus, @PaymentStatus, @PaymentMethod,
                     @SubTotal, @Discount, 0, 0, @GrandTotal,
                     @Name, @Phone, @Address, @City, N'India',
                     GETDATE(), GETDATE(), CASE WHEN @OrderStatus = N'Pending' THEN NULL ELSE GETDATE() END, 1, @Source)
            `);
        const orderID = order.recordset[0].OrderID;

        for (const line of orderLines) {
            await run()
                .input("OrderID", orderID)
                .input("ProductID", line.productID)
                .input("ProductName", line.name)
                .input("SKU", line.sku || null)
                .input("Size", line.size || null)
                .input("Quantity", line.quantity)
                .input("UnitPrice", sql.Decimal(18, 2), line.unitPrice)
                .query(`
                    INSERT INTO dbo.OrderItems (OrderID, ProductID, ProductName, SKU, Size, Quantity, UnitPrice)
                    VALUES (@OrderID, @ProductID, @ProductName, @SKU, @Size, @Quantity, @UnitPrice)
                `);
        }

        // History shows who added the sale, from where, and the owner's note.
        const history = [
            `Sale added in Shop Admin (${sale.source}, ${sale.paymentMethod}, ${sale.paymentStatus === "Paid" ? "paid" : "not paid yet"}).`,
            sale.note
        ].filter(Boolean).join(" ");
        await run().input("OrderID", orderID).input("Note", history).input("CreatedBy", createdBy).query(`
            INSERT INTO dbo.OrderHistory (OrderID, ShopID, EntryType, Note, CreatedBy)
            VALUES (@OrderID, @ShopID, N'Note', @Note, @CreatedBy)
        `);

        await transaction.commit();
        transaction = null;

        return res.status(201).json({
            success: true,
            message: "Sale saved.",
            data: { orderID, orderNumber, subtotal, discount: sale.discount, total: grandTotal, source: sale.source, paymentStatus: sale.paymentStatus }
        });
    } catch (error) {
        if (transaction) await transaction.rollback().catch(() => {});
        return fail(res, error, "save");
    }
};
