// "npm run build": writes env.js from SHOP_API_URL / PLATFORM_DOMAIN.
// Vercel runs it automatically; for Hostinger (static upload) run it on your computer first.
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readStorefrontEnv, renderEnvScript } from "./storefront-env.js";

const target = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "env.js");
const env = readStorefrontEnv();
writeFileSync(target, renderEnvScript(env));

console.log("Wrote env.js");
console.log(`  API address:     ${env.apiUrl || "(same address as the storefront)"}`);
console.log(`  Platform domain: ${env.platformDomain || "(free subdomains off)"}`);
