import { getDB } from "../config/db.js";

const shopIDFrom = (req) => { const id = Number(req.user?.shopID ?? req.user?.ShopID ?? req.user?.shopId ?? req.user?.ShopId); return Number.isInteger(id) && id > 0 ? id : null; };
const clean = (value) => value === undefined || value === null || String(value).trim() === "" ? null : String(value).trim();
const columns = `PortfolioID, ShopID, Title, Category, Description, ImageURL, ImageURLs, VideoURL, ClientName, Location, ProjectDate, DisplayOrder, Status, CreatedAt, UpdatedAt`;
const normalizeImages = (imageURLs, imageURL) => {
    const values = Array.isArray(imageURLs) ? imageURLs : imageURL ? [imageURL] : [];
    return [...new Set(values.filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim()))].slice(0, 10);
};

export const getShopPortfolio = async (req, res) => {
    try { const shopID = shopIDFrom(req); if (!shopID) return res.status(403).json({ success: false, message: "Shop ID not found in authentication token." });
        const result = await getDB().request().input("ShopID", shopID).query(`SELECT ${columns} FROM dbo.ShopPortfolio WHERE ShopID = @ShopID ORDER BY DisplayOrder, PortfolioID DESC`);
        return res.json({ success: true, data: result.recordset });
    } catch (error) { console.error("Get shop portfolio error:", error); return res.status(500).json({ success: false, message: "Failed to fetch portfolio.", error: error.message }); }
};

export const createShopPortfolio = async (req, res) => {
    try { const shopID = shopIDFrom(req); if (!shopID) return res.status(403).json({ success: false, message: "Shop ID not found in authentication token." });
        const { title, category, description, imageURL, imageURLs, videoURL, clientName, location, projectDate, displayOrder, status } = req.body;
        if (!clean(title)) return res.status(400).json({ success: false, message: "Project title is required." });
        const images = normalizeImages(imageURLs, imageURL);
        const result = await getDB().request().input("ShopID", shopID).input("Title", clean(title)).input("Category", clean(category)).input("Description", clean(description)).input("ImageURL", images[0] || null).input("ImageURLs", JSON.stringify(images)).input("VideoURL", clean(videoURL)).input("ClientName", clean(clientName)).input("Location", clean(location)).input("ProjectDate", clean(projectDate)).input("DisplayOrder", Math.max(0, Number(displayOrder) || 0)).input("Status", status === "Inactive" ? "Inactive" : "Active").query(`INSERT INTO dbo.ShopPortfolio (ShopID, Title, Category, Description, ImageURL, ImageURLs, VideoURL, ClientName, Location, ProjectDate, DisplayOrder, Status) OUTPUT INSERTED.* VALUES (@ShopID, @Title, @Category, @Description, @ImageURL, @ImageURLs, @VideoURL, @ClientName, @Location, TRY_CONVERT(date, @ProjectDate), @DisplayOrder, @Status)`);
        return res.status(201).json({ success: true, data: result.recordset[0] });
    } catch (error) { console.error("Create shop portfolio error:", error); return res.status(500).json({ success: false, message: "Failed to create portfolio project.", error: error.message }); }
};

export const updateShopPortfolio = async (req, res) => {
    try { const shopID = shopIDFrom(req); const id = Number(req.params.id); if (!shopID) return res.status(403).json({ success: false, message: "Shop ID not found in authentication token." }); if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: "Invalid portfolio ID." });
        const { title, category, description, imageURL, imageURLs, videoURL, clientName, location, projectDate, displayOrder, status } = req.body; if (!clean(title)) return res.status(400).json({ success: false, message: "Project title is required." });
        const images = normalizeImages(imageURLs, imageURL);
        const result = await getDB().request().input("PortfolioID", id).input("ShopID", shopID).input("Title", clean(title)).input("Category", clean(category)).input("Description", clean(description)).input("ImageURL", images[0] || null).input("ImageURLs", JSON.stringify(images)).input("VideoURL", clean(videoURL)).input("ClientName", clean(clientName)).input("Location", clean(location)).input("ProjectDate", clean(projectDate)).input("DisplayOrder", Math.max(0, Number(displayOrder) || 0)).input("Status", status === "Inactive" ? "Inactive" : "Active").query(`UPDATE dbo.ShopPortfolio SET Title=@Title, Category=@Category, Description=@Description, ImageURL=@ImageURL, ImageURLs=@ImageURLs, VideoURL=@VideoURL, ClientName=@ClientName, Location=@Location, ProjectDate=TRY_CONVERT(date,@ProjectDate), DisplayOrder=@DisplayOrder, Status=@Status, UpdatedAt=SYSUTCDATETIME() OUTPUT INSERTED.* WHERE PortfolioID=@PortfolioID AND ShopID=@ShopID`);
        if (!result.recordset.length) return res.status(404).json({ success: false, message: "Portfolio project not found." }); return res.json({ success: true, data: result.recordset[0] });
    } catch (error) { console.error("Update shop portfolio error:", error); return res.status(500).json({ success: false, message: "Failed to update portfolio project.", error: error.message }); }
};

export const deleteShopPortfolio = async (req, res) => {
    try { const shopID = shopIDFrom(req); const id = Number(req.params.id); if (!shopID) return res.status(403).json({ success: false, message: "Shop ID not found in authentication token." }); if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: "Invalid portfolio ID." });
        const result = await getDB().request().input("PortfolioID", id).input("ShopID", shopID).query("DELETE FROM dbo.ShopPortfolio OUTPUT DELETED.PortfolioID WHERE PortfolioID=@PortfolioID AND ShopID=@ShopID"); if (!result.recordset.length) return res.status(404).json({ success: false, message: "Portfolio project not found." }); return res.json({ success: true, message: "Portfolio project deleted." });
    } catch (error) { console.error("Delete shop portfolio error:", error); return res.status(500).json({ success: false, message: "Failed to delete portfolio project.", error: error.message }); }
};

export const toggleShopPortfolioStatus = async (req, res) => {
    try { const shopID = shopIDFrom(req); const id = Number(req.params.id); if (!shopID) return res.status(403).json({ success: false, message: "Shop ID not found in authentication token." }); if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: "Invalid portfolio ID." });
        const result = await getDB().request().input("PortfolioID", id).input("ShopID", shopID).query("UPDATE dbo.ShopPortfolio SET Status=CASE WHEN Status=N'Active' THEN N'Inactive' ELSE N'Active' END, UpdatedAt=SYSUTCDATETIME() OUTPUT INSERTED.* WHERE PortfolioID=@PortfolioID AND ShopID=@ShopID"); if (!result.recordset.length) return res.status(404).json({ success: false, message: "Portfolio project not found." }); return res.json({ success: true, data: result.recordset[0] });
    } catch (error) { console.error("Toggle shop portfolio status error:", error); return res.status(500).json({ success: false, message: "Failed to update portfolio status.", error: error.message }); }
};
