import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

dotenv.config({
    path: fileURLToPath(new URL("./.env", import.meta.url))
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        console.log("🔄 Starting Shop Builder Server...");

        // Import after dotenv so the database module sees this server's settings.
        const [{ default: app }, { connectDB }] = await Promise.all([
            import("./app.js"),
            import("./config/db.js")
        ]);

        // Keep the API available while SQL Server is temporarily unavailable.
        const server = app.listen(PORT, "0.0.0.0", () => {
            console.log(
                `🚀 Shop Builder API running on http://localhost:${PORT}`
            );
        });

        const connectDatabase = async () => {
            try {
                await connectDB();
                return true;
            } catch {
                return false;
            }
        };

        if (!(await connectDatabase())) {
            console.error(
                "⚠️ API is online, but SQL Server is unavailable. Retrying every 15 seconds..."
            );

            const retryTimer = setInterval(async () => {
                if (await connectDatabase()) {
                    clearInterval(retryTimer);
                    console.log("✅ Database connection restored");
                }
            }, 15000);
        }

        // Server error handling
        server.on("error", (error) => {
            console.error("❌ HTTP Server Error:");
            console.error(error);
        });

        // Server close handling
        server.on("close", () => {
            console.log("⚠️ HTTP Server Closed");
        });

    } catch (error) {
        console.error("❌ Server failed to start");
        console.error(error);
        process.exit(1);
    }
};

startServer();
