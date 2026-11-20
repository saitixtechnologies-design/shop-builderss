USE db_ac42f8_saitix;
GO

IF COL_LENGTH('dbo.Orders', 'ConfirmedAt') IS NULL
BEGIN
    ALTER TABLE dbo.Orders
    ADD ConfirmedAt DATETIME2(0) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_Orders_ConfirmedAt'
      AND object_id = OBJECT_ID('dbo.Orders')
)
BEGIN
    CREATE INDEX IX_Orders_ConfirmedAt
    ON dbo.Orders(ConfirmedAt);
END
GO