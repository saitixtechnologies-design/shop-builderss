import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const uploadRoot = fileURLToPath(new URL("../../uploads/", import.meta.url));
const MIME_EXTENSIONS = new Map([
    ["image/jpeg", ".jpg"],
    ["image/png", ".png"],
    ["image/webp", ".webp"],
    ["image/gif", ".gif"]
]);

export const uploadImage = async (req, res) => {
    const { image, mimeType, shopID } = req.body || {};
    const extension = MIME_EXTENSIONS.get(mimeType);
    if (!extension || typeof image !== "string") {
        return res.status(400).json({ success: false, message: "Choose a PNG, JPG, WEBP or GIF image." });
    }

    const match = image.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/);
    if (!match || match[1] !== mimeType) {
        return res.status(400).json({ success: false, message: "Invalid image data." });
    }
    const buffer = Buffer.from(match[2], "base64");
    if (!buffer.length || buffer.length > 8 * 1024 * 1024) {
        return res.status(413).json({ success: false, message: "Images must be smaller than 8 MB." });
    }

    const role = String(req.user?.role || "").toLowerCase().replace(/[ _-]/g, "");
    const isShopAdmin = role === "shopadmin";
    if (!isShopAdmin && role !== "superadmin") {
        return res.status(403).json({ success: false, message: "Admin access is required to upload images." });
    }
    const ownerShopID = Number(req.user?.shopID ?? req.user?.ShopID);
    if (isShopAdmin && (!ownerShopID || (shopID && Number(shopID) !== ownerShopID))) {
        return res.status(403).json({ success: false, message: "You can upload images only for your shop." });
    }
    const tenantFolder = isShopAdmin ? `shop-${ownerShopID}` : (shopID ? `shop-${Number(shopID)}` : "platform");
    if (!isShopAdmin && shopID && !Number.isInteger(Number(shopID))) {
        return res.status(400).json({ success: false, message: "Invalid shop." });
    }

    const filename = `${randomUUID()}${extension}`;
    const folder = path.join(uploadRoot, tenantFolder);
    await mkdir(folder, { recursive: true });
    await writeFile(path.join(folder, filename), buffer, { flag: "wx" });
    const url = `/uploads/${tenantFolder}/${filename}`;
    return res.status(201).json({ success: true, data: { url } });
};
