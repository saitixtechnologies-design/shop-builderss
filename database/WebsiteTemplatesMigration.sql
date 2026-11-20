USE db_ac42f8_saitix;
GO

/* Add shop-specific storefront template selection. Safe to run more than once. */
IF COL_LENGTH(N'dbo.Shops', N'WebsiteTemplate') IS NULL
BEGIN
    ALTER TABLE dbo.Shops
    ADD WebsiteTemplate NVARCHAR(40) NOT NULL
        CONSTRAINT DF_Shops_WebsiteTemplate DEFAULT N'editorial' WITH VALUES;
END
GO

UPDATE dbo.Shops
SET WebsiteTemplate = CASE WHEN ShopType = N'Service' THEN N'studio' ELSE N'editorial' END
WHERE WebsiteTemplate IS NULL OR LTRIM(RTRIM(WebsiteTemplate)) = N''
   OR (ShopType = N'Service' AND WebsiteTemplate NOT IN (N'studio', N'serene', N'modern'))
   OR (ShopType = N'Ecommerce' AND WebsiteTemplate NOT IN (N'editorial', N'minimal', N'boutique'));
GO
