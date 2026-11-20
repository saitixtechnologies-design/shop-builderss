USE [db_ac42f8_saitix];
GO

/* =========================================================
   PASSWORD RESET OTP TABLE
   Gmail / Email OTP only
   ========================================================= */

IF OBJECT_ID(N'dbo.PasswordResetOTPs', N'U') IS NULL
BEGIN

    CREATE TABLE dbo.PasswordResetOTPs
    (
        OTPID INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_PasswordResetOTPs PRIMARY KEY,

        UserID INT NOT NULL,

        OTPHash NVARCHAR(255) NOT NULL,

        Purpose NVARCHAR(50) NOT NULL
            CONSTRAINT DF_PasswordResetOTPs_Purpose
            DEFAULT N'FORGOT_PASSWORD',

        DeliveryMethod NVARCHAR(20) NOT NULL
            CONSTRAINT DF_PasswordResetOTPs_DeliveryMethod
            DEFAULT N'EMAIL',

        Destination NVARCHAR(255) NOT NULL,

        ExpiresAt DATETIME2(0) NOT NULL,

        AttemptCount INT NOT NULL
            CONSTRAINT DF_PasswordResetOTPs_AttemptCount
            DEFAULT 0,

        VerifiedAt DATETIME2(0) NULL,

        UsedAt DATETIME2(0) NULL,

        CreatedAt DATETIME2(0) NOT NULL
            CONSTRAINT DF_PasswordResetOTPs_CreatedAt
            DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_PasswordResetOTPs_Users
            FOREIGN KEY (UserID)
            REFERENCES dbo.Users(UserID)
    );

    CREATE INDEX IX_PasswordResetOTPs_UserID
        ON dbo.PasswordResetOTPs(UserID);

    CREATE INDEX IX_PasswordResetOTPs_ExpiresAt
        ON dbo.PasswordResetOTPs(ExpiresAt);

    CREATE INDEX IX_PasswordResetOTPs_Destination
        ON dbo.PasswordResetOTPs(Destination);

END
GO


/* =========================================================
   OPTIONAL CLEANUP INDEX
   Prevent excessive old OTP records from becoming a problem
   ========================================================= */

IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_PasswordResetOTPs_UserID_CreatedAt'
      AND object_id = OBJECT_ID(N'dbo.PasswordResetOTPs')
)
BEGIN

    CREATE INDEX IX_PasswordResetOTPs_UserID_CreatedAt
        ON dbo.PasswordResetOTPs(UserID, CreatedAt DESC);

END
GO