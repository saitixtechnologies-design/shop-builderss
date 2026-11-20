import { getDB } from "../config/db.js";

const templateOptionsByType = { Ecommerce: ["editorial", "minimal", "boutique", "bold"], Service: ["studio", "serene", "modern"] };
const defaultTemplateByType = { Ecommerce: "editorial", Service: "studio" };

// =====================================================
// HELPERS
// =====================================================

// Convert optional values safely.
// Prevents "null" / "undefined" from being saved as strings.
const cleanValue = (value) => {
    if (
        value === null ||
        value === undefined ||
        String(value).trim().toLowerCase() === "null" ||
        String(value).trim().toLowerCase() === "undefined"
    ) {
        return null;
    }

    const cleaned = String(value).trim();

    return cleaned === "" ? null : cleaned;
};


// =====================================================
// SHOP ACCESS CHECK
// =====================================================

const checkShopAccess = (req, shopId) => {

    if (!req.user) {
        return {
            allowed: false,
            status: 401,
            message: "Authentication required."
        };
    }

    const role = req.user.role;

    // -------------------------------------------------
    // SUPER ADMIN
    // -------------------------------------------------

    if (
        role === "SuperAdmin" ||
        role === "Super Admin"
    ) {
        return {
            allowed: true
        };
    }

    // -------------------------------------------------
    // SHOP ADMIN
    // -------------------------------------------------

    if (
        role === "ShopAdmin" ||
        role === "Shop Admin"
    ) {

        const userShopId = Number(req.user.shopID);

        if (!userShopId) {
            return {
                allowed: false,
                status: 403,
                message:
                    "Shop ID not found in authentication token."
            };
        }

        if (userShopId !== shopId) {
            return {
                allowed: false,
                status: 403,
                message:
                    "You are not authorized to access this shop."
            };
        }

        return {
            allowed: true
        };
    }

    // -------------------------------------------------
    // OTHER ROLES
    // -------------------------------------------------

    return {
        allowed: false,
        status: 403,
        message:
            "You are not authorized to access shop settings."
    };
};


// =====================================================
// GET SHOP SETTINGS
// GET /api/shop-settings/:shopId
// =====================================================

export const getShopSettings = async (req, res) => {

    try {

        const shopId = Number(req.params.shopId);

        if (!shopId || shopId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Valid Shop ID is required."
            });
        }


        // =================================================
        // TENANT ACCESS CHECK
        // =================================================

        const access = checkShopAccess(req, shopId);

        if (!access.allowed) {
            return res.status(access.status).json({
                success: false,
                message: access.message
            });
        }


        const db = getDB();


        // =================================================
        // GET SHOP
        // =================================================

        const shopResult = await db
            .request()
            .input("ShopID", shopId)
            .query(`
                SELECT
                    ShopID,
                    ShopName,
                    ShopSlug,
                    OwnerName,
                    Email,
                    Phone,
                    LogoURL,
                    ShopType,
                    WebsiteTemplate,
                    Status,
                    CreatedAt,
                    UpdatedAt
                FROM dbo.Shops
                WHERE ShopID = @ShopID
            `);


        if (!shopResult.recordset.length) {
            return res.status(404).json({
                success: false,
                message: "Shop not found."
            });
        }


        // =================================================
        // GET SHOP SETTINGS
        // =================================================

        const settingsResult = await db
            .request()
            .input("ShopID", shopId)
            .query(`
                SELECT
                    ShopSettingsID,
                    ShopID,
                    ShopLogo,
                    Tagline,
                    Phone,
                    WhatsAppNumber,
                    Email,
                    Address,
                    City,
                    State,
                    Pincode,

                    MapURL,
                    Latitude,
                    Longitude,
                    ShowMap,

                    AboutUs,
                    OpeningTime,
                    ClosingTime,
                    FacebookURL,
                    InstagramURL,
                    YouTubeURL,
                    WebsiteStatus,
                    CreatedAt,
                    UpdatedAt
                FROM dbo.ShopSettings
                WHERE ShopID = @ShopID
            `);


        // =================================================
        // BRANDING COLUMNS CHECK
        // =================================================

        const brandingColumns = await db
            .request()
            .query(`
                SELECT
                    CASE
                        WHEN COL_LENGTH(
                            N'dbo.ShopSettings',
                            N'PrimaryColor'
                        ) IS NULL
                        THEN 0
                        ELSE 1
                    END AS HasPrimaryColor,

                    CASE
                        WHEN COL_LENGTH(
                            N'dbo.ShopSettings',
                            N'SecondaryColor'
                        ) IS NULL
                        THEN 0
                        ELSE 1
                    END AS HasSecondaryColor
            `);


        if (
            brandingColumns.recordset[0]?.HasPrimaryColor &&
            brandingColumns.recordset[0]?.HasSecondaryColor &&
            settingsResult.recordset[0]
        ) {

            const colors = await db
                .request()
                .input("ShopID", shopId)
                .query(`
                    SELECT TOP 1
                        PrimaryColor,
                        SecondaryColor
                    FROM dbo.ShopSettings
                    WHERE ShopID = @ShopID
                `);

            Object.assign(
                settingsResult.recordset[0],
                colors.recordset[0] || {}
            );
        }


        return res.status(200).json({
            success: true,
            message: "Shop settings fetched successfully.",
            data: {
                shop: shopResult.recordset[0],
                settings:
                    settingsResult.recordset[0] || null
            }
        });

    } catch (error) {

        console.error(
            "Get Shop Settings Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to fetch shop settings.",
            error: error.message
        });
    }
};


