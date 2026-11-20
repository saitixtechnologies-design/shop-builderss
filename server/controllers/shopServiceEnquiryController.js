import { getDB } from "../config/db.js";

const clean = (value) => String(value ?? "").trim();
const shopIDFrom = (req) => {
    const id = Number(req.user?.shopID ?? req.user?.ShopID ?? req.user?.shopId ?? req.user?.ShopId);
    return Number.isInteger(id) && id > 0 ? id : null;
};
const allowedStatuses = new Set(["New", "Contacted", "Follow-up", "Converted", "Closed"]);
const missingEnquiryTable = (error) => error?.number === 208 || /invalid object name.*ShopServiceEnquiries/i.test(String(error?.message || ""));

export const createPublicShopServiceEnquiry = async (req, res) => {
    try {
        const slug = clean(req.params.slug).toLowerCase();
        const customerName = clean(req.body?.name).slice(0, 160);
        const phone = clean(req.body?.phone).slice(0, 30);
        const email = clean(req.body?.email).slice(0, 254) || null;
        const requirement = clean(req.body?.requirement).slice(0, 4000);
        const serviceID = Number(req.body?.serviceID);

        if (!slug || !customerName || !phone || !requirement || !Number.isInteger(serviceID) || serviceID <= 0) {
            return res.status(400).json({ success: false, message: "Name, phone, service and requirement are required." });
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ success: false, message: "Enter a valid email address." });
        }

        const db = getDB();
        const shopResult = await db.request().input("ShopSlug", slug).query(`
            SELECT ShopID
            FROM dbo.Shops
            WHERE LOWER(ShopSlug) = @ShopSlug
              AND Status = N'Active'
              AND ShopType = N'Service'
        `);
        if (!shopResult.recordset.length) {
            return res.status(404).json({ success: false, message: "This service shop is unavailable." });
        }
        const shopID = Number(shopResult.recordset[0].ShopID);

        const serviceResult = await db.request()
            .input("ShopID", shopID)
            .input("ServiceID", serviceID)
            .query(`
                SELECT ServiceName
                FROM dbo.Services
                WHERE ShopID = @ShopID AND ServiceID = @ServiceID AND Status = N'Active'
            `);
        if (!serviceResult.recordset.length) {
            return res.status(400).json({ success: false, message: "Please choose an available service." });
        }
        const serviceName = serviceResult.recordset[0].ServiceName;

        const saved = await db.request()
            .input("ShopID", shopID)
            .input("ServiceID", serviceID)
            .input("ServiceName", serviceName)
            .input("CustomerName", customerName)
            .input("Phone", phone)
            .input("Email", email)
            .input("Requirement", requirement)
            .query(`
                INSERT INTO dbo.ShopServiceEnquiries
                    (ShopID, ServiceID, ServiceName, CustomerName, Phone, Email, Requirement, Status)
                OUTPUT INSERTED.EnquiryID, INSERTED.ServiceID, INSERTED.ServiceName,
                       INSERTED.CustomerName, INSERTED.Phone, INSERTED.Email,
                       INSERTED.Requirement, INSERTED.Status, INSERTED.CreatedAt
                VALUES
                    (@ShopID, @ServiceID, @ServiceName, @CustomerName, @Phone, @Email, @Requirement, N'New')
            `);

        return res.status(201).json({ success: true, message: "Your enquiry has been sent to the shop.", data: saved.recordset[0] });
    } catch (error) {
        console.error("Create public shop service enquiry error:", error);
        if (missingEnquiryTable(error)) {
            return res.status(503).json({ success: false, message: "Service enquiry database table is missing. Run the updated Database.sql or ShopServiceEnquiriesMigration.sql, then restart the server." });
        }
        return res.status(500).json({ success: false, message: "Your enquiry could not be saved. Please try again." });
    }
};

