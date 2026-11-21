// "npm run build" for the API. There is nothing to compile, so this checks that the whole app
// (every route and controller) loads, without starting the server or connecting to the database.
// A deploy then fails here, with a clear message, instead of crashing after it goes live.
const started = Date.now();

try {
    const { default: app } = await import("../app.js");
    if (typeof app !== "function") throw new Error("app.js did not export the Express app");
    console.log(`API build check passed in ${Date.now() - started} ms (Node ${process.version}).`);
    process.exit(0);
} catch (error) {
    console.error("API build check failed:", error.message);
    process.exit(1);
}
