// Where the public storefront finds the Shop Builder API.
// - On your computer (localhost) it uses the API on port 5001.
// - When deployed, put your live API address below, e.g. "https://shop-builder-api.onrender.com".
//   Leave it empty only if the API is served from the same address as this storefront.
const PRODUCTION_API_ORIGIN = "";

(() => {
  const isLocal = ["localhost", "127.0.0.1"].includes(location.hostname);
  const origin = isLocal
    ? `${location.protocol}//${location.hostname}:5001`
    : (PRODUCTION_API_ORIGIN || location.origin).replace(/\/+$/, "");
  window.SHOP_API_BASE = `${origin}/api/public/shops`;
})();
