USE db_ac42f8_saitix;
GO

/* Order history: every status change and every private note on an order, shown in Shop Admin.
   Also adds an index so date-range order reports stay fast. Safe to run more than once. */
IF OBJECT_ID(N'dbo.OrderHistory', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OrderHistory
    (
        OrderHistoryID INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_OrderHistory PRIMARY KEY,
        OrderID INT NOT NULL,
        ShopID INT NOT NULL,
        EntryType NVARCHAR(20) NOT NULL,          -- Status | Note
        FromStatus NVARCHAR(40) NULL,
        ToStatus NVARCHAR(40) NULL,
        Note NVARCHAR(1000) NULL,
        CreatedBy NVARCHAR(150) NULL,
        CreatedAt DATETIME2(0) NOT NULL
            CONSTRAINT DF_OrderHistory_CreatedAt DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_OrderHistory_Orders
            FOREIGN KEY (OrderID) REFERENCES dbo.Orders(OrderID),
        CONSTRAINT CK_OrderHistory_EntryType
            CHECK (EntryType IN (N'Status', N'Note'))
    );

    CREATE INDEX IX_OrderHistory_OrderID ON dbo.OrderHistory(OrderID, CreatedAt);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Orders_ShopID_CreatedAt' AND object_id = OBJECT_ID(N'dbo.Orders'))
    CREATE INDEX IX_Orders_ShopID_CreatedAt
        ON dbo.Orders(ShopID, CreatedAt)
        INCLUDE (OrderStatus, GrandTotal, CustomerID);
GO
