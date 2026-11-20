import { getDB } from "../config/db.js";
import {
    checkDomainDns,
    connectDomainToHosting,
    disconnectDomainFromHosting,
    domainConfig,
    newVerificationToken,
    normalizeDomain,
    requiredRecords
} from "../services/domainService.js";

// Shop web addresses (see docs/DOMAINS.md).
// Shop admin:  GET/PUT/DELETE /api/shop-settings/me/domain, POST /api/shop-settings/me/domain/verify
// Public:      GET /api/public/shops/by-domain/:host  -> which shop a visitor's address belongs to

const MIGRATION_MESSAGE = "Custom domains need a database update: run database/ShopDomainsMigration.sql, then try again.";
const RESERVED_SUBDOMAINS = new Set(["www", "api", "admin", "app", "mail"]);

const shopIdFrom = (req) => Number(req.user?.shopID ?? req.user?.ShopID);

async function hasDomainColumns(db) {
    const result = await db.request().query("SELECT CASE WHEN COL_LENGTH(N'dbo.Shops', N'CustomDomain') IS NULL THEN 0 ELSE 1 END AS Ready");
    return Boolean(result.recordset[0]?.Ready);
}

const freeAddress = (slug) => {
    const { platformDomain } = domainConfig();
    return platformDomain && slug ? `https://${String(slug).toLowerCase()}.${platformDomain}` : null;
};

function describe(shop, extra = {}) {
    const domain = shop.CustomDomain || null;
    return {
        slug: shop.ShopSlug,
        freeAddress: freeAddress(shop.ShopSlug),
        customDomain: domain,
        status: domain ? shop.DomainStatus || "Pending" : "None",
        verifiedAt: shop.DomainVerifiedAt || null,
        records: domain ? requiredRecords(domain, shop.DomainVerifyToken) : [],
        ...extra
    };
}

async function loadShop(db, shopID, withDomain) {
    const columns = withDomain ? ", CustomDomain, DomainStatus, DomainVerifyToken, DomainVerifiedAt" : "";
    const result = await db.request().input("ShopID", shopID)
        .query(`SELECT ShopID, ShopSlug${columns} FROM dbo.Shops WHERE ShopID = @ShopID`);
    return result.recordset[0] || null;
}

const fail = (res, error, action) => {
    console.error(`Shop domain ${action} error:`, error.message);
    const unavailable = error.message === "Database is not connected";
    return res.status(unavailable ? 503 : 500).json({
        success: false,
        message: unavailable ? "The database is not reachable right now. Please try again shortly." : "Something went wrong. Please try again."
    });
};

// ------------------------------------------------------------ shop admin

export const getMyDomain = async (req, res) => {
    try {
        const db = getDB();
        const ready = await hasDomainColumns(db);
        const shop = await loadShop(db, shopIdFrom(req), ready);
        if (!shop) return res.status(404).json({ success: false, message: "Shop not found." });
        return res.json({ success: true, data: describe(shop, { migrationNeeded: !ready }) });
    } catch (error) {
        return fail(res, error, "read");
    }
};

export const saveMyDomain = async (req, res) => {
    try {
        const { domain, error } = normalizeDomain(req.body?.domain);
        if (error) return res.status(400).json({ success: false, message: error });

        const db = getDB();
        if (!(await hasDomainColumns(db))) return res.status(409).json({ success: false, message: MIGRATION_MESSAGE });

        const shopID = shopIdFrom(req);
        const current = await loadShop(db, shopID, true);
        if (!current) return res.status(404).json({ success: false, message: "Shop not found." });
        if (current.CustomDomain === domain) return res.json({ success: true, data: describe(current) });

        const taken = await db.request().input("Domain", domain).input("ShopID", shopID)
            .query("SELECT TOP 1 ShopID FROM dbo.Shops WHERE CustomDomain = @Domain AND ShopID <> @ShopID");
        if (taken.recordset.length) {
            return res.status(409).json({ success: false, message: "This domain is already connected to another shop." });
        }

        const token = newVerificationToken();
        const saved = await db.request()
            .input("ShopID", shopID)
            .input("Domain", domain)
            .input("Token", token)
            .query(`
                UPDATE dbo.Shops
                SET CustomDomain = @Domain, DomainStatus = N'Pending', DomainVerifyToken = @Token,
                    DomainVerifiedAt = NULL, UpdatedAt = SYSUTCDATETIME()
                OUTPUT inserted.ShopSlug, inserted.CustomDomain, inserted.DomainStatus, inserted.DomainVerifyToken, inserted.DomainVerifiedAt
                WHERE ShopID = @ShopID
            `);

        if (current.CustomDomain) await disconnectDomainFromHosting(current.CustomDomain);
        const hosting = await connectDomainToHosting(domain);
        return res.json({ success: true, message: "Domain saved. Add the DNS records below, then press Check now.", data: describe(saved.recordset[0], { hosting }) });
    } catch (error) {
        if (/UX_Shops_CustomDomain|duplicate key/i.test(error.message)) {
            return res.status(409).json({ success: false, message: "This domain is already connected to another shop." });
        }
        return fail(res, error, "save");
    }
};

