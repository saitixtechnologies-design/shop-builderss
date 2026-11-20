import sql from "mssql/msnodesqlv8.js";

// =====================================================
// DATABASE CONFIGURATION
// =====================================================

const dbServer =
    process.env.DB_SERVER || "SQL5080.site4now.net";

const dbName =
    process.env.DB_DATABASE || "db_ac42f8_saitix";

const dbDriver =
    process.env.DB_DRIVER || "ODBC Driver 18 for SQL Server";

const dbUser =
    process.env.DB_USER || "";

const dbPassword =
    process.env.DB_PASSWORD || "";

const dbEncrypt =
    process.env.DB_ENCRYPT || "Yes";

const dbTrustCertificate =
    process.env.DB_TRUST_CERTIFICATE || "Yes";

// =====================================================
// CONNECTION STRING
// =====================================================

const connectionString = [
    `Driver={${dbDriver}}`,
    `Server=${dbServer}`,
    `Database=${dbName}`,
    `UID=${dbUser}`,
    `PWD=${dbPassword}`,
    `Encrypt=${dbEncrypt}`,
    `TrustServerCertificate=${dbTrustCertificate}`,
].join(";") + ";";

// =====================================================
// DATABASE POOL
// The controllers use the mssql request and transaction APIs, so this must
// be an actual mssql ConnectionPool (not a query-only wrapper).
// =====================================================

let pool = null;
let connected = false;

// =====================================================
// CONNECT DATABASE
// =====================================================

export const connectDB = async () => {
    try {
        console.log(
            "🔄 Connecting to SQL Server..."
        );

        console.log(
            `🖥️ Server: ${dbServer}`
        );

        console.log(
            `📦 Database: ${dbName}`
        );

        // Don't print password

        const connectionPool = new sql.ConnectionPool({
            connectionString
        });

        await connectionPool.connect();

        const result = await connectionPool
            .request()
            .query("SELECT DB_NAME() AS DatabaseName");

        console.log(
            "✅ SQL Server connected successfully"
        );

        console.log(
            `📦 Database: ${
                result.recordset?.[0]?.DatabaseName ||
                dbName
            }`
        );

        pool = connectionPool;
        connected = true;

        return pool;

    } catch (error) {
        connected = false;
        pool = null;

        console.error(
            "❌ Database connection failed:"
        );

        console.error(
            error.message
        );

        throw error;
    }
};

// =====================================================
// GET DATABASE
// =====================================================

export const getDB = () => {
    if (!connected || !pool) {
        throw new Error(
            "Database is not connected"
        );
    }

    return pool;
};
