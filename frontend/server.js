import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.FRONTEND_PORT || 5174);
const contentTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".webp": "image/webp"
};

http.createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
    const requestedFile = pathname === "/" || pathname.startsWith("/shop/")
        ? "index.html"
        : pathname.replace(/^\/+/, "");
    const target = path.resolve(root, requestedFile);

    if (!target.startsWith(`${root}${path.sep}`) && target !== path.join(root, "index.html")) {
        response.writeHead(403).end("Forbidden");
        return;
    }

    try {
        const body = await readFile(target);
        response.writeHead(200, {
            "Content-Type": contentTypes[path.extname(target)] || "application/octet-stream",
            "Cache-Control": "no-cache"
        });
        response.end(body);
    } catch {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Not found");
    }
}).listen(port, "0.0.0.0", () => {
    console.log(`Public storefront running at http://localhost:${port}/shop/<shop-slug>`);
});