export const verifyMyDomain = async (req, res) => {
    try {
        const db = getDB();
        if (!(await hasDomainColumns(db))) return res.status(409).json({ success: false, message: MIGRATION_MESSAGE });
        const shopID = shopIdFrom(req);
        const shop = await loadShop(db, shopID, true);
        if (!shop?.CustomDomain) return res.status(400).json({ success: false, message: "Add a domain first." });

        const dnsResult = await checkDomainDns(shop.CustomDomain, shop.DomainVerifyToken);
        let current = shop;
        if (dnsResult.ownershipVerified && shop.DomainStatus !== "Active") {
            const updated = await db.request().input("ShopID", shopID).query(`
                UPDATE dbo.Shops SET DomainStatus = N'Active', DomainVerifiedAt = SYSUTCDATETIME(), UpdatedAt = SYSUTCDATETIME()
                OUTPUT inserted.ShopSlug, inserted.CustomDomain, inserted.DomainStatus, inserted.DomainVerifyToken, inserted.DomainVerifiedAt
                WHERE ShopID = @ShopID
            `);
            current = updated.recordset[0];
        }

        const message = !dnsResult.ownershipVerified
            ? "The TXT record was not found yet. DNS changes can take from a few minutes up to 24 hours."
            : !dnsResult.pointsToUs
                ? "Ownership confirmed. Your domain does not point to the shop website yet: check the A / CNAME record."
                : "Connected. Your shop opens on this domain.";
        return res.json({ success: true, message, data: describe(current, { dns: dnsResult }) });
    } catch (error) {
        return fail(res, error, "verify");
    }
};

export const removeMyDomain = async (req, res) => {
    try {
        const db = getDB();
        if (!(await hasDomainColumns(db))) return res.status(409).json({ success: false, message: MIGRATION_MESSAGE });
        const shopID = shopIdFrom(req);
        const shop = await loadShop(db, shopID, true);
        if (!shop) return res.status(404).json({ success: false, message: "Shop not found." });

        const cleared = await db.request().input("ShopID", shopID).query(`
            UPDATE dbo.Shops
            SET CustomDomain = NULL, DomainStatus = N'None', DomainVerifyToken = NULL, DomainVerifiedAt = NULL, UpdatedAt = SYSUTCDATETIME()
            OUTPUT inserted.ShopSlug, inserted.CustomDomain, inserted.DomainStatus, inserted.DomainVerifyToken, inserted.DomainVerifiedAt
            WHERE ShopID = @ShopID
        `);
        await disconnectDomainFromHosting(shop.CustomDomain);
        return res.json({ success: true, message: "Domain removed.", data: describe(cleared.recordset[0]) });
    } catch (error) {
        return fail(res, error, "remove");
    }
};

// ------------------------------------------------------------ public

/** Which shop does this web address belong to? Only verified domains of active shops count. */
export const resolveShopByDomain = async (req, res) => {
    try {
        const host = String(req.params.host || "").trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
        if (!host || host.length > 253) return res.status(400).json({ success: false, message: "Unknown address." });

        const { platformDomain } = domainConfig();
        if (platformDomain && host.endsWith(`.${platformDomain}`)) {
            const sub = host.slice(0, -(platformDomain.length + 1));
            if (sub && !sub.includes(".") && !RESERVED_SUBDOMAINS.has(sub)) {
                res.set("Cache-Control", "public, max-age=300");
                return res.json({ success: true, data: { slug: sub } });
            }
        }

        const db = getDB();
        if (!(await hasDomainColumns(db))) return res.status(404).json({ success: false, message: "This address is not connected to a shop." });

        // Visitors may type the domain with or without "www.".
        const alternate = host.startsWith("www.") ? host.slice(4) : `www.${host}`;
        const result = await db.request().input("Host", host).input("Alternate", alternate).query(`
            SELECT TOP 1 ShopSlug
            FROM dbo.Shops
            WHERE CustomDomain IN (@Host, @Alternate) AND DomainStatus = N'Active' AND Status = N'Active'
            ORDER BY CASE WHEN CustomDomain = @Host THEN 0 ELSE 1 END
        `);
        const shop = result.recordset[0];
        if (!shop) return res.status(404).json({ success: false, message: "This address is not connected to a shop." });

        res.set("Cache-Control", "public, max-age=300");
        return res.json({ success: true, data: { slug: shop.ShopSlug } });
    } catch (error) {
        return fail(res, error, "lookup");
    }
};
