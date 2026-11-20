// Storefront settings from the environment (frontend/.env locally, or the hosting panel).
//   SHOP_API_URL     the API's address, e.g. https://api.yourdomain.com   (empty = same address)
//   PLATFORM_DOMAIN  your main domain, e.g. yourdomain.com                (empty = no free subdomains)
// The browser cannot read environment variables, so these are written into env.js, a tiny
// script the page loads before app.js (see config.js).
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Reads frontend/.env (KEY=value lines) without overriding variables already set by the host. */
function loadDotEnv() {
    const file = path.join(frontendDir, ".env");
    if (!existsSync(file)) return;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
        if (!match || line.trim().startsWith("#")) continue;
        const [, key, raw] = match;
        if (process.env[key] === undefined) process.env[key] = raw.replace(/^(['"])(.*)\1$/, "$2");
    }
}

export function readStorefrontEnv() {
    loadDotEnv();
    const apiUrl = String(process.env.SHOP_API_URL || "").trim().replace(/\/+$/, "");
    const platformDomain = String(process.env.PLATFORM_DOMAIN || "").trim().toLowerCase()
        .replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (apiUrl && !/^https?:\/\/[^\s/]+$/i.test(apiUrl)) {
        throw new Error(`SHOP_API_URL must look like https://api.yourdomain.com (got "${apiUrl}")`);
    }
    return { apiUrl, platformDomain };
}

/** The contents of env.js. */
export function renderEnvScript(env = readStorefrontEnv()) {
    return `// Generated from the storefront's environment settings. Do not edit by hand.\nwindow.SHOP_ENV = ${JSON.stringify({ API_URL: env.apiUrl, PLATFORM_DOMAIN: env.platformDomain })};\n`;
}
