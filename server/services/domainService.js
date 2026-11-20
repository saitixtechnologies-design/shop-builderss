// Shop web addresses: the free subdomain (<slug>.<PLATFORM_DOMAIN>) and the shop's own domain.
// See DOMAINS.md for the full setup. All settings come from .env:
//   PLATFORM_DOMAIN       your main domain, e.g. "shopbuilder.in" (subdomains hang off it)
//   DOMAIN_CNAME_TARGET   where a shop's "www" record points        (default: Vercel)
//   DOMAIN_A_RECORD       where a shop's bare domain points          (default: Vercel)
//   VERCEL_TOKEN, VERCEL_PROJECT_ID, VERCEL_TEAM_ID (optional)
//                         when set, domains are added to / removed from the storefront's Vercel
//                         project automatically, so Vercel issues the https certificate.
import crypto from "node:crypto";
import { promises as dns } from "node:dns";

export const domainConfig = () => ({
    platformDomain: String(process.env.PLATFORM_DOMAIN || "").trim().toLowerCase().replace(/^\.+|\.+$/g, ""),
    cnameTarget: String(process.env.DOMAIN_CNAME_TARGET || "cname.vercel-dns.com").trim().toLowerCase(),
    aRecord: String(process.env.DOMAIN_A_RECORD || "76.76.21.21").trim()
});

/** Name of the TXT record that proves a shop owns its domain. */
export const verificationRecordName = (domain) => `_shopbuilder.${domain}`;

export const newVerificationToken = () => `shopbuilder-verify=${crypto.randomBytes(16).toString("hex")}`;

const HOSTNAME_RE = /^(?=.{4,253}$)(?:(?!-)[a-z0-9-]{1,63}(?<!-)\.)+[a-z]{2,63}$/;

/**
 * Cleans what an owner typed ("https://WWW.MyShop.com/") into "www.myshop.com".
 * Returns { domain } or { error } with a message the owner can act on.
 */
export function normalizeDomain(input) {
    let value = String(input || "").trim().toLowerCase();
    if (!value) return { error: "Enter your domain, for example www.myshop.com." };
    value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, "").split(/[/?#]/)[0].replace(/:\d+$/, "").replace(/\.$/, "");

    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value) || value === "localhost" || value.endsWith(".localhost")) {
        return { error: "Enter a domain name, not an IP address or localhost." };
    }
    if (!HOSTNAME_RE.test(value)) {
        return { error: "That doesn't look like a domain. Use something like www.myshop.com." };
    }
    const { platformDomain } = domainConfig();
    if (platformDomain && (value === platformDomain || value.endsWith(`.${platformDomain}`))) {
        return { error: `Addresses on ${platformDomain} are free shop addresses. Enter a domain you bought yourself.` };
    }
    if (value.endsWith(".vercel.app") || value.endsWith(".onrender.com")) {
        return { error: "Enter a domain you own, not a hosting address." };
    }
    return { domain: value };
}

/** The domain the owner bought: "myshop.com" for "www.myshop.com", "myshop.co.in" for "shop.myshop.co.in". */
export function rootDomain(domain) {
    const labels = domain.split(".");
    const twoPartSuffix = /\.(co|com|net|org|gov|ac|edu|gen|firm|ind)\.[a-z]{2}$/.test(domain);
    return labels.slice(twoPartSuffix ? -3 : -2).join(".");
}

/** A bare domain (myshop.com) needs an A record; anything else (www.myshop.com) a CNAME. */
export const isApexDomain = (domain) => domain === rootDomain(domain);

/** Record name as typed in the domain company's DNS panel ("@" = the bare domain). */
const recordName = (domain, prefix = "") => {
    const sub = isApexDomain(domain) ? "" : domain.slice(0, -(rootDomain(domain).length + 1));
    return [prefix, sub].filter(Boolean).join(".") || "@";
};

/** The DNS records the owner has to add, shown in Shop Admin. */
export function requiredRecords(domain, token) {
    const { cnameTarget, aRecord } = domainConfig();
    return [
        isApexDomain(domain)
            ? { type: "A", name: "@", value: aRecord, purpose: "Points your domain to your shop website" }
            : { type: "CNAME", name: recordName(domain), value: cnameTarget, purpose: "Points your domain to your shop website" },
        { type: "TXT", name: recordName(domain, "_shopbuilder"), value: token, purpose: "Proves the domain belongs to you" }
    ];
}

const withTimeout = (promise, ms = 8000) => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error("DNS timeout"), { code: "ETIMEOUT" })), ms))
]);

/**
 * Looks the domain up in public DNS.
 * ownershipVerified: the TXT record holds this shop's token.
 * pointsToUs: the A / CNAME record already points at the storefront host.
 */
export async function checkDomainDns(domain, token) {
    const { cnameTarget, aRecord } = domainConfig();
    const result = { ownershipVerified: false, pointsToUs: false, found: { txt: [], cname: [], a: [] } };

    try {
        const records = await withTimeout(dns.resolveTxt(verificationRecordName(domain)));
        result.found.txt = records.map((parts) => parts.join(""));
        result.ownershipVerified = Boolean(token) && result.found.txt.includes(token);
    } catch { /* no TXT record yet */ }

    try {
        result.found.cname = (await withTimeout(dns.resolveCname(domain))).map((name) => name.toLowerCase().replace(/\.$/, ""));
    } catch { /* not a CNAME */ }
    try {
        result.found.a = await withTimeout(dns.resolve4(domain));
    } catch { /* no A record */ }

    result.pointsToUs = result.found.cname.some((name) => name === cnameTarget || name.endsWith(".vercel-dns.com")) ||
        result.found.a.includes(aRecord);
    return result;
}

// ---------------------------------------------------------------- Vercel (optional)

const vercelEnabled = () => Boolean(process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID);

async function vercelRequest(method, path, body) {
    const team = process.env.VERCEL_TEAM_ID ? `?teamId=${encodeURIComponent(process.env.VERCEL_TEAM_ID)}` : "";
    const response = await fetch(`https://api.vercel.com${path}${team}`, {
        method,
        headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}`, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(10000)
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data };
}

/**
 * Adds the domain to the storefront's Vercel project so it serves the site with https.
 * Returns a short status; never throws (saving the domain must not fail because of Vercel).
 */
export async function connectDomainToHosting(domain) {
    if (!vercelEnabled()) return { automatic: false, message: "Ask the platform team to add this domain to the storefront hosting." };
    try {
        const project = encodeURIComponent(process.env.VERCEL_PROJECT_ID);
        const added = await vercelRequest("POST", `/v10/projects/${project}/domains`, { name: domain });
        if (added.ok || added.data?.error?.code === "domain_already_in_use_by_project" || added.status === 409) {
            return { automatic: true, message: "Added to hosting. The https certificate is issued once DNS is correct." };
        }
        console.error("Vercel add domain failed:", added.status, added.data?.error?.code);
        return { automatic: true, message: "Hosting could not add this domain yet. The platform team has been notified in the logs." };
    } catch (error) {
        console.error("Vercel add domain error:", error.message);
        return { automatic: true, message: "Hosting could not be reached. Try again in a few minutes." };
    }
}

export async function disconnectDomainFromHosting(domain) {
    if (!vercelEnabled() || !domain) return;
    try {
        const project = encodeURIComponent(process.env.VERCEL_PROJECT_ID);
        await vercelRequest("DELETE", `/v9/projects/${project}/domains/${encodeURIComponent(domain)}`);
    } catch (error) {
        console.error("Vercel remove domain error:", error.message);
    }
}
