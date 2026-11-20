USE db_ac42f8_saitix;
GO

/* Products may be saved without a category (only name and selling price are required).
   Makes dbo.Products.CategoryID nullable. The link to dbo.Categories and the index stay;
   they are dropped and re-created only because SQL Server cannot change the column while
   they exist. Safe to run more than once. */
IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = N'dbo' AND TABLE_NAME = N'Products' AND COLUMN_NAME = N'CategoryID' AND IS_NULLABLE = N'NO'
)
BEGIN
    BEGIN TRANSACTION;

    IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Products_Categories' AND parent_object_id = OBJECT_ID(N'dbo.Products'))
        ALTER TABLE dbo.Products DROP CONSTRAINT FK_Products_Categories;

    IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Products_CategoryID' AND object_id = OBJECT_ID(N'dbo.Products'))
        DROP INDEX IX_Products_CategoryID ON dbo.Products;

    ALTER TABLE dbo.Products ALTER COLUMN CategoryID INT NULL;

    CREATE INDEX IX_Products_CategoryID ON dbo.Products(CategoryID);

    ALTER TABLE dbo.Products WITH CHECK
        ADD CONSTRAINT FK_Products_Categories FOREIGN KEY (CategoryID) REFERENCES dbo.Categories(CategoryID);

    COMMIT TRANSACTION;
END
GO
