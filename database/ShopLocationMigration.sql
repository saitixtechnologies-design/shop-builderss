USE [db_ac42f8_saitix];
GO

/* =========================================================
   SHOP LOCATION / MAP MIGRATION
   Multi-Tenant Shop Builder SaaS
   ========================================================= */


/* 1. Google Maps URL */

IF COL_LENGTH('dbo.ShopSettings', 'MapURL') IS NULL
BEGIN
    ALTER TABLE dbo.ShopSettings
    ADD MapURL NVARCHAR(1000) NULL;

    PRINT 'MapURL added successfully.';
END
ELSE
BEGIN
    PRINT 'MapURL already exists.';
END
GO


/* 2. Latitude */

IF COL_LENGTH('dbo.ShopSettings', 'Latitude') IS NULL
BEGIN
    ALTER TABLE dbo.ShopSettings
    ADD Latitude DECIMAL(10, 7) NULL;

    PRINT 'Latitude added successfully.';
END
ELSE
BEGIN
    PRINT 'Latitude already exists.';
END
GO


/* 3. Longitude */

IF COL_LENGTH('dbo.ShopSettings', 'Longitude') IS NULL
BEGIN
    ALTER TABLE dbo.ShopSettings
    ADD Longitude DECIMAL(10, 7) NULL;

    PRINT 'Longitude added successfully.';
END
ELSE
BEGIN
    PRINT 'Longitude already exists.';
END
GO


/* 4. Show / Hide Map */

IF COL_LENGTH('dbo.ShopSettings', 'ShowMap') IS NULL
BEGIN
    ALTER TABLE dbo.ShopSettings
    ADD ShowMap BIT NOT NULL
        CONSTRAINT DF_ShopSettings_ShowMap DEFAULT 1;

    PRINT 'ShowMap added successfully.';
END
ELSE
BEGIN
    PRINT 'ShowMap already exists.';
END
GO


/* =========================================================
   VERIFY
   ========================================================= */

SELECT
    ShopID,
    Address,
    City,
    State,
    Pincode,
    MapURL,
    Latitude,
    Longitude,
    ShowMap
FROM dbo.ShopSettings
ORDER BY ShopID;
GO