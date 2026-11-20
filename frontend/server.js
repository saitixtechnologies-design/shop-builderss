import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readStorefrontEnv, renderEnvScript } from "./scripts/storefront-env.js";

// Local server for the public storefront. Real files (app.js, *.css …) are served as they are;
// every other address is a storefront page (/shop/<slug>/…, or /product/… on a shop's
// subdomain or own domain), so it gets index.html and app.js works out which shop to show.

const root = path.dirname(fileURLToPath(import.meta.url));
const indexFile = path.join(root, "index.html");
// Settings come from frontend/.env or the host's environment; env.js is built from them.
const envScript = renderEnvScript(readStorefrontEnv());
const port = Number(process.env.FRONTEND_PORT || process.env.PORT || 5174);
// Files that are part of the project but never part of the website.
const PRIVATE_FILES = new Set(["server.js", "package.json", "package-lock.json", "vercel.json"]);
const contentTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".webp": "image/webp",
    ".ico": "image/x-icon"
};

const send = (response, status, body, type) => {
    response.writeHead(status, { "Content-Type": type, "Cache-Control": "no-cache" });
    response.end(body);
};

http.createServer(async (request, response) => {
    let pathname;
    try {
        pathname = decodeURIComponent(new URL(request.url, "http://storefront.local").pathname);
    } catch {
        return send(response, 400, "Bad request", "text/plain; charset=utf-8");
    }

    if (pathname === "/env.js") return send(response, 200, envScript, contentTypes[".js"]);

    const extension = path.extname(pathname);
    // Page addresses have no file extension: always the storefront page.
    if (!extension) return send(response, 200, await readFile(indexFile), contentTypes[".html"]);

    const target = path.resolve(root, pathname.replace(/^\/+/, ""));
    const isPrivate = PRIVATE_FILES.has(path.basename(target)) || target.startsWith(path.join(root, "scripts") + path.sep);
    if (!target.startsWith(`${root}${path.sep}`) || isPrivate) {
        return send(response, 403, "Forbidden", "text/plain; charset=utf-8");
    }
    try {
        send(response, 200, await readFile(target), contentTypes[extension] || "application/octet-stream");
    } catch {
        send(response, 404, "Not found", "text/plain; charset=utf-8");
    }
}).listen(port, "0.0.0.0", () => {
    console.log(`Public storefront running at http://localhost:${port}/shop/<shop-slug>`);
    console.log(`Free subdomain address (local): http://<shop-slug>.localhost:${port}/`);
});