// =====================================================
// CREATE / UPDATE SHOP SETTINGS
// PUT /api/shop-settings/:shopId
// =====================================================

export const updateShopSettings = async (req, res) => {

    try {

        const shopId = Number(req.params.shopId);

        if (!shopId || shopId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Valid Shop ID is required."
            });
        }


        // =================================================
        // TENANT ACCESS CHECK
        // =================================================

        const access = checkShopAccess(req, shopId);

        if (!access.allowed) {
            return res.status(access.status).json({
                success: false,
                message: access.message
            });
        }


        // =================================================
        // REQUEST BODY
        // =================================================

        const {
            shopName,
            shopSlug,
            ownerName,
            email,
            phone,
            logoURL,

            shopLogo,
            tagline,
            whatsappNumber,
            settingsEmail,
            settingsPhone,

            address,
            city,
            state,
            pincode,

            // MAP / LOCATION
            mapURL,
            latitude,
            longitude,
            showMap,

            aboutUs,
            openingTime,
            closingTime,

            facebookURL,
            instagramURL,
            youtubeURL,
            websiteStatus,

            primaryColor,
            secondaryColor,
            websiteTemplate
        } = req.body;


        // =================================================
        // BRAND COLOR VALIDATION
        // =================================================

        const validBrandColor = (value) =>
            typeof value === "string" &&
            /^#[0-9a-fA-F]{6}$/.test(value);


        if (
            primaryColor !== undefined &&
            !validBrandColor(primaryColor)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Primary color must be a six-digit hex color."
            });
        }


        if (
            secondaryColor !== undefined &&
            !validBrandColor(secondaryColor)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Secondary color must be a six-digit hex color."
            });
        }


        // =================================================
        // MAP / LOCATION VALIDATION
        // =================================================

        const parsedLatitude =
            latitude !== undefined &&
            latitude !== null &&
            String(latitude).trim() !== ""
                ? Number(latitude)
                : null;


        const parsedLongitude =
            longitude !== undefined &&
            longitude !== null &&
            String(longitude).trim() !== ""
                ? Number(longitude)
                : null;


        if (
            parsedLatitude !== null &&
            (
                !Number.isFinite(parsedLatitude) ||
                parsedLatitude < -90 ||
                parsedLatitude > 90
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Latitude must be between -90 and 90."
            });
        }


        if (
            parsedLongitude !== null &&
            (
                !Number.isFinite(parsedLongitude) ||
                parsedLongitude < -180 ||
                parsedLongitude > 180
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Longitude must be between -180 and 180."
            });
        }


        let parsedShowMap = null;

        if (showMap !== undefined) {

            if (
                showMap === true ||
                showMap === 1 ||
                showMap === "1" ||
                String(showMap).toLowerCase() === "true"
            ) {
                parsedShowMap = true;
            } else {
                parsedShowMap = false;
            }
        }


        const db = getDB();


        // =================================================
        // CHECK SHOP
        // =================================================

        const shopCheck = await db
            .request()
            .input("ShopID", shopId)
            .query(`
                SELECT
                    ShopID,
                    ShopName,
                    ShopSlug,
                    OwnerName,
                    Email,
                    Phone,
                    LogoURL,
                    ShopType,
                    WebsiteTemplate,
                    Status
                FROM dbo.Shops
                WHERE ShopID = @ShopID
            `);


        if (!shopCheck.recordset.length) {
            return res.status(404).json({
                success: false,
                message: "Shop not found."
            });
        }


        const currentShop = shopCheck.recordset[0];
        const selectedTemplate = String(websiteTemplate || currentShop.WebsiteTemplate || defaultTemplateByType[currentShop.ShopType]).trim().toLowerCase();
        if (!templateOptionsByType[currentShop.ShopType]?.includes(selectedTemplate)) {
            return res.status(400).json({ success: false, message: "Choose a template designed for this shop type." });
        }


        // =================================================
        // BRANDING COLUMNS CHECK
        // =================================================

        const brandingColumnsResult = await db
            .request()
            .query(`
                SELECT
                    CASE
                        WHEN COL_LENGTH(
                            N'dbo.ShopSettings',
                            N'PrimaryColor'
                        ) IS NULL
                        THEN 0
                        ELSE 1
                    END AS HasPrimaryColor,

                    CASE
                        WHEN COL_LENGTH(
                            N'dbo.ShopSettings',
                            N'SecondaryColor'
                        ) IS NULL
                        THEN 0
                        ELSE 1
                    END AS HasSecondaryColor
            `);


        const hasBrandingColors =
            Boolean(
                brandingColumnsResult.recordset[0]
                    ?.HasPrimaryColor &&
                brandingColumnsResult.recordset[0]
                    ?.HasSecondaryColor
            );


        const requestsNonDefaultBranding =
            (
                primaryColor !== undefined &&
                primaryColor !== "#193b35"
            ) ||
            (
                secondaryColor !== undefined &&
                secondaryColor !== "#d49b60"
            );


        if (
            !hasBrandingColors &&
            requestsNonDefaultBranding
        ) {
            return res.status(503).json({
                success: false,
                message:
                    "Shop branding colors are not enabled in the database yet. Apply database/PublicShopBrandingMigration.sql, then retry."
            });
        }


        // =================================================
        // SHOP BASIC DATA
        // =================================================

        const finalShopName =
            shopName !== undefined
                ? cleanValue(shopName)
                : currentShop.ShopName;


        const finalShopSlug =
            shopSlug !== undefined
                ? cleanValue(shopSlug)
                : currentShop.ShopSlug;


        const finalOwnerName =
            ownerName !== undefined
                ? cleanValue(ownerName)
                : currentShop.OwnerName;


        const finalEmail =
            email !== undefined
                ? cleanValue(email)
                : currentShop.Email;


        const finalPhone =
            phone !== undefined
                ? cleanValue(phone)
                : currentShop.Phone;


        const finalLogoURL =
            logoURL !== undefined
                ? cleanValue(logoURL)
                : currentShop.LogoURL;


        if (!finalShopName) {
            return res.status(400).json({
                success: false,
                message: "Shop name is required."
            });
        }


        if (!finalShopSlug) {
            return res.status(400).json({
                success: false,
                message: "Shop slug is required."
            });
        }


        // =================================================
        // CHECK DUPLICATE SLUG
        // =================================================

        const slugCheck = await db
            .request()
            .input("ShopID", shopId)
            .input("ShopSlug", finalShopSlug)
            .query(`
                SELECT ShopID
                FROM dbo.Shops
                WHERE ShopSlug = @ShopSlug
                AND ShopID <> @ShopID
            `);


        if (slugCheck.recordset.length) {
            return res.status(409).json({
                success: false,
                message: "Shop slug already exists."
            });
        }


        // =================================================
        // UPDATE SHOPS TABLE
        // =================================================

        await db
            .request()
            .input("ShopID", shopId)
            .input("ShopName", finalShopName)
            .input("ShopSlug", finalShopSlug)
            .input("OwnerName", finalOwnerName)
            .input("Email", finalEmail)
            .input("Phone", finalPhone)
            .input("LogoURL", finalLogoURL)
            .input("WebsiteTemplate", selectedTemplate)
            .query(`
                UPDATE dbo.Shops
                SET
                    ShopName = @ShopName,
                    ShopSlug = @ShopSlug,
                    OwnerName = @OwnerName,
                    Email = @Email,
                    Phone = @Phone,
                    LogoURL = @LogoURL,
                    WebsiteTemplate = @WebsiteTemplate,
                    UpdatedAt = SYSUTCDATETIME()
                WHERE ShopID = @ShopID
            `);


        // =================================================
        // CHECK EXISTING SETTINGS
        // =================================================

        const existingSettings = await db
            .request()
            .input("ShopID", shopId)
            .query(`
                SELECT *
                FROM dbo.ShopSettings
                WHERE ShopID = @ShopID
            `);


        // =================================================
        // UPDATE EXISTING SETTINGS
        // =================================================

        if (existingSettings.recordset.length) {

            const current =
                existingSettings.recordset[0];


            const finalShopLogo =
                shopLogo !== undefined
                    ? cleanValue(shopLogo)
                    : current.ShopLogo;


            const finalTagline =
                tagline !== undefined
                    ? cleanValue(tagline)
                    : current.Tagline;


            const finalPhoneSettings =
                settingsPhone !== undefined
                    ? cleanValue(settingsPhone)
                    : current.Phone;


            const finalWhatsApp =
                whatsappNumber !== undefined
                    ? cleanValue(whatsappNumber)
                    : current.WhatsAppNumber;


            const finalSettingsEmail =
                settingsEmail !== undefined
                    ? cleanValue(settingsEmail)
                    : current.Email;


            const finalAddress =
                address !== undefined
                    ? cleanValue(address)
                    : current.Address;


            const finalCity =
                city !== undefined
                    ? cleanValue(city)
                    : current.City;


            const finalState =
                state !== undefined
                    ? cleanValue(state)
                    : current.State;


            const finalPincode =
                pincode !== undefined
                    ? cleanValue(pincode)
                    : current.Pincode;


            // =================================================
            // MAP / LOCATION VALUES
            // =================================================

            const finalMapURL =
                mapURL !== undefined
                    ? cleanValue(mapURL)
                    : current.MapURL;


            const finalLatitude =
                latitude !== undefined
                    ? parsedLatitude
                    : current.Latitude;


            const finalLongitude =
                longitude !== undefined
                    ? parsedLongitude
                    : current.Longitude;


            const finalShowMap =
                showMap !== undefined
                    ? parsedShowMap
                    : current.ShowMap;


            const finalAboutUs =
                aboutUs !== undefined
                    ? cleanValue(aboutUs)
                    : current.AboutUs;


            const finalOpeningTime =
                openingTime !== undefined
                    ? cleanValue(openingTime)
                    : current.OpeningTime;


            const finalClosingTime =
                closingTime !== undefined
                    ? cleanValue(closingTime)
                    : current.ClosingTime;


            const finalFacebook =
                facebookURL !== undefined
                    ? cleanValue(facebookURL)
                    : current.FacebookURL;


            const finalInstagram =
                instagramURL !== undefined
                    ? cleanValue(instagramURL)
                    : current.InstagramURL;


            const finalYouTube =
                youtubeURL !== undefined
                    ? cleanValue(youtubeURL)
                    : current.YouTubeURL;


            const finalWebsiteStatus =
                websiteStatus !== undefined
                    ? cleanValue(websiteStatus) || "Active"
                    : current.WebsiteStatus;


            const finalPrimaryColor =
                primaryColor !== undefined
                    ? primaryColor
                    : current.PrimaryColor;


            const finalSecondaryColor =
                secondaryColor !== undefined
                    ? secondaryColor
                    : current.SecondaryColor;


            // =================================================
            // UPDATE SETTINGS
            // =================================================

            const settingsUpdate = db
                .request()
                .input("ShopID", shopId)
                .input("ShopLogo", finalShopLogo)
                .input("Tagline", finalTagline)
                .input("Phone", finalPhoneSettings)
                .input("WhatsAppNumber", finalWhatsApp)
                .input("Email", finalSettingsEmail)
                .input("Address", finalAddress)
                .input("City", finalCity)
                .input("State", finalState)
                .input("Pincode", finalPincode)

                // MAP
                .input("MapURL", finalMapURL)
                .input("Latitude", finalLatitude)
                .input("Longitude", finalLongitude)
                .input("ShowMap", finalShowMap)

                .input("AboutUs", finalAboutUs)
                .input("OpeningTime", finalOpeningTime)
                .input("ClosingTime", finalClosingTime)
                .input("FacebookURL", finalFacebook)
                .input("InstagramURL", finalInstagram)
                .input("YouTubeURL", finalYouTube)
                .input("WebsiteStatus", finalWebsiteStatus);


            let brandingAssignments = "";


            if (hasBrandingColors) {

                settingsUpdate
                    .input(
                        "PrimaryColor",
                        finalPrimaryColor
                    )
                    .input(
                        "SecondaryColor",
                        finalSecondaryColor
                    );

                brandingAssignments =
                    ", PrimaryColor = @PrimaryColor, SecondaryColor = @SecondaryColor";
            }


            await settingsUpdate.query(`
                UPDATE dbo.ShopSettings
                SET
                    ShopLogo = @ShopLogo,
                    Tagline = @Tagline,
                    Phone = @Phone,
                    WhatsAppNumber = @WhatsAppNumber,
                    Email = @Email,
                    Address = @Address,
                    City = @City,
                    State = @State,
                    Pincode = @Pincode,

                    MapURL = @MapURL,
                    Latitude = @Latitude,
                    Longitude = @Longitude,
                    ShowMap = @ShowMap,

                    AboutUs = @AboutUs,
                    OpeningTime = @OpeningTime,
                    ClosingTime = @ClosingTime,
                    FacebookURL = @FacebookURL,
                    InstagramURL = @InstagramURL,
                    YouTubeURL = @YouTubeURL,
                    WebsiteStatus = @WebsiteStatus${brandingAssignments},

                    UpdatedAt = GETDATE()

                WHERE ShopID = @ShopID
            `);

        }


        // =================================================
        // CREATE SETTINGS
        // =================================================

        else {

            const settingsInsert = db
                .request()
                .input("ShopID", shopId)
                .input("ShopLogo", cleanValue(shopLogo))
                .input("Tagline", cleanValue(tagline))
                .input("Phone", cleanValue(settingsPhone))
                .input(
                    "WhatsAppNumber",
                    cleanValue(whatsappNumber)
                )
                .input("Email", cleanValue(settingsEmail))
                .input("Address", cleanValue(address))
                .input("City", cleanValue(city))
                .input("State", cleanValue(state))
                .input("Pincode", cleanValue(pincode))

                // MAP
                .input(
                    "MapURL",
                    cleanValue(mapURL)
                )
                .input(
                    "Latitude",
                    parsedLatitude
                )
                .input(
                    "Longitude",
                    parsedLongitude
                )
                .input(
                    "ShowMap",
                    showMap === undefined
                        ? true
                        : parsedShowMap
                )

                .input("AboutUs", cleanValue(aboutUs))
                .input(
                    "OpeningTime",
                    cleanValue(openingTime)
                )
                .input(
                    "ClosingTime",
                    cleanValue(closingTime)
                )
                .input(
                    "FacebookURL",
                    cleanValue(facebookURL)
                )
                .input(
                    "InstagramURL",
                    cleanValue(instagramURL)
                )
                .input(
                    "YouTubeURL",
                    cleanValue(youtubeURL)
                )
                .input(
                    "WebsiteStatus",
                    cleanValue(websiteStatus) || "Active"
                );


            let brandingInsertColumns = "";
            let brandingInsertValues = "";


            if (hasBrandingColors) {

                settingsInsert
                    .input(
                        "PrimaryColor",
                        primaryColor || "#193b35"
                    )
                    .input(
                        "SecondaryColor",
                        secondaryColor || "#d49b60"
                    );

                brandingInsertColumns =
                    ", PrimaryColor, SecondaryColor";

                brandingInsertValues =
                    ", @PrimaryColor, @SecondaryColor";
            }


            await settingsInsert.query(`
                INSERT INTO dbo.ShopSettings
                (
                    ShopID,
                    ShopLogo,
                    Tagline,
                    Phone,
                    WhatsAppNumber,
                    Email,
                    Address,
                    City,
                    State,
                    Pincode,

                    MapURL,
                    Latitude,
                    Longitude,
                    ShowMap,

                    AboutUs,
                    OpeningTime,
                    ClosingTime,
                    FacebookURL,
                    InstagramURL,
                    YouTubeURL,
                    WebsiteStatus${brandingInsertColumns}
                )
                VALUES
                (
                    @ShopID,
                    @ShopLogo,
                    @Tagline,
                    @Phone,
                    @WhatsAppNumber,
                    @Email,
                    @Address,
                    @City,
                    @State,
                    @Pincode,

                    @MapURL,
                    @Latitude,
                    @Longitude,
                    @ShowMap,

                    @AboutUs,
                    @OpeningTime,
                    @ClosingTime,
                    @FacebookURL,
                    @InstagramURL,
                    @YouTubeURL,
                    @WebsiteStatus${brandingInsertValues}
                )
            `);
        }


        // =================================================
        // GET UPDATED SHOP
        // =================================================

        const updatedShop = await db
            .request()
            .input("ShopID", shopId)
            .query(`
                SELECT
                    ShopID,
                    ShopName,
                    ShopSlug,
                    OwnerName,
                    Email,
                    Phone,
                    LogoURL,
                    ShopType,
                    WebsiteTemplate,
                    Status,
                    CreatedAt,
                    UpdatedAt
                FROM dbo.Shops
                WHERE ShopID = @ShopID
            `);


        // =================================================
        // GET UPDATED SETTINGS
        // =================================================

        const updatedSettings = await db
            .request()
            .input("ShopID", shopId)
            .query(`
                SELECT
                    ShopSettingsID,
                    ShopID,
                    ShopLogo,
                    Tagline,
                    Phone,
                    WhatsAppNumber,
                    Email,
                    Address,
                    City,
                    State,
                    Pincode,

                    MapURL,
                    Latitude,
                    Longitude,
                    ShowMap,

                    AboutUs,
                    OpeningTime,
                    ClosingTime,
                    FacebookURL,
                    InstagramURL,
                    YouTubeURL,
                    WebsiteStatus,
                    CreatedAt,
                    UpdatedAt
                FROM dbo.ShopSettings
                WHERE ShopID = @ShopID
            `);


        // =================================================
        // GET UPDATED BRANDING COLORS
        // =================================================

        if (
            hasBrandingColors &&
            updatedSettings.recordset[0]
        ) {

            const colors = await db
                .request()
                .input("ShopID", shopId)
                .query(`
                    SELECT TOP 1
                        PrimaryColor,
                        SecondaryColor
                    FROM dbo.ShopSettings
                    WHERE ShopID = @ShopID
                `);


            Object.assign(
                updatedSettings.recordset[0],
                colors.recordset[0] || {}
            );
        }


        return res.status(200).json({
            success: true,
            message:
                "Shop settings updated successfully.",

            data: {
                shop:
                    updatedShop.recordset[0],

                settings:
                    updatedSettings.recordset[0] || null
            }
        });

    } catch (error) {

        console.error(
            "Update Shop Settings Error:",
            error
        );


        if (
            error.message &&
            error.message
                .toLowerCase()
                .includes("unique")
        ) {

            return res.status(409).json({
                success: false,
                message: "Duplicate value found.",
                error: error.message
            });
        }


        const needsWebsiteTemplateMigration = /invalid column name[^\n]*WebsiteTemplate/i.test(String(error.message || ""));
        return res.status(500).json({
            success: false,
            message: needsWebsiteTemplateMigration
                ? "Run database/WebsiteTemplatesMigration.sql in SQL Server, then restart the API and save settings again."
                : "Failed to update shop settings.",
            error: error.message
        });
    }
};


