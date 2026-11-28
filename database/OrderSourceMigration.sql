USE db_ac42f8_saitix;
GO

/* Where an order came from. "Online" = placed on the shop's website (every order before this
   change). Counter / Phone / WhatsApp / Other = a sale the owner entered in Shop Admin → Add Sale.
   Safe to run more than once. */
IF COL_LENGTH(N'dbo.Orders', N'OrderSource') IS NULL
BEGIN
    ALTER TABLE dbo.Orders
        ADD OrderSource NVARCHAR(20) NOT NULL
            CONSTRAINT DF_Orders_OrderSource DEFAULT N'Online';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_Orders_OrderSource')
BEGIN
    ALTER TABLE dbo.Orders
        ADD CONSTRAINT CK_Orders_OrderSource
            CHECK (OrderSource IN (N'Online', N'Counter', N'Phone', N'WhatsApp', N'Other'));
END
GO

/* Reports filter and group orders by shop, date and source. */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Orders_Shop_Source_Created' AND object_id = OBJECT_ID(N'dbo.Orders'))
BEGIN
    CREATE INDEX IX_Orders_Shop_Source_Created ON dbo.Orders(ShopID, OrderSource, CreatedAt);
END
GO
