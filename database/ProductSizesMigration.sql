USE [db_ac42f8_saitix];
GO

IF COL_LENGTH(N'dbo.Products', N'SizeOptions') IS NULL
BEGIN
    ALTER TABLE dbo.Products
        ADD SizeOptions NVARCHAR(MAX) NULL;
END;
GO

IF COL_LENGTH(N'dbo.OrderItems', N'Size') IS NULL
BEGIN
    ALTER TABLE dbo.OrderItems
        ADD Size NVARCHAR(50) NULL;
END;
GO