// =====================================================
// GET MY SHOP SETTINGS
// GET /api/shop-settings/me
// SHOP ADMIN
// =====================================================

export const getMyShopSettings = async (req, res) => {

    try {

        // IMPORTANT:
        // ShopID comes ONLY from JWT.
        // Never trust frontend ShopID.

        const shopID =
            req.user?.shopID ??
            req.user?.ShopID ??
            req.user?.shopId ??
            req.user?.ShopId ??
            null;


        if (!shopID) {
            return res.status(403).json({
                success: false,
                message:
                    "Shop ID not found in authentication token."
            });
        }


        // =================================================
        // Existing controller reuse
        // =================================================

        req.params.shopId = shopID;

        return await getShopSettings(req, res);

    } catch (error) {

        console.error(
            "Get My Shop Settings Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to fetch your shop settings.",
            error: error.message
        });
    }
};


// =====================================================
// UPDATE MY SHOP SETTINGS
// PUT /api/shop-settings/me
// SHOP ADMIN
// =====================================================

export const updateMyShopSettings = async (req, res) => {

    try {

        // IMPORTANT:
        // ShopID comes ONLY from JWT.
        // Never trust frontend ShopID.

        const shopID =
            req.user?.shopID ??
            req.user?.ShopID ??
            req.user?.shopId ??
            req.user?.ShopId ??
            null;


        if (!shopID) {
            return res.status(403).json({
                success: false,
                message:
                    "Shop ID not found in authentication token."
            });
        }


        // =================================================
        // Existing controller reuse
        // =================================================

        req.params.shopId = shopID;

        return await updateShopSettings(req, res);

    } catch (error) {

        console.error(
            "Update My Shop Settings Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to update your shop settings.",
            error: error.message
        });
    }
};