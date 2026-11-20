// Checks the database connection with the settings in server/.env (read-only).
// Run from the server folder:  npm run check:db
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

const { connectDB } = await import("../config/db.js");

try {
    const pool = await connectDB();
    const result = await pool.request().query("SELECT COUNT(*) AS Shops FROM dbo.Shops");
    console.log(`✅ Connection works. Shops in database: ${result.recordset[0].Shops}`);
    await pool.close();
    process.exit(0);
} catch {
    console.error("❌ Connection failed. Check DB_SERVER, DB_DATABASE, DB_USER, DB_PASSWORD in .env");
    process.exit(1);
}
