USE [db_ac42f8_saitix];
GO

/* Adds an explicit storefront type. Existing shops remain Ecommerce. */
IF COL_LENGTH(N'dbo.Shops', N'ShopType') IS NULL
BEGIN
    ALTER TABLE dbo.Shops
    ADD ShopType NVARCHAR(20) NOT NULL
        CONSTRAINT DF_Shops_ShopType DEFAULT N'Ecommerce' WITH VALUES;
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = N'CK_Shops_ShopType'
      AND parent_object_id = OBJECT_ID(N'dbo.Shops')
)
BEGIN
    ALTER TABLE dbo.Shops
    ADD CONSTRAINT CK_Shops_ShopType
        CHECK (ShopType IN (N'Ecommerce', N'Service'));
END
GO
