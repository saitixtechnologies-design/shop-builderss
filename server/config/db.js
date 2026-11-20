import sql from "mssql";

// =====================================================
// DATABASE CONFIGURATION
// Uses mssql's built-in pure-JavaScript driver (tedious), so the API runs the same on
// Windows, Linux (Render) and macOS without an ODBC driver. Settings come from .env.
// =====================================================

const yes = (value) => /^(yes|true|1)$/i.test(String(value ?? "").trim());

const dbConfig = {
    server: process.env.DB_SERVER || "",
    database: process.env.DB_DATABASE || "",
    user: process.env.DB_USER || "",
    password: process.env.DB_PASSWORD || "",
    port: Number(process.env.DB_PORT || 1433),
    options: {
        encrypt: yes(process.env.DB_ENCRYPT ?? "yes"),
        // Only "yes" for hosts with a self-signed certificate; it skips the certificate check.
        trustServerCertificate: yes(process.env.DB_TRUST_CERTIFICATE)
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    connectionTimeout: 20000,
    requestTimeout: 30000
};

// =====================================================
// DATABASE POOL
// The controllers use the mssql request and transaction APIs on this pool.
// =====================================================

let pool = null;
let connected = false;

// =====================================================
// CONNECT DATABASE
// =====================================================

export const connectDB = async () => {
    try {
        if (!dbConfig.server || !dbConfig.database) {
            throw new Error("DB_SERVER and DB_DATABASE must be set in server/.env");
        }

        console.log("🔄 Connecting to SQL Server...");
        console.log(`🖥️ Server: ${dbConfig.server}`);
        console.log(`📦 Database: ${dbConfig.database}`);

        const connectionPool = new sql.ConnectionPool(dbConfig);

        // A dropped connection is logged; the pool reconnects on the next request.
        connectionPool.on("error", (error) => {
            console.error("⚠️ SQL Server pool error:", error.message);
        });

        await connectionPool.connect();

        const result = await connectionPool
            .request()
            .query("SELECT DB_NAME() AS DatabaseName");

        console.log("✅ SQL Server connected successfully");
        console.log(`📦 Database: ${result.recordset?.[0]?.DatabaseName || dbConfig.database}`);

        pool = connectionPool;
        connected = true;

        return pool;

    } catch (error) {
        connected = false;
        pool = null;

        console.error("❌ Database connection failed:");
        console.error(error.message);

        throw error;
    }
};

// =====================================================
// GET DATABASE
// =====================================================

export const getDB = () => {
    if (!connected || !pool) {
        throw new Error("Database is not connected");
    }

    return pool;
};
