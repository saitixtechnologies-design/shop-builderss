/*
    SHOP BUILDER SAAS
    SQL Server Database Foundation
    Database: db_ac42f8_saitix
    Server: (localdb)\MSSQLLocalDB

    Multi-tenant rule:
    Shop-owned data contains ShopID and is isolated by ShopID.
*/    

IF DB_ID(N'db_ac42f8_saitix') IS NULL
BEGIN
    CREATE DATABASE db_ac42f8_saitix;
END
GO

USE db_ac42f8_saitix;
GO

/* =========================================================
   1. ROLES
   ========================================================= */
IF OBJECT_ID(N'dbo.Roles', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Roles
    (
        RoleID INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_Roles PRIMARY KEY,
        RoleName NVARCHAR(50) NOT NULL
            CONSTRAINT UQ_Roles_RoleName UNIQUE,
        Description NVARCHAR(250) NULL,
        CreatedAt DATETIME2(0) NOT NULL
            CONSTRAINT DF_Roles_CreatedAt DEFAULT SYSUTCDATETIME()
    );
END
GO

/* =========================================================
   2. SHOPS / TENANTS
   ========================================================= */
IF OBJECT_ID(N'dbo.Shops', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Shops
    (
        ShopID INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_Shops PRIMARY KEY,
        ShopName NVARCHAR(150) NOT NULL,
        ShopSlug NVARCHAR(160) NOT NULL
            CONSTRAINT UQ_Shops_ShopSlug UNIQUE,
        OwnerName NVARCHAR(150) NULL,
        Email NVARCHAR(255) NULL,
        Phone NVARCHAR(30) NULL,
        LogoURL NVARCHAR(500) NULL,
        ShopType NVARCHAR(20) NOT NULL
            CONSTRAINT DF_Shops_ShopType DEFAULT N'Ecommerce',
        WebsiteTemplate NVARCHAR(40) NOT NULL
            CONSTRAINT DF_Shops_WebsiteTemplate DEFAULT N'editorial',
        Status NVARCHAR(30) NOT NULL
            CONSTRAINT DF_Shops_Status DEFAULT N'Active',
        CreatedAt DATETIME2(0) NOT NULL
            CONSTRAINT DF_Shops_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(0) NOT NULL
            CONSTRAINT DF_Shops_UpdatedAt DEFAULT SYSUTCDATETIME()
    );
END
GO

IF COL_LENGTH(N'dbo.Shops', N'ShopType') IS NULL
BEGIN
    ALTER TABLE dbo.Shops
    ADD ShopType NVARCHAR(20) NOT NULL
        CONSTRAINT DF_Shops_ShopType DEFAULT N'Ecommerce' WITH VALUES;
END
GO

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
   OR (ShopType = N'Ecommerce' AND WebsiteTemplate NOT IN (N'editorial', N'minimal', N'boutique', N'bold'));
GO

/* A shop can open on its own domain (e.g. www.snehacenter.com).
   CustomDomain    the domain the owner entered (lowercase, no "https://")
   DomainStatus    None | Pending (waiting for DNS) | Active (verified, the storefront opens on it)
   DomainVerifyToken  value the owner puts in a DNS TXT record to prove the domain is theirs
   Safe to run more than once. */
IF COL_LENGTH(N'dbo.Shops', N'CustomDomain') IS NULL
    ALTER TABLE dbo.Shops ADD CustomDomain NVARCHAR(253) NULL;
GO
IF COL_LENGTH(N'dbo.Shops', N'DomainStatus') IS NULL
    ALTER TABLE dbo.Shops ADD DomainStatus NVARCHAR(20) NOT NULL
        CONSTRAINT DF_Shops_DomainStatus DEFAULT N'None' WITH VALUES;
GO
IF COL_LENGTH(N'dbo.Shops', N'DomainVerifyToken') IS NULL
    ALTER TABLE dbo.Shops ADD DomainVerifyToken NVARCHAR(64) NULL;
GO
IF COL_LENGTH(N'dbo.Shops', N'DomainVerifiedAt') IS NULL
    ALTER TABLE dbo.Shops ADD DomainVerifiedAt DATETIME2(0) NULL;
GO

-- One domain belongs to one shop only.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_Shops_CustomDomain' AND object_id = OBJECT_ID(N'dbo.Shops'))
    CREATE UNIQUE INDEX UX_Shops_CustomDomain ON dbo.Shops(CustomDomain) WHERE CustomDomain IS NOT NULL;
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

/* =========================================================
   3. USERS
   Super Admin has NULL ShopID.
   Shop Admin / Staff belong to one ShopID.
   ========================================================= */
IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users
    (
        UserID INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_Users PRIMARY KEY,
        ShopID INT NULL,
        RoleID INT NOT NULL,
        FullName NVARCHAR(150) NOT NULL,
        Email NVARCHAR(255) NOT NULL,
        PasswordHash NVARCHAR(255) NOT NULL,
        Phone NVARCHAR(30) NULL,
        IsActive BIT NOT NULL
            CONSTRAINT DF_Users_IsActive DEFAULT 1,
        LastLoginAt DATETIME2(0) NULL,
        CreatedAt DATETIME2(0) NOT NULL
            CONSTRAINT DF_Users_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(0) NOT NULL
            CONSTRAINT DF_Users_UpdatedAt DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_Users_Shops
            FOREIGN KEY (ShopID) REFERENCES dbo.Shops(ShopID),

        CONSTRAINT FK_Users_Roles
            FOREIGN KEY (RoleID) REFERENCES dbo.Roles(RoleID)
    );

    CREATE UNIQUE INDEX UX_Users_Email
        ON dbo.Users(Email);

    CREATE INDEX IX_Users_ShopID
        ON dbo.Users(ShopID);
END
GO

/* =========================================================
   4. BRANDS
   ========================================================= */
IF OBJECT_ID(N'dbo.Brands', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Brands
    (
        BrandID INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_Brands PRIMARY KEY,
        ShopID INT NOT NULL,
        BrandName NVARCHAR(150) NOT NULL,
        Slug NVARCHAR(180) NOT NULL,
        LogoURL NVARCHAR(500) NULL,
        Description NVARCHAR(1000) NULL,
        IsActive BIT NOT NULL
            CONSTRAINT DF_Brands_IsActive DEFAULT 1,
        CreatedAt DATETIME2(0) NOT NULL
            CONSTRAINT DF_Brands_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(0) NOT NULL
            CONSTRAINT DF_Brands_UpdatedAt DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_Brands_Shops
            FOREIGN KEY (ShopID) REFERENCES dbo.Shops(ShopID),

        CONSTRAINT UQ_Brands_Shop_Slug
            UNIQUE (ShopID, Slug)
    );

    CREATE INDEX IX_Brands_ShopID
        ON dbo.Brands(ShopID);
END
GO

/* =========================================================
   5. CATEGORIES
   Unlimited parent/child hierarchy through ParentCategoryID
   ========================================================= */
IF OBJECT_ID(N'dbo.Categories', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Categories
    (
        CategoryID INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_Categories PRIMARY KEY,
        ShopID INT NOT NULL,
        ParentCategoryID INT NULL,
        CategoryName NVARCHAR(150) NOT NULL,
        Slug NVARCHAR(180) NOT NULL,
        Description NVARCHAR(1000) NULL,
        ImageURL NVARCHAR(500) NULL,
        SortOrder INT NOT NULL
            CONSTRAINT DF_Categories_SortOrder DEFAULT 0,
        IsActive BIT NOT NULL
            CONSTRAINT DF_Categories_IsActive DEFAULT 1,
        CreatedAt DATETIME2(0) NOT NULL
            CONSTRAINT DF_Categories_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(0) NOT NULL
            CONSTRAINT DF_Categories_UpdatedAt DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_Categories_Shops
            FOREIGN KEY (ShopID) REFERENCES dbo.Shops(ShopID),

        CONSTRAINT FK_Categories_Parent
            FOREIGN KEY (ParentCategoryID) REFERENCES dbo.Categories(CategoryID),

        CONSTRAINT UQ_Categories_Shop_Slug
            UNIQUE (ShopID, Slug)
    );

    CREATE INDEX IX_Categories_ShopID
        ON dbo.Categories(ShopID);

    CREATE INDEX IX_Categories_ParentCategoryID
        ON dbo.Categories(ParentCategoryID);
END
GO

/* =========================================================
   6. SPECIFICATION TEMPLATES
   ========================================================= */
IF OBJECT_ID(N'dbo.SpecificationTemplates', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SpecificationTemplates
    (
        SpecificationTemplateID INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_SpecificationTemplates PRIMARY KEY,
        ShopID INT NOT NULL,
        CategoryID INT NOT NULL,
        TemplateName NVARCHAR(150) NOT NULL,
        IsActive BIT NOT NULL
            CONSTRAINT DF_SpecificationTemplates_IsActive DEFAULT 1,
        CreatedAt DATETIME2(0) NOT NULL
            CONSTRAINT DF_SpecificationTemplates_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(0) NOT NULL
            CONSTRAINT DF_SpecificationTemplates_UpdatedAt DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_SpecificationTemplates_Shops
            FOREIGN KEY (ShopID) REFERENCES dbo.Shops(ShopID),

        CONSTRAINT FK_SpecificationTemplates_Categories
            FOREIGN KEY (CategoryID) REFERENCES dbo.Categories(CategoryID)
    );
END
GO

IF OBJECT_ID(N'dbo.SpecificationTemplateFields', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SpecificationTemplateFields
    (
        SpecificationFieldID INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_SpecificationTemplateFields PRIMARY KEY,
        SpecificationTemplateID INT NOT NULL,
        FieldKey NVARCHAR(100) NOT NULL,
        FieldLabel NVARCHAR(150) NOT NULL,
        FieldType NVARCHAR(30) NOT NULL,
        Unit NVARCHAR(50) NULL,
        OptionsJSON NVARCHAR(MAX) NULL,
        IsRequired BIT NOT NULL
            CONSTRAINT DF_SpecificationTemplateFields_IsRequired DEFAULT 0,
        SortOrder INT NOT NULL
            CONSTRAINT DF_SpecificationTemplateFields_SortOrder DEFAULT 0,

        CONSTRAINT FK_SpecificationTemplateFields_Templates
            FOREIGN KEY (SpecificationTemplateID)
            REFERENCES dbo.SpecificationTemplates(SpecificationTemplateID)
    );
END
GO

/* =========================================================
   7. PRODUCTS
   ========================================================= */
IF OBJECT_ID(N'dbo.Products', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Products
    (
        ProductID INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_Products PRIMARY KEY,
        ShopID INT NOT NULL,
        CategoryID INT NULL, -- optional: products can be saved without a category
        BrandID INT NULL,
        ProductName NVARCHAR(250) NOT NULL,
        Slug NVARCHAR(280) NOT NULL,
        SKU NVARCHAR(100) NOT NULL,
        SizeOptions NVARCHAR(MAX) NULL,
        ModelNo NVARCHAR(100) NULL,
        Tags NVARCHAR(1000) NULL,
        ShortDescription NVARCHAR(1000) NULL,
        Description NVARCHAR(MAX) NULL,
        MRP DECIMAL(18,2) NULL,
        SellingPrice DECIMAL(18,2) NOT NULL,
        CostPrice DECIMAL(18,2) NULL,
        StockQuantity INT NOT NULL
            CONSTRAINT DF_Products_StockQuantity DEFAULT 0,
        LowStockThreshold INT NOT NULL
            CONSTRAINT DF_Products_LowStockThreshold DEFAULT 5,
        IsAvailable BIT NOT NULL
            CONSTRAINT DF_Products_IsAvailable DEFAULT 1,
        IsActive BIT NOT NULL
            CONSTRAINT DF_Products_IsActive DEFAULT 1,
        CreatedAt DATETIME2(0) NOT NULL
            CONSTRAINT DF_Products_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(0) NOT NULL
            CONSTRAINT DF_Products_UpdatedAt DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_Products_Shops
            FOREIGN KEY (ShopID) REFERENCES dbo.Shops(ShopID),

        CONSTRAINT FK_Products_Categories
            FOREIGN KEY (CategoryID) REFERENCES dbo.Categories(CategoryID),

        CONSTRAINT FK_Products_Brands
            FOREIGN KEY (BrandID) REFERENCES dbo.Brands(BrandID),

        CONSTRAINT UQ_Products_Shop_SKU
            UNIQUE (ShopID, SKU),

        CONSTRAINT UQ_Products_Shop_Slug
            UNIQUE (ShopID, Slug)
    );

    CREATE INDEX IX_Products_ShopID
        ON dbo.Products(ShopID);

    CREATE INDEX IX_Products_CategoryID
        ON dbo.Products(CategoryID);

    CREATE INDEX IX_Products_BrandID
        ON dbo.Products(BrandID);

    CREATE INDEX IX_Products_ProductName
        ON dbo.Products(ProductName);
END
GO

IF COL_LENGTH(N'dbo.Products', N'SizeOptions') IS NULL
    ALTER TABLE dbo.Products ADD SizeOptions NVARCHAR(MAX) NULL;
GO

/* =========================================================
   8. PRODUCT IMAGES
   ========================================================= */
IF OBJECT_ID(N'dbo.ProductImages', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProductImages
    (
        ProductImageID INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_ProductImages PRIMARY KEY,
        ProductID INT NOT NULL,
        ImageURL NVARCHAR(500) NOT NULL,
        AltText NVARCHAR(250) NULL,
        SortOrder INT NOT NULL
            CONSTRAINT DF_ProductImages_SortOrder DEFAULT 0,
        IsPrimary BIT NOT NULL
            CONSTRAINT DF_ProductImages_IsPrimary DEFAULT 0,
        CreatedAt DATETIME2(0) NOT NULL
            CONSTRAINT DF_ProductImages_CreatedAt DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_ProductImages_Products
            FOREIGN KEY (ProductID) REFERENCES dbo.Products(ProductID)
    );

    CREATE INDEX IX_ProductImages_ProductID
        ON dbo.ProductImages(ProductID);
END
GO

/* =========================================================
   9. PRODUCT SPECIFICATION VALUES
   ========================================================= */
IF OBJECT_ID(N'dbo.ProductSpecificationValues', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProductSpecificationValues
    (
        ProductSpecificationValueID INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_ProductSpecificationValues PRIMARY KEY,
        ProductID INT NOT NULL,
        SpecificationFieldID INT NOT NULL,
        ValueText NVARCHAR(MAX) NULL,

        CONSTRAINT FK_ProductSpecificationValues_Products
            FOREIGN KEY (ProductID) REFERENCES dbo.Products(ProductID),

        CONSTRAINT FK_ProductSpecificationValues_Fields
            FOREIGN KEY (SpecificationFieldID)
            REFERENCES dbo.SpecificationTemplateFields(SpecificationFieldID),

        CONSTRAINT UQ_ProductSpecificationValues_Product_Field
            UNIQUE (ProductID, SpecificationFieldID)
    );
END
GO

/* =========================================================
   10. CUSTOMERS
   ========================================================= */
IF OBJECT_ID(N'dbo.Customers', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Customers
    (
        CustomerID INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_Customers PRIMARY KEY,
        ShopID INT NOT NULL,
        FullName NVARCHAR(150) NOT NULL,
        Email NVARCHAR(255) NULL,
        Phone NVARCHAR(30) NULL,
        PasswordHash NVARCHAR(255) NULL,
        IsActive BIT NOT NULL
            CONSTRAINT DF_Customers_IsActive DEFAULT 1,
        CreatedAt DATETIME2(0) NOT NULL
            CONSTRAINT DF_Customers_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(0) NOT NULL
            CONSTRAINT DF_Customers_UpdatedAt DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_Customers_Shops
            FOREIGN KEY (ShopID) REFERENCES dbo.Shops(ShopID)
    );

    CREATE INDEX IX_Customers_ShopID
        ON dbo.Customers(ShopID);

    CREATE INDEX IX_Customers_Email
        ON dbo.Customers(Email);
END
GO

/* =========================================================
   11. COUPONS
   ========================================================= */
IF OBJECT_ID(N'dbo.Coupons', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Coupons
    (
        CouponID INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_Coupons PRIMARY KEY,
        ShopID INT NOT NULL,
        CouponCode NVARCHAR(50) NOT NULL,
        DiscountType NVARCHAR(20) NOT NULL,
        DiscountValue DECIMAL(18,2) NOT NULL,
        MinimumOrderAmount DECIMAL(18,2) NULL,
        MaximumDiscountAmount DECIMAL(18,2) NULL,
        UsageLimit INT NULL,
        UsedCount INT NOT NULL
            CONSTRAINT DF_Coupons_UsedCount DEFAULT 0,
        StartsAt DATETIME2(0) NULL,
        ExpiresAt DATETIME2(0) NULL,
        IsActive BIT NOT NULL
            CONSTRAINT DF_Coupons_IsActive DEFAULT 1,
        CreatedAt DATETIME2(0) NOT NULL
            CONSTRAINT DF_Coupons_CreatedAt DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_Coupons_Shops
            FOREIGN KEY (ShopID) REFERENCES dbo.Shops(ShopID),

        CONSTRAINT UQ_Coupons_Shop_Code
            UNIQUE (ShopID, CouponCode)
    );
END
GO

/* =========================================================
   12. ORDERS
   ========================================================= */
IF OBJECT_ID(N'dbo.Orders', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Orders
    (
        OrderID INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_Orders PRIMARY KEY,
        ShopID INT NOT NULL,
        CustomerID INT NULL,
        OrderNumber NVARCHAR(50) NOT NULL,
        OrderStatus NVARCHAR(30) NOT NULL
            CONSTRAINT DF_Orders_OrderStatus DEFAULT N'Pending',
        PaymentStatus NVARCHAR(30) NOT NULL
            CONSTRAINT DF_Orders_PaymentStatus DEFAULT N'Pending',
        PaymentMethod NVARCHAR(50) NULL,
        SubTotal DECIMAL(18,2) NOT NULL
            CONSTRAINT DF_Orders_SubTotal DEFAULT 0,
        DiscountAmount DECIMAL(18,2) NOT NULL
            CONSTRAINT DF_Orders_DiscountAmount DEFAULT 0,
        ShippingAmount DECIMAL(18,2) NOT NULL
            CONSTRAINT DF_Orders_ShippingAmount DEFAULT 0,
        TaxAmount DECIMAL(18,2) NOT NULL
            CONSTRAINT DF_Orders_TaxAmount DEFAULT 0,
        GrandTotal DECIMAL(18,2) NOT NULL
            CONSTRAINT DF_Orders_GrandTotal DEFAULT 0,
        ShippingName NVARCHAR(150) NULL,
        ShippingPhone NVARCHAR(30) NULL,
        ShippingAddress NVARCHAR(500) NULL,
        ShippingCity NVARCHAR(100) NULL,
        ShippingState NVARCHAR(100) NULL,
        ShippingPostalCode NVARCHAR(20) NULL,
        CreatedAt DATETIME2(0) NOT NULL
            CONSTRAINT DF_Orders_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(0) NOT NULL
            CONSTRAINT DF_Orders_UpdatedAt DEFAULT SYSUTCDATETIME(),

        -- 1 = this order took stock from its products (given back if it is cancelled)
        StockDeducted BIT NOT NULL
            CONSTRAINT DF_Orders_StockDeducted DEFAULT 0,

        CONSTRAINT FK_Orders_Shops
            FOREIGN KEY (ShopID) REFERENCES dbo.Shops(ShopID),

        CONSTRAINT FK_Orders_Customers
            FOREIGN KEY (CustomerID) REFERENCES dbo.Customers(CustomerID),

        CONSTRAINT UQ_Orders_Shop_OrderNumber
            UNIQUE (ShopID, OrderNumber)
    );

    CREATE INDEX IX_Orders_ShopID
        ON dbo.Orders(ShopID);

    CREATE INDEX IX_Orders_CustomerID
        ON dbo.Orders(CustomerID);

    CREATE INDEX IX_Orders_OrderStatus
        ON dbo.Orders(OrderStatus);
END
GO

/* =========================================================
   13. ORDER ITEMS
   ========================================================= */
IF OBJECT_ID(N'dbo.OrderItems', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OrderItems
    (
        OrderItemID INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_OrderItems PRIMARY KEY,
        OrderID INT NOT NULL,
        ProductID INT NOT NULL,
        ProductName NVARCHAR(250) NOT NULL,
        SKU NVARCHAR(100) NULL,
        Size NVARCHAR(50) NULL,
        Quantity INT NOT NULL,
        UnitPrice DECIMAL(18,2) NOT NULL,
        TotalPrice AS (Quantity * UnitPrice) PERSISTED,

        CONSTRAINT FK_OrderItems_Orders
            FOREIGN KEY (OrderID) REFERENCES dbo.Orders(OrderID),

        CONSTRAINT FK_OrderItems_Products
            FOREIGN KEY (ProductID) REFERENCES dbo.Products(ProductID)
    );

    CREATE INDEX IX_OrderItems_OrderID
        ON dbo.OrderItems(OrderID);

    CREATE INDEX IX_OrderItems_ProductID
        ON dbo.OrderItems(ProductID);
END
GO

IF COL_LENGTH(N'dbo.OrderItems', N'Size') IS NULL
    ALTER TABLE dbo.OrderItems ADD Size NVARCHAR(50) NULL;
GO

/* =========================================================
   14. REVIEWS
   ========================================================= */
IF OBJECT_ID(N'dbo.Reviews', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Reviews
    (
        ReviewID INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_Reviews PRIMARY KEY,
        ShopID INT NOT NULL,
        ProductID INT NOT NULL,
        CustomerID INT NULL,
        Rating TINYINT NOT NULL,
        ReviewTitle NVARCHAR(200) NULL,
        ReviewText NVARCHAR(2000) NULL,
        IsApproved BIT NOT NULL
            CONSTRAINT DF_Reviews_IsApproved DEFAULT 0,
        CreatedAt DATETIME2(0) NOT NULL
            CONSTRAINT DF_Reviews_CreatedAt DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_Reviews_Shops
            FOREIGN KEY (ShopID) REFERENCES dbo.Shops(ShopID),

        CONSTRAINT FK_Reviews_Products
            FOREIGN KEY (ProductID) REFERENCES dbo.Products(ProductID),

        CONSTRAINT FK_Reviews_Customers
            FOREIGN KEY (CustomerID) REFERENCES dbo.Customers(CustomerID),

        CONSTRAINT CK_Reviews_Rating
            CHECK (Rating BETWEEN 1 AND 5)
    );

    CREATE INDEX IX_Reviews_ProductID
        ON dbo.Reviews(ProductID);

    CREATE INDEX IX_Reviews_ShopID
        ON dbo.Reviews(ShopID);
END
GO

/* =========================================================
   15. SUBSCRIPTIONS
   ========================================================= */
IF OBJECT_ID(N'dbo.Subscriptions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Subscriptions
    (
        SubscriptionID INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_Subscriptions PRIMARY KEY,
        ShopID INT NOT NULL,
        PlanName NVARCHAR(100) NOT NULL,
        Status NVARCHAR(30) NOT NULL
            CONSTRAINT DF_Subscriptions_Status DEFAULT N'Active',
        StartsAt DATETIME2(0) NOT NULL,
        EndsAt DATETIME2(0) NULL,
        CreatedAt DATETIME2(0) NOT NULL
            CONSTRAINT DF_Subscriptions_CreatedAt DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_Subscriptions_Shops
            FOREIGN KEY (ShopID) REFERENCES dbo.Shops(ShopID)
    );

    CREATE INDEX IX_Subscriptions_ShopID
        ON dbo.Subscriptions(ShopID);
END
GO

/* =========================================================
   16. PAYMENTS
   ========================================================= */
IF OBJECT_ID(N'dbo.Payments', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Payments
    (
        PaymentID INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_Payments PRIMARY KEY,
        ShopID INT NOT NULL,
        OrderID INT NULL,
        SubscriptionID INT NULL,
        Amount DECIMAL(18,2) NOT NULL,
        PaymentType NVARCHAR(30) NOT NULL,
        PaymentStatus NVARCHAR(30) NOT NULL
            CONSTRAINT DF_Payments_PaymentStatus DEFAULT N'Pending',
        TransactionReference NVARCHAR(150) NULL,
        PaymentGateway NVARCHAR(100) NULL,
        PaidAt DATETIME2(0) NULL,
        CreatedAt DATETIME2(0) NOT NULL
            CONSTRAINT DF_Payments_CreatedAt DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_Payments_Shops
            FOREIGN KEY (ShopID) REFERENCES dbo.Shops(ShopID),

        CONSTRAINT FK_Payments_Orders
            FOREIGN KEY (OrderID) REFERENCES dbo.Orders(OrderID),

        CONSTRAINT FK_Payments_Subscriptions
            FOREIGN KEY (SubscriptionID)
            REFERENCES dbo.Subscriptions(SubscriptionID)
    );

    CREATE INDEX IX_Payments_ShopID
        ON dbo.Payments(ShopID);

    CREATE INDEX IX_Payments_OrderID
        ON dbo.Payments(OrderID);
END
GO

/* =========================================================
   17. SEED ROLES
   ========================================================= */
IF NOT EXISTS (SELECT 1 FROM dbo.Roles WHERE RoleName = N'SuperAdmin')
BEGIN
    INSERT INTO dbo.Roles (RoleName, Description)
    VALUES (N'SuperAdmin', N'Platform-level administrator');
END

IF NOT EXISTS (SELECT 1 FROM dbo.Roles WHERE RoleName = N'ShopAdmin')
BEGIN
    INSERT INTO dbo.Roles (RoleName, Description)
    VALUES (N'ShopAdmin', N'Administrator of a single shop');
END

IF NOT EXISTS (SELECT 1 FROM dbo.Roles WHERE RoleName = N'ShopStaff')
BEGIN
    INSERT INTO dbo.Roles (RoleName, Description)
    VALUES (N'ShopStaff', N'Staff member belonging to a shop');
END
GO

/* =========================================================
   18. VERIFICATION
   ========================================================= */
SELECT
    TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;
GO



USE db_ac42f8_saitix;
GO

/* =====================================================
   CATEGORIES TABLE
===================================================== */

IF NOT EXISTS (
    SELECT 1
    FROM sys.tables
    WHERE name = 'Categories'
)
BEGIN

    CREATE TABLE dbo.Categories
    (
        CategoryID INT IDENTITY(1,1) PRIMARY KEY,

        ShopID INT NOT NULL,

        ParentCategoryID INT NULL,

        CategoryName NVARCHAR(150) NOT NULL,

        CategorySlug NVARCHAR(180) NOT NULL,

        Description NVARCHAR(500) NULL,

        ImageURL NVARCHAR(500) NULL,

        Status NVARCHAR(20) NOT NULL
            CONSTRAINT DF_Categories_Status
            DEFAULT 'Active',

        DisplayOrder INT NOT NULL
            CONSTRAINT DF_Categories_DisplayOrder
            DEFAULT 0,

        CreatedAt DATETIME2 NOT NULL
            CONSTRAINT DF_Categories_CreatedAt
            DEFAULT SYSDATETIME(),

        UpdatedAt DATETIME2 NOT NULL
            CONSTRAINT DF_Categories_UpdatedAt
            DEFAULT SYSDATETIME(),

        CONSTRAINT FK_Categories_Shops
            FOREIGN KEY (ShopID)
            REFERENCES dbo.Shops(ShopID),

        CONSTRAINT FK_Categories_Parent
            FOREIGN KEY (ParentCategoryID)
            REFERENCES dbo.Categories(CategoryID),

        CONSTRAINT CK_Categories_Status
            CHECK (Status IN ('Active', 'Inactive'))
    );

END;
GO


-- =====================================================
-- PRODUCTS TABLE
-- =====================================================

IF OBJECT_ID(N'dbo.Products', N'U') IS NULL
BEGIN
CREATE TABLE dbo.Products
(
    ProductID INT IDENTITY(1,1) PRIMARY KEY,

    ShopID INT NOT NULL,

    CategoryID INT NULL,

    ProductName NVARCHAR(200) NOT NULL,

    Slug NVARCHAR(250) NOT NULL,

    SKU NVARCHAR(100) NOT NULL,

    ModelNo NVARCHAR(100) NULL,

    BrandName NVARCHAR(150) NULL,

    Tags NVARCHAR(500) NULL,

    ShortDescription NVARCHAR(500) NULL,

    Description NVARCHAR(MAX) NULL,

    MRP DECIMAL(18,2) NOT NULL DEFAULT 0,

    SellingPrice DECIMAL(18,2) NOT NULL DEFAULT 0,

    StockQuantity INT NOT NULL DEFAULT 0,

    Availability NVARCHAR(50) NOT NULL DEFAULT 'In Stock',

    ImageURL NVARCHAR(500) NULL,

    Status NVARCHAR(20) NOT NULL DEFAULT 'Active',

    CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),

    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),

    CONSTRAINT FK_Products_Shops
        FOREIGN KEY (ShopID)
        REFERENCES dbo.Shops(ShopID),

    CONSTRAINT FK_Products_Categories
        FOREIGN KEY (CategoryID)
        REFERENCES dbo.Categories(CategoryID),

    CONSTRAINT UQ_Products_Shop_SKU
        UNIQUE (ShopID, SKU),

    CONSTRAINT UQ_Products_Shop_Slug
        UNIQUE (ShopID, Slug)
);
END
GO

/* =========================================================
   SERVICES TABLE
   ========================================================= */

IF OBJECT_ID(N'dbo.Services', N'U') IS NULL
BEGIN

    CREATE TABLE dbo.Services
    (
        ServiceID INT IDENTITY(1,1) NOT NULL,

        ShopID INT NOT NULL,

        ServiceName NVARCHAR(200) NOT NULL,

        Slug NVARCHAR(250) NOT NULL,

        ShortDescription NVARCHAR(500) NULL,

        Description NVARCHAR(MAX) NULL,

        Price DECIMAL(18,2) NULL,

        ImageURL NVARCHAR(500) NULL,

        VideoURL NVARCHAR(1000) NULL,

        Status NVARCHAR(20) NOT NULL
            CONSTRAINT DF_Services_Status
            DEFAULT N'Active',

        CreatedAt DATETIME2(0) NOT NULL
            CONSTRAINT DF_Services_CreatedAt
            DEFAULT SYSUTCDATETIME(),

        UpdatedAt DATETIME2(0) NOT NULL
            CONSTRAINT DF_Services_UpdatedAt
            DEFAULT SYSUTCDATETIME(),

        CONSTRAINT PK_Services
            PRIMARY KEY (ServiceID),

        CONSTRAINT FK_Services_Shops
            FOREIGN KEY (ShopID)
            REFERENCES dbo.Shops(ShopID),

        CONSTRAINT UQ_Services_Shop_Slug
            UNIQUE (ShopID, Slug),

        CONSTRAINT CK_Services_Status
            CHECK (Status IN (N'Active', N'Inactive'))
    );

END
GO

/* =========================================================
   SERVICE ENQUIRIES (TENANT SCOPED)
   ========================================================= */
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

IF COL_LENGTH(N'dbo.Services', N'VideoURL') IS NULL
BEGIN
    ALTER TABLE dbo.Services ADD VideoURL NVARCHAR(1000) NULL;
END
GO

IF COL_LENGTH(N'dbo.Services', N'ImageURLs') IS NULL
BEGIN
    ALTER TABLE dbo.Services ADD ImageURLs NVARCHAR(MAX) NULL;
END
GO


/* =====================================================
   SHOP SETTINGS
===================================================== */

IF OBJECT_ID(N'dbo.ShopSettings', N'U') IS NULL
BEGIN
CREATE TABLE dbo.ShopSettings
(
    ShopSettingsID INT IDENTITY(1,1) PRIMARY KEY,

    ShopID INT NOT NULL,

    ShopLogo NVARCHAR(500) NULL,

    Tagline NVARCHAR(255) NULL,

    Phone NVARCHAR(30) NULL,

    WhatsAppNumber NVARCHAR(30) NULL,

    Email NVARCHAR(255) NULL,

    Address NVARCHAR(500) NULL,

    City NVARCHAR(100) NULL,

    State NVARCHAR(100) NULL,

    Pincode NVARCHAR(20) NULL,

    AboutUs NVARCHAR(MAX) NULL,

    OpeningTime NVARCHAR(20) NULL,

    ClosingTime NVARCHAR(20) NULL,

    FacebookURL NVARCHAR(500) NULL,

    InstagramURL NVARCHAR(500) NULL,

    YouTubeURL NVARCHAR(500) NULL,

    WebsiteStatus NVARCHAR(20) NOT NULL
        CONSTRAINT DF_ShopSettings_WebsiteStatus
        DEFAULT 'Active',

    CreatedAt DATETIME NOT NULL
        CONSTRAINT DF_ShopSettings_CreatedAt
        DEFAULT GETDATE(),

    UpdatedAt DATETIME NOT NULL
        CONSTRAINT DF_ShopSettings_UpdatedAt
        DEFAULT GETDATE(),

    CONSTRAINT FK_ShopSettings_Shops
        FOREIGN KEY (ShopID)
        REFERENCES Shops(ShopID),

    CONSTRAINT UQ_ShopSettings_ShopID
        UNIQUE (ShopID)
);
END
GO



USE db_ac42f8_saitix;
GO

-- =====================================================
-- 19. BANNERS
-- =====================================================

IF OBJECT_ID(N'dbo.Banners', N'U') IS NULL
BEGIN

    CREATE TABLE dbo.Banners
    (
        BannerID INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_Banners PRIMARY KEY,

        ShopID INT NOT NULL,

        Title NVARCHAR(200) NOT NULL,

        Subtitle NVARCHAR(500) NULL,

        ImageURL NVARCHAR(500) NULL,

        VideoURL NVARCHAR(1000) NULL,

        ButtonText NVARCHAR(100) NULL,

        ButtonLink NVARCHAR(500) NULL,

        DisplayOrder INT NOT NULL
            CONSTRAINT DF_Banners_DisplayOrder DEFAULT 0,

        Status NVARCHAR(20) NOT NULL
            CONSTRAINT DF_Banners_Status DEFAULT N'Active',

        StartDate DATETIME2(0) NULL,

        EndDate DATETIME2(0) NULL,

        CreatedAt DATETIME2(0) NOT NULL
            CONSTRAINT DF_Banners_CreatedAt
            DEFAULT SYSUTCDATETIME(),

        UpdatedAt DATETIME2(0) NOT NULL
            CONSTRAINT DF_Banners_UpdatedAt
            DEFAULT SYSUTCDATETIME(),

        -- =============================================
        -- FOREIGN KEY
        -- =============================================

        CONSTRAINT FK_Banners_Shops
            FOREIGN KEY (ShopID)
            REFERENCES dbo.Shops(ShopID),

        -- =============================================
        -- STATUS VALIDATION
        -- =============================================

        CONSTRAINT CK_Banners_Status
            CHECK (
                Status IN (
                    N'Active',
                    N'Inactive'
                )
            )
    );

    -- =============================================
    -- INDEXES
    -- =============================================

    CREATE INDEX IX_Banners_ShopID
        ON dbo.Banners(ShopID);

    CREATE INDEX IX_Banners_Status
        ON dbo.Banners(Status);

    CREATE INDEX IX_Banners_DisplayOrder
        ON dbo.Banners(DisplayOrder);

END
GO

-- =====================================================
-- SHOP PORTFOLIO (tenant scoped)
-- =====================================================

IF OBJECT_ID(N'dbo.ShopPortfolio', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ShopPortfolio
    (
        PortfolioID INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ShopPortfolio PRIMARY KEY,
        ShopID INT NOT NULL,
        Title NVARCHAR(200) NOT NULL,
        Category NVARCHAR(160) NULL,
        Description NVARCHAR(MAX) NULL,
        ImageURL NVARCHAR(1000) NULL,
        ImageURLs NVARCHAR(MAX) NULL,
        VideoURL NVARCHAR(1000) NULL,
        ClientName NVARCHAR(200) NULL,
        Location NVARCHAR(200) NULL,
        ProjectDate DATE NULL,
        DisplayOrder INT NOT NULL CONSTRAINT DF_ShopPortfolio_DisplayOrder DEFAULT 0,
        Status NVARCHAR(20) NOT NULL CONSTRAINT DF_ShopPortfolio_Status DEFAULT N'Active',
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_ShopPortfolio_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_ShopPortfolio_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_ShopPortfolio_Shops FOREIGN KEY (ShopID) REFERENCES dbo.Shops(ShopID),
        CONSTRAINT CK_ShopPortfolio_Status CHECK (Status IN (N'Active', N'Inactive'))
    );
    CREATE INDEX IX_ShopPortfolio_Shop_Status_Order ON dbo.ShopPortfolio(ShopID, Status, DisplayOrder, PortfolioID DESC);
END
GO

IF COL_LENGTH(N'dbo.ShopPortfolio', N'ImageURLs') IS NULL
BEGIN
    ALTER TABLE dbo.ShopPortfolio ADD ImageURLs NVARCHAR(MAX) NULL;
END
GO

IF COL_LENGTH(N'dbo.Banners', N'VideoURL') IS NULL
BEGIN
    ALTER TABLE dbo.Banners ADD VideoURL NVARCHAR(1000) NULL;
END
GO

IF COL_LENGTH(N'dbo.Banners', N'ImageURLs') IS NULL
BEGIN
    ALTER TABLE dbo.Banners ADD ImageURLs NVARCHAR(MAX) NULL;
END
GO


USE db_ac42f8_saitix;
GO

IF OBJECT_ID(N'dbo.Coupons', N'U') IS NULL
BEGIN

    CREATE TABLE dbo.Coupons
    (
        CouponID INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_Coupons PRIMARY KEY,

        ShopID INT NOT NULL,

        CouponCode NVARCHAR(100) NOT NULL,

        Description NVARCHAR(500) NULL,

        DiscountType NVARCHAR(20) NOT NULL,

        DiscountValue DECIMAL(12,2) NOT NULL,

        MinimumOrderAmount DECIMAL(12,2) NULL,

        MaximumDiscountAmount DECIMAL(12,2) NULL,

        UsageLimit INT NULL,

        UsedCount INT NOT NULL
            CONSTRAINT DF_Coupons_UsedCount DEFAULT 0,

        StartDate DATETIME2(0) NULL,

        EndDate DATETIME2(0) NULL,

        Status NVARCHAR(20) NOT NULL
            CONSTRAINT DF_Coupons_Status DEFAULT N'Active',

        CreatedAt DATETIME2(0) NOT NULL
            CONSTRAINT DF_Coupons_CreatedAt
            DEFAULT SYSUTCDATETIME(),

        UpdatedAt DATETIME2(0) NOT NULL
            CONSTRAINT DF_Coupons_UpdatedAt
            DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_Coupons_Shops
            FOREIGN KEY (ShopID)
            REFERENCES dbo.Shops(ShopID),

        CONSTRAINT CK_Coupons_DiscountType
            CHECK (
                DiscountType IN (
                    N'Percentage',
                    N'Fixed'
                )
            ),

        CONSTRAINT CK_Coupons_DiscountValue
            CHECK (
                DiscountValue >= 0
            ),

        CONSTRAINT CK_Coupons_UsedCount
            CHECK (
                UsedCount >= 0
            ),

        CONSTRAINT CK_Coupons_Status
            CHECK (
                Status IN (
                    N'Active',
                    N'Inactive'
                )
            )
    );

    CREATE INDEX IX_Coupons_ShopID
        ON dbo.Coupons(ShopID);

    CREATE INDEX IX_Coupons_CouponCode
        ON dbo.Coupons(CouponCode);

    CREATE INDEX IX_Coupons_Status
        ON dbo.Coupons(Status);

    CREATE INDEX IX_Coupons_StartDate_EndDate
        ON dbo.Coupons(StartDate, EndDate);

END
GO
