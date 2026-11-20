/*
    Website Editor database foundation
    SQL Server migration for dbo.ShopWebsitePages.

    This migration only creates the new table and its indexes when needed.
    It does not insert, update, or delete application data.
*/

IF OBJECT_ID(N'dbo.Shops', N'U') IS NULL
BEGIN
    ;THROW 51000, N'Cannot create dbo.ShopWebsitePages because dbo.Shops does not exist.', 1;
END;
GO

IF OBJECT_ID(N'dbo.ShopWebsitePages', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ShopWebsitePages
    (
        PageID INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_ShopWebsitePages PRIMARY KEY,
        ShopID INT NOT NULL,
        PageName NVARCHAR(150) NOT NULL,
        Slug NVARCHAR(180) NOT NULL,
        PageTitle NVARCHAR(250) NULL,
        HtmlContent NVARCHAR(MAX) NULL,
        PageType NVARCHAR(20) NOT NULL
            CONSTRAINT DF_ShopWebsitePages_PageType DEFAULT N'custom',
        Status NVARCHAR(20) NOT NULL
            CONSTRAINT DF_ShopWebsitePages_Status DEFAULT N'Active',
        DisplayOrder INT NOT NULL
            CONSTRAINT DF_ShopWebsitePages_DisplayOrder DEFAULT (0),
        CreatedAt DATETIME2(0) NOT NULL
            CONSTRAINT DF_ShopWebsitePages_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(0) NOT NULL
            CONSTRAINT DF_ShopWebsitePages_UpdatedAt DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_ShopWebsitePages_Shops
            FOREIGN KEY (ShopID) REFERENCES dbo.Shops (ShopID),
        CONSTRAINT UQ_ShopWebsitePages_ShopID_Slug
            UNIQUE (ShopID, Slug),
        CONSTRAINT CK_ShopWebsitePages_PageType
            CHECK (PageType IN (N'about', N'services', N'gallery', N'contact', N'custom')),
        CONSTRAINT CK_ShopWebsitePages_Status
            CHECK (Status IN (N'Active', N'Inactive'))
    );
END;
GO

/* Supports a shop's active-page listing and display ordering. */
IF OBJECT_ID(N'dbo.ShopWebsitePages', N'U') IS NOT NULL
   AND NOT EXISTS
   (
       SELECT 1
       FROM sys.indexes
       WHERE object_id = OBJECT_ID(N'dbo.ShopWebsitePages')
         AND name = N'IX_ShopWebsitePages_ShopID_Status_DisplayOrder'
   )
BEGIN
    CREATE INDEX IX_ShopWebsitePages_ShopID_Status_DisplayOrder
        ON dbo.ShopWebsitePages (ShopID, Status, DisplayOrder);
END;
GO

/* Supports filtering a shop's pages by page type. */
IF OBJECT_ID(N'dbo.ShopWebsitePages', N'U') IS NOT NULL
   AND NOT EXISTS
   (
       SELECT 1
       FROM sys.indexes
       WHERE object_id = OBJECT_ID(N'dbo.ShopWebsitePages')
         AND name = N'IX_ShopWebsitePages_ShopID_PageType'
   )
BEGIN
    CREATE INDEX IX_ShopWebsitePages_ShopID_PageType
        ON dbo.ShopWebsitePages (ShopID, PageType);
END;
GO

/* Verification: expected columns, SQL types, nullability, and identity. */
SELECT
    c.column_id AS ColumnOrder,
    c.name AS ColumnName,
    t.name AS SqlType,
    CASE
        WHEN t.name IN (N'nvarchar', N'varchar', N'nchar', N'char')
            THEN CASE WHEN c.max_length = -1 THEN N'MAX'
                      ELSE CONVERT(NVARCHAR(10), c.max_length / CASE WHEN t.name IN (N'nvarchar', N'nchar') THEN 2 ELSE 1 END)
                 END
        ELSE NULL
    END AS CharacterLength,
    c.is_nullable AS IsNullable,
    c.is_identity AS IsIdentity
FROM sys.columns AS c
INNER JOIN sys.types AS t ON t.user_type_id = c.user_type_id
WHERE c.object_id = OBJECT_ID(N'dbo.ShopWebsitePages')
ORDER BY c.column_id;
GO

/* Verification: foreign key, check constraints, unique constraint, and indexes. */
SELECT
    i.name AS IndexName,
    i.is_unique AS IsUnique,
    i.is_primary_key AS IsPrimaryKey,
    i.type_desc AS IndexType,
    STRING_AGG(c.name, N', ') WITHIN GROUP (ORDER BY ic.key_ordinal) AS KeyColumns
FROM sys.indexes AS i
INNER JOIN sys.index_columns AS ic
    ON ic.object_id = i.object_id
   AND ic.index_id = i.index_id
   AND ic.key_ordinal > 0
INNER JOIN sys.columns AS c
    ON c.object_id = ic.object_id
   AND c.column_id = ic.column_id
WHERE i.object_id = OBJECT_ID(N'dbo.ShopWebsitePages')
GROUP BY i.name, i.is_unique, i.is_primary_key, i.type_desc
ORDER BY i.is_primary_key DESC, i.is_unique DESC, i.name;

SELECT
    fk.name AS ForeignKeyName,
    OBJECT_SCHEMA_NAME(fk.referenced_object_id) AS ReferencedSchema,
    OBJECT_NAME(fk.referenced_object_id) AS ReferencedTable
FROM sys.foreign_keys AS fk
WHERE fk.parent_object_id = OBJECT_ID(N'dbo.ShopWebsitePages');

SELECT name AS CheckConstraintName, definition
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID(N'dbo.ShopWebsitePages');
GO

/* Verification: this should return no rows if (ShopID, Slug) uniqueness holds. */
SELECT ShopID, Slug, COUNT_BIG(*) AS DuplicateCount
FROM dbo.ShopWebsitePages
GROUP BY ShopID, Slug
HAVING COUNT_BIG(*) > 1;
GO

/*
    MANUAL EXAMPLES ONLY — these statements are comments and are not run by
    this migration. Choose a real ShopID from dbo.Shops before running INSERT.
    DELETE is included only because it was requested; run it only for a test row.

    -- Sample INSERT (uses an existing shop and creates an inactive test page):
    DECLARE @SampleShopID INT = (SELECT TOP (1) ShopID FROM dbo.Shops ORDER BY ShopID);
    INSERT INTO dbo.ShopWebsitePages
        (ShopID, PageName, Slug, PageTitle, HtmlContent, PageType, Status, DisplayOrder)
    VALUES
        (@SampleShopID, N'About Us Test', N'about-test', N'About Us',
         N'<h1>About Us</h1><p>Sample content.</p>', N'about', N'Inactive', 0);

    -- Sample SELECT:
    SELECT PageID, ShopID, PageName, Slug, PageTitle, HtmlContent,
           PageType, Status, DisplayOrder, CreatedAt, UpdatedAt
    FROM dbo.ShopWebsitePages
    WHERE ShopID = @SampleShopID AND Slug = N'about-test';

    -- Sample UPDATE:
    UPDATE dbo.ShopWebsitePages
    SET PageTitle = N'Updated About Us',
        HtmlContent = N'<h1>Updated About Us</h1>',
        UpdatedAt = SYSUTCDATETIME()
    WHERE ShopID = @SampleShopID AND Slug = N'about-test';

    -- Sample DELETE (destructive for the matching test page):
    DELETE FROM dbo.ShopWebsitePages
    WHERE ShopID = @SampleShopID AND Slug = N'about-test';
*/
