/* Add per-shop storefront colors without changing or removing existing data. */
USE db_ac42f8_saitix;
GO

IF OBJECT_ID(N'dbo.ShopSettings', N'U') IS NULL
BEGIN
    THROW 51000, N'dbo.ShopSettings must exist before applying storefront branding.', 1;
END;
GO

IF COL_LENGTH(N'dbo.ShopSettings', N'PrimaryColor') IS NULL
BEGIN
    ALTER TABLE dbo.ShopSettings ADD PrimaryColor NVARCHAR(7) NULL;
END;
GO

IF COL_LENGTH(N'dbo.ShopSettings', N'SecondaryColor') IS NULL
BEGIN
    ALTER TABLE dbo.ShopSettings ADD SecondaryColor NVARCHAR(7) NULL;
END;
GO

/* Verify columns and current per-shop values. */
SELECT ShopID, PrimaryColor, SecondaryColor
FROM dbo.ShopSettings
ORDER BY ShopID;
GO
