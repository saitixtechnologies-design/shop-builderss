import sql from "msnodesqlv8";

const connectionString =
    "Driver={ODBC Driver 18 for SQL Server};" +
    "Server=(localdb)\\MSSQLLocalDB;" +
    "Database=ShopBuilderDB;" +
    "Trusted_Connection=Yes;" +
    "TrustServerCertificate=Yes;" +
    "Encrypt=No;";

console.log("🔄 Testing direct msnodesqlv8 connection...");

sql.query(
    connectionString,
    "SELECT DB_NAME() AS DatabaseName, COUNT(*) AS ProductCount FROM dbo.Products",
    (error, rows) => {
        if (error) {
            console.error("❌ DIRECT DB TEST FAILED:");
            console.error(error);
            process.exit(1);
        }

        console.log("=================================");
        console.log("✅ DIRECT DB CONNECTION SUCCESS");
        console.log(rows);
        console.log("=================================");

        process.exit(0);
    }
);