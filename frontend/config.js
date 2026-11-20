// Storefront settings. Change the two values below when you deploy (see DOMAINS.md).
//
// PRODUCTION_API_ORIGIN  your live API address, e.g. "https://shop-builder-api.onrender.com".
//                        Leave empty only if the API is served from the same address as this storefront.
// PLATFORM_DOMAIN        your main domain, e.g. "shopbuilder.in". Every shop then also opens on
//                        <shop-slug>.shopbuilder.in. Leave empty if you don't use free subdomains.
const PRODUCTION_API_ORIGIN = "";
const PLATFORM_DOMAIN = "";

(() => {
  const host = location.hostname.toLowerCase();
  // On your computer: localhost, or <shop-slug>.localhost to try the subdomain address.
  const isLocal = ["localhost", "127.0.0.1"].includes(host) || host.endsWith(".localhost");
  const apiOrigin = isLocal
    ? `${location.protocol}//localhost:5001`
    : (PRODUCTION_API_ORIGIN || location.origin).replace(/\/+$/, "");
  window.SHOP_API_BASE = `${apiOrigin}/api/public/shops`;
  window.SHOP_PLATFORM_DOMAIN = isLocal ? "localhost" : PLATFORM_DOMAIN.trim().toLowerCase();
})();