export const getShopServiceEnquiries = async (req, res) => {
    try {
        const shopID = shopIDFrom(req);
        if (!shopID) return res.status(403).json({ success: false, message: "Shop ID not found in authentication token." });

        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const pageSize = Math.min(50, Math.max(5, Number.parseInt(req.query.pageSize, 10) || 10));
        const offset = (page - 1) * pageSize;
        const status = clean(req.query.status);
        const serviceID = Number.parseInt(req.query.serviceID, 10);
        const search = clean(req.query.search).slice(0, 120);
        const where = ["ShopID = @ShopID"];
        const db = getDB();
        const request = db.request().input("ShopID", shopID).input("Offset", offset).input("PageSize", pageSize);
        const countRequest = db.request().input("ShopID", shopID);
        if (allowedStatuses.has(status)) {
            where.push("Status = @Status");
            request.input("Status", status);
            countRequest.input("Status", status);
        }
        if (Number.isInteger(serviceID) && serviceID > 0) {
            where.push("ServiceID = @ServiceID");
            request.input("ServiceID", serviceID);
            countRequest.input("ServiceID", serviceID);
        }
        if (search) {
            where.push("(CustomerName LIKE @Search OR Phone LIKE @Search OR Email LIKE @Search OR ServiceName LIKE @Search OR Requirement LIKE @Search)");
            request.input("Search", `%${search}%`);
            countRequest.input("Search", `%${search}%`);
        }
        const whereSql = where.join(" AND ");
        const [statsResult, countResult, listResult] = await Promise.all([
            db.request().input("ShopID", shopID).query(`
                SELECT COUNT(*) AS Total,
                       SUM(CASE WHEN Status = N'New' THEN 1 ELSE 0 END) AS New,
                       SUM(CASE WHEN Status = N'Contacted' THEN 1 ELSE 0 END) AS Contacted,
                       SUM(CASE WHEN Status = N'Follow-up' THEN 1 ELSE 0 END) AS FollowUp,
                       SUM(CASE WHEN Status = N'Converted' THEN 1 ELSE 0 END) AS Converted,
                       SUM(CASE WHEN Status = N'Closed' THEN 1 ELSE 0 END) AS Closed,
                       SUM(CASE WHEN CAST(CreatedAt AS date) = CAST(GETDATE() AS date) THEN 1 ELSE 0 END) AS Today
                FROM dbo.ShopServiceEnquiries
                WHERE ShopID = @ShopID
            `),
            countRequest.query(`SELECT COUNT(*) AS Total FROM dbo.ShopServiceEnquiries WHERE ${whereSql}`),
            request.query(`
                SELECT EnquiryID, ServiceID, ServiceName, CustomerName, Phone, Email,
                       Requirement, Status, ShopNotes, CreatedAt, UpdatedAt
                FROM dbo.ShopServiceEnquiries
                WHERE ${whereSql}
                ORDER BY CreatedAt DESC, EnquiryID DESC
                OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY
            `)
        ]);
        const stats = statsResult.recordset[0] || {};
        const total = Number(countResult.recordset[0]?.Total || 0);
        return res.json({
            success: true,
            data: {
                stats: Object.fromEntries(Object.entries(stats).map(([key, value]) => [key, Number(value || 0)])),
                enquiries: listResult.recordset,
                page,
                pageSize,
                total,
                totalPages: Math.max(1, Math.ceil(total / pageSize))
            }
        });
    } catch (error) {
        console.error("Get shop service enquiries error:", error);
        if (missingEnquiryTable(error)) {
            return res.status(503).json({ success: false, message: "Service enquiry database table is missing. Run the updated Database.sql or ShopServiceEnquiriesMigration.sql, then restart the server." });
        }
        return res.status(500).json({ success: false, message: "Could not load service enquiries." });
    }
};

export const updateShopServiceEnquiry = async (req, res) => {
    try {
        const shopID = shopIDFrom(req);
        const enquiryID = Number(req.params.id);
        const status = clean(req.body?.status);
        const shopNotes = clean(req.body?.shopNotes).slice(0, 2000) || null;
        if (!shopID) return res.status(403).json({ success: false, message: "Shop ID not found in authentication token." });
        if (!Number.isInteger(enquiryID) || enquiryID <= 0) return res.status(400).json({ success: false, message: "Valid enquiry ID is required." });
        if (!allowedStatuses.has(status)) return res.status(400).json({ success: false, message: "Choose a valid enquiry status." });

        const result = await getDB().request()
            .input("ShopID", shopID)
            .input("EnquiryID", enquiryID)
            .input("Status", status)
            .input("ShopNotes", shopNotes)
            .query(`
                UPDATE dbo.ShopServiceEnquiries
                SET Status = @Status, ShopNotes = @ShopNotes, UpdatedAt = SYSUTCDATETIME()
                OUTPUT INSERTED.EnquiryID, INSERTED.ServiceID, INSERTED.ServiceName,
                       INSERTED.CustomerName, INSERTED.Phone, INSERTED.Email,
                       INSERTED.Requirement, INSERTED.Status, INSERTED.ShopNotes,
                       INSERTED.CreatedAt, INSERTED.UpdatedAt
                WHERE EnquiryID = @EnquiryID AND ShopID = @ShopID
            `);
        if (!result.recordset.length) return res.status(404).json({ success: false, message: "Enquiry not found." });
        return res.json({ success: true, data: result.recordset[0] });
    } catch (error) {
        console.error("Update shop service enquiry error:", error);
        if (missingEnquiryTable(error)) {
            return res.status(503).json({ success: false, message: "Service enquiry database table is missing. Run the updated Database.sql or ShopServiceEnquiriesMigration.sql, then restart the server." });
        }
        return res.status(500).json({ success: false, message: "Could not update this enquiry." });
    }
};
