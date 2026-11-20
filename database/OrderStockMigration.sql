USE db_ac42f8_saitix;
GO

/* Orders now take stock when they are placed and give it back when they are cancelled.
   StockDeducted marks the orders that actually took stock, so cancelling an order placed
   before this change never adds stock that was never removed. Safe to run more than once. */
IF COL_LENGTH('dbo.Orders', 'StockDeducted') IS NULL
BEGIN
    ALTER TABLE dbo.Orders
    ADD StockDeducted BIT NOT NULL
        CONSTRAINT DF_Orders_StockDeducted DEFAULT 0 WITH VALUES;
END
GO
