// Works out the API address and platform domain for the page. Nothing to edit here:
// the values come from env.js, which is generated from the storefront's environment settings
// (frontend/.env or the hosting panel — see frontend/.env.example).
(() => {
  const env = window.SHOP_ENV || {};
  const host = location.hostname.toLowerCase();
  // On your computer: localhost, or <shop-slug>.localhost to try a free subdomain address.
  const isLocal = ["localhost", "127.0.0.1"].includes(host) || host.endsWith(".localhost");
  const apiOrigin = isLocal && !env.API_URL
    ? `${location.protocol}//localhost:5001`
    : String(env.API_URL || location.origin).replace(/\/+$/, "");
  window.SHOP_API_BASE = `${apiOrigin}/api/public/shops`;
  window.SHOP_PLATFORM_DOMAIN = isLocal ? "localhost" : String(env.PLATFORM_DOMAIN || "").toLowerCase();
})();
