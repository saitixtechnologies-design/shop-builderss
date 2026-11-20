USE db_ac42f8_saitix;
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
