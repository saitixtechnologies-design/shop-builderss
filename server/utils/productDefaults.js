// Optional product fields. Only a product's name and selling price are required; a missing web
// address (slug) is made from the name and a missing SKU is generated. Used by the Shop Admin
// and super admin product controllers so both follow the same rules.

export const slugify = (text) => String(text || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // accents (é → e)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);

/** A slug not used by any other product of this shop ("blue-kurti", "blue-kurti-2", …). */
export async function uniqueProductSlug(db, shopID, wanted, exceptProductID = null) {
    const base = slugify(wanted) || `product-${Date.now().toString(36)}`;
    const taken = await db.request()
        .input("ShopID", Number(shopID))
        .input("Pattern", `${base}%`)
        .input("ProductID", exceptProductID ? Number(exceptProductID) : 0)
        .query("SELECT Slug FROM dbo.Products WHERE ShopID = @ShopID AND Slug LIKE @Pattern AND ProductID <> @ProductID");
    const used = new Set(taken.recordset.map((row) => String(row.Slug).toLowerCase()));
    if (!used.has(base)) return base;
    for (let number = 2; ; number += 1) {
        if (!used.has(`${base}-${number}`)) return `${base}-${number}`;
    }
}

/** A short SKU not used by any other product of this shop, e.g. "SKU-7K3P9Q". */
export async function generateSku(db, shopID) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
        const sku = `SKU-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        const exists = await db.request().input("ShopID", Number(shopID)).input("SKU", sku)
            .query("SELECT TOP 1 1 AS Found FROM dbo.Products WHERE ShopID = @ShopID AND SKU = @SKU");
        if (!exists.recordset.length) return sku;
    }
    return `SKU-${Date.now().toString(36).toUpperCase()}`;
}

/**
 * Returns { slug, sku } with the blanks filled in. On edit (productID given) an empty SKU keeps
 * the product's current SKU.
 */
export async function productIdentity(db, shopID, { name, slug, sku }, productID = null) {
    const finalSlug = await uniqueProductSlug(db, shopID, String(slug || "").trim() || String(name || "").trim(), productID);
    let finalSku = String(sku || "").trim();
    if (!finalSku && productID) {
        const current = await db.request().input("ProductID", Number(productID)).input("ShopID", Number(shopID))
            .query("SELECT SKU FROM dbo.Products WHERE ProductID = @ProductID AND ShopID = @ShopID");
        finalSku = current.recordset[0]?.SKU || "";
    }
    if (!finalSku) finalSku = await generateSku(db, shopID);
    return { slug: finalSlug, sku: finalSku };
}

export const isValidPrice = (value) => value !== undefined && value !== null && String(value).trim() !== "" &&
    Number.isFinite(Number(value)) && Number(value) >= 0;
