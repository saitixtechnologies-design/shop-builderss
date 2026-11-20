/* Run this once against db_ac42f8_saitix. Safe to rerun. */
USE db_ac42f8_saitix;
GO

IF OBJECT_ID(N'dbo.ShopServiceEnquiries', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ShopServiceEnquiries
    (
        EnquiryID INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ShopServiceEnquiries PRIMARY KEY,
        ShopID INT NOT NULL,
        ServiceID INT NULL,
        ServiceName NVARCHAR(200) NOT NULL,
        CustomerName NVARCHAR(160) NOT NULL,
        Phone NVARCHAR(30) NOT NULL,
        Email NVARCHAR(254) NULL,
        Requirement NVARCHAR(4000) NOT NULL,
        Status NVARCHAR(20) NOT NULL CONSTRAINT DF_ShopServiceEnquiries_Status DEFAULT N'New',
        ShopNotes NVARCHAR(2000) NULL,
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_ShopServiceEnquiries_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_ShopServiceEnquiries_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_ShopServiceEnquiries_Shops FOREIGN KEY (ShopID) REFERENCES dbo.Shops(ShopID),
        CONSTRAINT CK_ShopServiceEnquiries_Status CHECK (Status IN (N'New', N'Contacted', N'Follow-up', N'Converted', N'Closed'))
    );
    CREATE INDEX IX_ShopServiceEnquiries_Shop_Created ON dbo.ShopServiceEnquiries(ShopID, CreatedAt DESC, EnquiryID DESC);
    CREATE INDEX IX_ShopServiceEnquiries_Shop_Status_Created ON dbo.ShopServiceEnquiries(ShopID, Status, CreatedAt DESC);
END
GO
