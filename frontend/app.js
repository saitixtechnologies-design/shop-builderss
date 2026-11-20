const API_BASE = window.SHOP_API_BASE || "http://localhost:5001/api/public/shops";
const routeSegments = location.pathname.split("/").filter(Boolean).map((segment) => {
  try { return decodeURIComponent(segment); } catch { return segment; }
});
const state = {
  slug: routeSegments[0] === "shop" ? (routeSegments[1] || "") : (routeSegments.at(-1) || ""),
  route: routeSegments[0] === "shop" ? routeSegments.slice(2) : [],
  shop: null,
  settings: {},
  categories: [],
  products: [],
  brands: [],
  coupons: [],
  services: [],
  banners: [],
  portfolio: [],
  pages: [],
  cart: [],
  activeCategory: new URLSearchParams(location.search).get("category") || "all",
  query: new URLSearchParams(location.search).get("q") || "",
  cartOpen: false,
  mobileMenuOpen: false,
  moreMenuOpen: false,
  checkoutOpen: false,
  submitting: false,
  appliedCoupon: null,
  couponCode: "",
  couponMessage: ""
};
const isPreview = new URLSearchParams(location.search).get("preview") === "1";

const normalizeWhatsAppNumber = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (/^[6-9]\d{9}$/.test(digits)) return `91${digits}`;
  if (/^0[6-9]\d{9}$/.test(digits)) return `91${digits.slice(1)}`;
  return digits;
};

const app = document.querySelector("#app");
function syncServiceHomeHeader() {
  const editorialPages = ["service-home-main", "portfolio-gallery-page", "banner-gallery-page"];
  const header = [...app.querySelectorAll(".site-header")].find((element) => editorialPages.some((pageClass) => element.nextElementSibling?.classList.contains(pageClass)));
  header?.classList.toggle("is-scrolled", window.scrollY > 48);
}
window.addEventListener("scroll", syncServiceHomeHeader, { passive: true });
document.addEventListener("error", (event) => {
  const image = event.target;
  if (!(image instanceof HTMLImageElement) || !image.isConnected || image.dataset.fallbackApplied) return;
  image.dataset.fallbackApplied = "true";
  const placeholder = document.createElement("span");
  placeholder.className = "media-unavailable";
  placeholder.setAttribute("aria-label", "Uploaded image could not be loaded");
  placeholder.innerHTML = icon("bag", 22);
  image.replaceWith(placeholder);
}, true);
const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value) || 0);
const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const slugTitle = (value) => value.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const safeUrl = (value, fallback = "") => {
  if (!value) return fallback;
  try {
    const source = String(value).trim();
    const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(source);
    const isProtocolRelative = source.startsWith("//");
    const isBareDomain = /^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\:\d+)?(?:\/|[?#]|$)/i.test(source);
    const internalPath = source.startsWith("/shop/")
      ? source
      : `${shopHomeUrl()}/${source.replace(/^\/+/, "")}`;
    const url = new URL(hasScheme || isProtocolRelative ? source : isBareDomain ? `https://${source}` : internalPath, location.origin);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol) ? escapeHTML(url.href) : fallback;
  } catch { return fallback; }
};
const safeImage = (value, fallback = "") => {
  if (!value) return fallback;
  const source = String(value).trim().replace(/\\/g, "/");
  const apiOrigin = new URL(API_BASE).origin;
  if (/^(?:\/?uploads\/)/i.test(source)) return `${apiOrigin}/${source.replace(/^\/+/, "")}`;
  if (/^localhost:\d+\/uploads\//i.test(source)) return `http://${source}`;
  if (/^https?:\/\/localhost:\d+\/uploads\//i.test(source)) return escapeHTML(source);
  if (/^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\:\d+)?(?:\/|[?#]|$)/i.test(source)) return safeUrl(`https://${source}`, fallback);
  if (/^[a-z0-9_-]+\/[^?#]+\.(?:avif|gif|jpe?g|png|webp)(?:[?#].*)?$/i.test(source)) return `${apiOrigin}/uploads/${source}`;
  if (/\s/.test(source) && !/^https?:\/\//i.test(source)) return fallback;
  return safeUrl(source, fallback);
};
const getProductSizes = (product) => {
  const raw = product?.SizesJson ?? product?.sizesJson ?? product?.Sizes ?? [];
  try {
    const parsed = Array.isArray(raw) ? raw : JSON.parse(raw || "[]");
    return [...new Set((Array.isArray(parsed) ? parsed : []).map((size) => String(size).trim()).filter(Boolean))];
  } catch { return []; }
};
const productSearchText = (product) => `${product.ProductName || ""} ${product.BrandName || ""} ${product.CategoryName || ""} ${product.ShortDescription || ""} ${product.Description || ""} ${product.Tags || ""}`.toLowerCase();
const renderSizeSelector = (sizes, id) => sizes.length ? `<label class="product-size-field" for="${id}">Choose size <span>required</span><select id="${id}" data-product-size required><option value="">Select a size</option>${sizes.map((size) => `<option value="${escapeHTML(size)}">${escapeHTML(size)}</option>`).join("")}</select></label>` : "";
const parseMediaImages = (raw, fallback = "") => {
  let images = [];
  try { images = Array.isArray(raw) ? raw : typeof raw === "string" ? JSON.parse(raw) : []; } catch { images = []; }
  const unique = [...new Set((Array.isArray(images) ? images : []).filter((image) => typeof image === "string" && image.trim()).map((image) => image.trim()))].slice(0, 10);
  if (!unique.length && fallback) unique.push(fallback);
  return unique;
};
const imageMarkup = (value, alt = "", className = "") => {
  const src = safeImage(value);
  return src
    ? `<img${className ? ` class="${escapeHTML(className)}"` : ""} src="${src}" alt="${escapeHTML(alt)}" loading="lazy" decoding="async">`
    : `<span class="media-unavailable" aria-label="Image not provided">${icon("bag", 22)}</span>`;
};
const safeCssImage = (value) => safeImage(value, "").replace(/[\s'"()\\]/g, (char) => `%${char.charCodeAt(0).toString(16)}`);
const getCartKey = () => `shop-cart:${isPreview ? "preview-" : ""}${state.slug}`;
const shopHomeUrl = () => `/shop/${encodeURIComponent(state.shop?.ShopSlug || state.slug)}`;
const isEcommerceShop = () => String(state.shop?.ShopType || "Ecommerce").toLowerCase() === "ecommerce";

function pageUrl(page, index = 0) {
  const slug = encodeURIComponent(page.Slug || "");
  const type = String(page.PageType || "custom").toLowerCase();
  const firstTypePage = state.pages.findIndex((entry) => String(entry.PageType || "custom").toLowerCase() === type) === index;
  if (["about", "services", "gallery", "contact"].includes(type) && firstTypePage) {
    return `${shopHomeUrl()}/${type}`;
  }
  return `${shopHomeUrl()}/page/${slug}`;
}

function sanitizePublicHtml(value) {
  if (!value) return "";
  const parsed = new DOMParser().parseFromString(String(value), "text/html");
  const allowed = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "p", "div", "span", "br", "hr", "strong", "b", "em", "i", "u", "s", "blockquote", "ul", "ol", "li", "a", "img", "figure", "figcaption", "table", "thead", "tbody", "tfoot", "tr", "th", "td"]);
  const blocked = new Set(["script", "style", "iframe", "object", "embed", "svg", "math", "form", "input", "button", "video", "audio", "link", "meta"]);
  const voidTags = new Set(["br", "hr", "img"]);

  const serialize = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return escapeHTML(node.nodeValue || "");
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const tag = node.tagName.toLowerCase();
    if (blocked.has(tag)) return "";
    const children = [...node.childNodes].map(serialize).join("");
    if (!allowed.has(tag)) return children;

    const attrs = [];
    if (tag === "a") {
      const rawHref = String(node.getAttribute("href") || "").trim();
      const isFragment = rawHref.startsWith("#");
      const isExternalUrl = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(rawHref);
      const isInternalPath = Boolean(rawHref) && !isFragment && !isExternalUrl;
      const href = isInternalPath
        ? safeUrl(rawHref)
        : isFragment ? `#${encodeURIComponent(rawHref.slice(1))}` : safeUrl(rawHref);
      if (href) attrs.push(`href="${href}"`, 'rel="noopener noreferrer"');
      if (node.getAttribute("target") === "_blank") attrs.push('target="_blank"');
    }
    if (tag === "img") {
      const src = safeImage(node.getAttribute("src"), "");
      if (!src) return "";
      attrs.push(`src="${src}"`, `alt="${escapeHTML(node.getAttribute("alt") || "")}"`, 'loading="lazy"', 'decoding="async"');
    }
    if (tag === "th" || tag === "td") {
      for (const name of ["colspan", "rowspan"]) {
        const number = Number(node.getAttribute(name));
        if (Number.isInteger(number) && number >= 1 && number <= 20) attrs.push(`${name}="${number}"`);
      }
    }
    const textAlign = node.style?.textAlign;
    if (["left", "center", "right", "justify"].includes(textAlign)) attrs.push(`style="text-align:${textAlign}"`);
    const classes = String(node.className || "").split(/\s+/).filter((name) => /^(ql-align-(center|right|justify)|ql-size-(small|large|huge)|ql-indent-[1-8])$/.test(name));
    if (classes.length) attrs.push(`class="${escapeHTML(classes.join(" "))}"`);
    return voidTags.has(tag) ? `<${tag}${attrs.length ? ` ${attrs.join(" ")}` : ""}>` : `<${tag}${attrs.length ? ` ${attrs.join(" ")}` : ""}>${children}</${tag}>`;
  };

  return [...parsed.body.childNodes].map(serialize).join("");
}

function resolveRoute() {
  if (!state.route.length) return { kind: "home" };
  const [section, routeSlug] = state.route;
  if (String(section).toLowerCase() === "banners") {
    return { kind: "page", page: { PageName: "Banners", PageTitle: "Banners", PageType: "banners", HtmlContent: "" } };
  }
  if (["offers", "coupons"].includes(String(section).toLowerCase())) {
    return { kind: "page", page: { PageName: "Offers", PageTitle: "Offers", PageType: "offers", HtmlContent: "" } };
  }
  if (String(section).toLowerCase() === "portfolio") {
    return { kind: "page", page: { PageName: "Portfolio", PageTitle: "Portfolio", PageType: "portfolio", HtmlContent: "" } };
  }
  if (section === "product") {
    const product = state.products.find((entry) => String(entry.Slug || entry.ProductID || "").toLowerCase() === String(routeSlug || "").toLowerCase());
    return product ? { kind: "product", product } : { kind: "not-found" };
  }

  const requestedSlug = section === "page" ? routeSlug : section;
  let page = state.pages.find((entry) => String(entry.Slug || "").toLowerCase() === String(requestedSlug || "").toLowerCase());
  if (!page && section !== "page") {
    page = state.pages.find((entry) => String(entry.PageType || "").toLowerCase() === section.toLowerCase());
  }
  if (page) return { kind: "page", page };

  const builtIn = String(section).toLowerCase();
  if (["about", "services", "gallery", "contact", "banners", "portfolio"].includes(builtIn) && section !== "page") {
    const generatedContent = builtIn === "about" ? state.settings.AboutUs : "";
    return { kind: "page", page: { PageName: slugTitle(builtIn), PageTitle: slugTitle(builtIn), PageType: builtIn, HtmlContent: generatedContent || "" } };
  }
  return { kind: "not-found" };
}

function icon(name, size = 20) {
  const common = `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`;
  const paths = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    bag: '<path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>',
    arrow: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    x: '<path d="m18 6-12 12M6 6l12 12"/>',
    pin: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    heart: '<path d="M20.8 8.8c0 5.2-8.8 10-8.8 10s-8.8-4.8-8.8-10a4.7 4.7 0 0 1 8.8-2.3 4.7 4.7 0 0 1 8.8 2.3Z"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.5 2.8a2 2 0 0 1-.6 1.8L7.7 9.6a16 16 0 0 0 6.7 6.7l1.3-1.3a2 2 0 0 1 1.8-.6l2.8.5a2 2 0 0 1 1.7 2Z"/>'
  };
  return `<svg ${common}>${paths[name] || paths.arrow}</svg>`;
}

function storeCart() {
  localStorage.setItem(getCartKey(), JSON.stringify(state.cart));
}

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(getCartKey()) || "[]");
    state.cart = (Array.isArray(saved) ? saved : []).map((item) => {
      const productID = Number(typeof item === "object" && item !== null
        ? item.productID ?? item.productId ?? item.ProductID ?? item.id ?? item.product?.ProductID
        : item);
      const quantity = Math.max(1, Number(item?.quantity ?? item?.Quantity ?? 1) || 1);
      return { productID, size: String(item?.size || item?.Size || "").trim(), quantity };
    }).filter((item) => Number.isInteger(item.productID) && item.productID > 0);
    storeCart();
  }
  catch { state.cart = []; }
}

function currentCartItems() {
  return state.cart.map((item) => {
    const product = state.products.find((entry) => Number(entry.ProductID) === Number(item.productID));
    return product ? { ...product, size: item.size || "", quantity: item.quantity } : null;
  }).filter(Boolean);
}

function cartCount() {
  return state.cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

function cartSubtotal() {
  return currentCartItems().reduce((sum, item) => sum + Number(item.SellingPrice || 0) * item.quantity, 0);
}

function couponDiscount(coupon, subtotal = cartSubtotal()) {
  if (!coupon) return 0;
  const minimum = Number(coupon.MinimumOrderAmount || 0);
  if (subtotal < minimum) return 0;
  let discount = String(coupon.DiscountType || "").toLowerCase() === "percentage"
    ? subtotal * Number(coupon.DiscountValue || 0) / 100
    : Number(coupon.DiscountValue || 0);
  if (Number(coupon.MaximumDiscountAmount) > 0) discount = Math.min(discount, Number(coupon.MaximumDiscountAmount));
  return Math.max(0, Math.min(subtotal, Math.round(discount * 100) / 100));
}

function getCouponIssue(coupon, subtotal = cartSubtotal()) {
  const now = Date.now();
  const starts = coupon?.StartsAt ? new Date(coupon.StartsAt).getTime() : null;
  const expires = coupon?.ExpiresAt ? new Date(coupon.ExpiresAt).getTime() : null;
  if (!coupon) return "We couldn’t find that code. Check it and try again.";
  if (starts && Number.isFinite(starts) && starts > now) return "This offer hasn’t started yet.";
  if (expires && Number.isFinite(expires) && expires < now) return "This offer has expired.";
  if (Number(coupon.UsageLimit) > 0 && Number(coupon.UsedCount || 0) >= Number(coupon.UsageLimit)) return "This offer has reached its redemption limit.";
  if (subtotal < Number(coupon.MinimumOrderAmount || 0)) return `Add ${money(Number(coupon.MinimumOrderAmount) - subtotal)} more to use this code.`;
  return "";
}

function applyCheckoutCoupon() {
  const input = document.querySelector("#checkout-coupon-code");
  const code = String(input?.value || "").trim().toUpperCase();
  if (!code) { state.appliedCoupon = null; state.couponMessage = "Enter an offer code to apply it."; render(); return; }
  const coupon = state.coupons.find((item) => String(item.CouponCode || "").trim().toUpperCase() === code);
  const issue = getCouponIssue(coupon);
  if (issue) { state.appliedCoupon = null; state.couponMessage = issue; render(); return; }
  state.appliedCoupon = coupon;
  state.couponMessage = `${code} applied successfully`;
  render();
}

function setTheme() {
  const root = document.documentElement;
  const isHex = (value) => /^#[0-9a-fA-F]{6}$/.test(String(value || ""));
  const primary = state.settings?.PrimaryColor || state.shop?.PrimaryColor;
  const secondary = state.settings?.SecondaryColor || state.shop?.SecondaryColor;
  const brand = isHex(primary) ? primary : "#193b35";
  const accent = isHex(secondary) ? secondary : "#d49b60";
  const channels = brand.slice(1).match(/.{2}/g).map((part) => parseInt(part, 16) / 255);
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  root.style.setProperty("--store-brand", brand);
  root.style.setProperty("--store-ink", luminance > 0.28 ? "#29231f" : brand);
  root.style.setProperty("--store-on-primary", luminance > 0.42 ? "#29231f" : "#fffdfa");
  root.style.setProperty("--store-accent", accent);
}

function hydrateShopData(data) {
  Object.assign(state, data);
  state.services = (Array.isArray(data.services) ? data.services : []).map((service) => {
    const images = parseMediaImages(service.ImageURLs, service.ImageURL);
    return { ...service, Images: images, ImageURL: service.ImageURL || images[0] || "" };
  });
  state.banners = (Array.isArray(data.banners) ? data.banners : []).map((banner) => {
    const images = parseMediaImages(banner.ImageURLs, banner.ImageURL);
    return { ...banner, Images: images, ImageURL: banner.ImageURL || images[0] || "" };
  });
  state.products = (Array.isArray(data.products) ? data.products : []).map((product) => {
    let images = [];
    try { images = typeof product.ImagesJson === "string" ? JSON.parse(product.ImagesJson) : []; } catch { images = []; }
    const orderedImages = Array.isArray(images) ? images : [];
    return { ...product, Images: orderedImages, ImageURL: product.ImageURL || orderedImages.find((image) => image.IsPrimary)?.ImageURL || orderedImages[0]?.ImageURL || "" };
  });
  state.brands = Array.isArray(data.brands) ? data.brands : [];
  state.coupons = Array.isArray(data.coupons) ? data.coupons : [];
  state.portfolio = (Array.isArray(data.portfolio) ? data.portfolio : []).map((item) => {
    const images = parseMediaImages(item.ImageURLs, item.ImageURL);
    return { ...item, Images: images, ImageURL: item.ImageURL || images[0] || "" };
  });
  const rawSettings = data.settings || {};
  state.settings = {
    ...rawSettings,
    Latitude: rawSettings.Latitude ?? rawSettings.latitude ?? rawSettings.Lat ?? rawSettings.lat ?? "",
    Longitude: rawSettings.Longitude ?? rawSettings.longitude ?? rawSettings.Long ?? rawSettings.lng ?? rawSettings.Lng ?? "",
    MapURL: rawSettings.MapURL ?? rawSettings.mapURL ?? rawSettings.mapUrl ?? "",
    ShowMap: rawSettings.ShowMap ?? rawSettings.showMap ?? true
  };
  state.pages = Array.isArray(data.pages) ? data.pages : [];
}
async function loadShop() {
  if (!state.slug || state.slug === "shop") {
    renderNotFound("Open your shop using its public link: /shop/your-shop-slug");
    return;
  }
  if (isPreview) {
    Object.assign(state, {
      shop: { ShopID: 0, ShopName: "Sunday Supply", ShopSlug: "sunday-supply", ShopType: "Ecommerce", Phone: "+919876543210" },
      settings: { Tagline: "Little things, lovely days", City: "JAIPUR, INDIA", AboutUs: "A neighbourhood favourite for thoughtful little finds. We believe the best things are the ones that make an ordinary day feel a little more special.", Address: "12, Rose Garden Road", OpeningTime: "10:00 AM", ClosingTime: "8:00 PM", WhatsAppNumber: "+919876543210", PrimaryColor: "#801441", SecondaryColor: "#c59657" },
      categories: [{ CategoryID: 1, CategoryName: "Everyday objects" }, { CategoryID: 2, CategoryName: "Wear it well" }, { CategoryID: 3, CategoryName: "Little rituals" }],
      products: [
        { ProductID: 1, CategoryID: 1, CategoryName: "Everyday objects", ProductName: "The Sunday tote", ShortDescription: "Your new everyday carry-all", SellingPrice: 890, MRP: 1190, StockQuantity: 14, ImageURL: "" },
        { ProductID: 2, CategoryID: 3, CategoryName: "Little rituals", ProductName: "Slow morning candle", ShortDescription: "Hand-poured, soft sandalwood", SellingPrice: 640, MRP: 0, StockQuantity: 9, ImageURL: "" },
        { ProductID: 3, CategoryID: 2, CategoryName: "Wear it well", ProductName: "Everywhere linen shirt", ShortDescription: "Easy, breathable, made for repeats", SellingPrice: 1590, MRP: 1890, StockQuantity: 6, ImageURL: "" },
        { ProductID: 4, CategoryID: 1, CategoryName: "Everyday objects", ProductName: "The little clay cup", ShortDescription: "A handmade morning favourite", SellingPrice: 420, MRP: 0, StockQuantity: 20, ImageURL: "" }
      ],
      brands: [],
      coupons: [],
      services: [],
      banners: [{ Title: "A softer kind of everyday.", Subtitle: "A few lovely pieces, chosen slowly and made to be loved for a long time.", ImageURL: "", ButtonText: "Meet your new favourite" }],
      pages: [
        { PageName: "About Us", Slug: "about-us", PageTitle: "Our story", PageType: "about", HtmlContent: "<h2>A little about us</h2><p>A neighbourhood favourite for thoughtful little finds.</p>", DisplayOrder: 1 },
        { PageName: "Contact", Slug: "contact", PageTitle: "Come say hello", PageType: "contact", HtmlContent: "<p>We would love to hear from you.</p>", DisplayOrder: 2 }
      ]
    });
    state.cart = [];
    setTheme();
    render();
    return;
  }
  const cacheKey = `public-shopfront:v1:${String(state.slug).toLowerCase()}`;
  let cachedData = null;
  let hasCachedShop = false;
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
    if (cached?.data?.shop?.ShopSlug && String(cached.data.shop.ShopSlug).toLowerCase() === String(state.slug).toLowerCase()) {
      cachedData = cached.data;
      hydrateShopData(cachedData);
      loadCart();
      setTheme();
      render();
      hasCachedShop = true;
    }
  } catch { try { localStorage.removeItem(cacheKey); } catch {} }

  let responseStatus = 0;
  try {
    const response = await fetch(`${API_BASE}/${encodeURIComponent(state.slug)}`, { cache: "no-store" });
    responseStatus = response.status;
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || "Shop could not be loaded.");
    const freshData = result.data;
    const changed = !cachedData || JSON.stringify(cachedData) !== JSON.stringify(freshData);
    try { localStorage.setItem(cacheKey, JSON.stringify({ data: freshData, savedAt: Date.now() })); } catch {}
    if (changed) {
      hydrateShopData(freshData);
      loadCart();
      setTheme();
      render();
    }
  } catch (error) {
    if (responseStatus === 404) try { localStorage.removeItem(cacheKey); } catch {}
    if (!hasCachedShop || responseStatus === 404) renderError(error.message);
  }
}
function renderError(message) {
  const title = slugTitle(state.slug || "your shop");
  app.innerHTML = `<main class="status-screen"><a class="status-brand" href="/">${icon("bag", 22)} ShopBuilder</a><div class="status-card"><span class="status-kicker">YOUR SHOP IS ALMOST READY</span><h1>${escapeHTML(title)}</h1><p>${escapeHTML(message)}</p><p class="status-note">Make sure your API and SQL Server are running, then refresh this page.</p><button class="button button-dark" onclick="location.reload()">Try again ${icon("arrow", 17)}</button></div></main>`;
}

function renderNotFound(message) {
  app.innerHTML = `<main class="status-screen"><div class="status-card"><span class="status-kicker">SHOP LINK NEEDED</span><h1>Every shop gets its own little corner.</h1><p>${escapeHTML(message)}</p></div></main>`;
}

function getNavigationItems(isEcommerce) {
  const shopUrl = shopHomeUrl();
  const items = [];
  const seen = new Set();
  const add = (key, label, href) => {
    if (!href || seen.has(href)) return;
    seen.add(href);
    items.push({ key, label, href });
  };

  add("home", "Home", shopUrl);
  if (isEcommerce) add("shop", "Shop", `${shopUrl}#collections`);
  else add("services", "Services", `${shopUrl}/services`);

  const aboutIndex = state.pages.findIndex((page) => String(page.PageType || "").toLowerCase() === "about");
  const contactIndex = state.pages.findIndex((page) => String(page.PageType || "").toLowerCase() === "contact");
  add("about", "About", aboutIndex >= 0 ? pageUrl(state.pages[aboutIndex], aboutIndex) : `${shopUrl}/about`);
  add("contact", "Contact", contactIndex >= 0 ? pageUrl(state.pages[contactIndex], contactIndex) : `${shopUrl}/contact`);

  state.pages.forEach((page, index) => {
    const type = String(page.PageType || "custom").toLowerCase();
    if (["about", "contact"].includes(type)) return;
    add(`page-${page.Slug || index}`, page.PageName || slugTitle(page.Slug || "Page"), pageUrl(page, index));
  });
  if (isEcommerce && state.services.length && !state.pages.some((page) => String(page.PageType || "").toLowerCase() === "services")) {
    add("services", "Services", `${shopUrl}/services`);
  }
  if (state.portfolio.length) add("portfolio", "Portfolio", `${shopUrl}/portfolio`);
  if (isEcommerce && state.coupons.length) add("offers", "Offers", `${shopUrl}/offers`);
  if (state.banners.length) add("banners", "Banners", `${shopUrl}/banners`);
  return items;
}

function renderNavigation(isEcommerce, mobile = false) {
  const items = getNavigationItems(isEcommerce);
  const renderLink = ({ label, href }) => `<a class="nav-link" href="${href}">${escapeHTML(label)}</a>`;
  if (mobile) return items.map(renderLink).join("");

  const primaryKeys = new Set(["home", isEcommerce ? "shop" : "services", "about", "contact"]);
  const primary = items.filter((item) => primaryKeys.has(item.key));
  const more = items.filter((item) => !primaryKeys.has(item.key));
  return `${primary.map(renderLink).join("")}${more.length ? `<div class="nav-more"><button type="button" class="nav-more-trigger" data-action="toggle-more" aria-expanded="${state.moreMenuOpen}">More <span class="nav-more-chevron" aria-hidden="true"></span></button>${state.moreMenuOpen ? `<div class="nav-more-menu">${more.map(renderLink).join("")}</div>` : ""}</div>` : ""}`;
}
function renderSearchSuggestions() {
  const query = state.query.trim().toLowerCase();
  if (!query) return "";
  const categories = state.categories.filter((item) => String(item.CategoryName || "").toLowerCase().includes(query)).slice(0, 3);
  const brands = state.brands.filter((item) => String(item.BrandName || "").toLowerCase().includes(query)).slice(0, 3);
  const products = state.products.filter((item) => productSearchText(item).includes(query)).slice(0, 4);
  if (!categories.length && !brands.length && !products.length) return `<div class="search-suggestions"><p>No matching products, brands or categories.</p></div>`;
  return `<div class="search-suggestions" role="listbox">${categories.length ? `<div class="search-suggestion-group"><span>Categories</span>${categories.map((item) => `<button type="button" data-search-category="${Number(item.CategoryID)}">${escapeHTML(item.CategoryName)}</button>`).join("")}</div>` : ""}${brands.length ? `<div class="search-suggestion-group"><span>Brands</span>${brands.map((item) => `<button type="button" data-search-brand="${escapeHTML(item.BrandName)}">${escapeHTML(item.BrandName)}</button>`).join("")}</div>` : ""}${products.length ? `<div class="search-suggestion-group"><span>Products</span>${products.map((item) => `<a href="${shopHomeUrl()}/product/${encodeURIComponent(item.Slug || item.ProductID)}"><span>${escapeHTML(item.ProductName)}</span><small>${escapeHTML([item.BrandName, item.CategoryName].filter(Boolean).join(" · "))}</small></a>`).join("")}</div>` : ""}</div>`;
}

function updateSearchSuggestions() {
  const host = document.querySelector("#search-suggestions");
  if (!host) return;
  host.innerHTML = renderSearchSuggestions();
  host.querySelectorAll("[data-search-category]").forEach((button) => button.addEventListener("click", () => {
    state.activeCategory = button.dataset.searchCategory;
    state.query = "";
    if (state.route.length) { location.href = `${shopHomeUrl()}?category=${encodeURIComponent(state.activeCategory)}#collections`; return; }
    render();
    document.querySelector("#collections")?.scrollIntoView({ behavior: "smooth" });
  }));
  host.querySelectorAll("[data-search-brand]").forEach((button) => button.addEventListener("click", () => {
    state.query = button.dataset.searchBrand;
    state.activeCategory = "all";
    if (state.route.length) { location.href = `${shopHomeUrl()}?q=${encodeURIComponent(state.query)}#collections`; return; }
    render();
    document.querySelector("#collections")?.scrollIntoView({ behavior: "smooth" });
    document.querySelector("#site-search")?.focus();
  }));
}

function renderHeader(isEcommerce) {
  const shop = state.shop || {};
  const settings = state.settings || {};
  const logo = settings.ShopLogo || shop.LogoURL;
  const logoImage = safeImage(logo);
  const navigation = renderNavigation(isEcommerce);
  const mobileNavigation = renderNavigation(isEcommerce, true);
  return `
    <header class="site-header">
      <a class="brand" href="${shopHomeUrl()}" aria-label="${escapeHTML(shop.ShopName || "Shop home")}">
        ${logoImage ? `<img class="brand-logo" src="${logoImage}" alt="${escapeHTML(shop.ShopName || "Shop logo")}">` : `<span class="brand-monogram">${escapeHTML((shop.ShopName || "S").slice(0, 1))}</span>`}
        <span class="brand-copy"><strong>${escapeHTML(shop.ShopName || "Your shop")}</strong><small>${escapeHTML(settings.Tagline || "A little shop with a lot of heart")}</small></span>
      </a>
      <button class="mobile-menu-trigger" data-action="toggle-menu" aria-label="${state.mobileMenuOpen ? "Close" : "Open"} navigation" aria-expanded="${state.mobileMenuOpen}">${icon(state.mobileMenuOpen ? "x" : "menu", 21)}</button>
      <nav class="desktop-nav" aria-label="Main navigation">${navigation}</nav>
      <div class="header-actions">
        ${isEcommerce ? `<div class="search-area"><label class="search-box" aria-label="Search products, brands and categories">${icon("search", 19)}<input id="site-search" autocomplete="off" placeholder="Search products…" value="${escapeHTML(state.query)}"><kbd>/</kbd></label><div id="search-suggestions">${renderSearchSuggestions()}</div></div><button class="icon-button cart-trigger" data-action="open-cart" aria-label="Open shopping bag">${icon("bag")}<span class="cart-label">Bag</span><span class="cart-count">${cartCount()}</span></button>` : `<button class="header-contact" data-action="open-inquiry">Get in touch ${icon("arrow", 16)}</button>`}
      </div>
      ${state.mobileMenuOpen ? `<nav class="mobile-nav" aria-label="Mobile navigation">${mobileNavigation}</nav>` : ""}
    </header>`;
}
function renderFooter() {
  const shop = state.shop || {};
  const settings = state.settings || {};
  const logo = settings.ShopLogo || shop.LogoURL;
  const logoImage = safeImage(logo);
  return `${renderFooterDiscovery()}<footer class="site-footer page-gutter"><a class="brand footer-brand" href="${shopHomeUrl()}">${logoImage ? `<img class="brand-logo" src="${logoImage}" alt="">` : `<span class="brand-monogram">${escapeHTML((shop.ShopName || "S").slice(0, 1))}</span>`}<span class="brand-copy"><strong>${escapeHTML(shop.ShopName || "Your shop")}</strong><small>${escapeHTML(settings.Tagline || "A little shop with a lot of heart")}</small></span></a><span>${escapeHTML([settings.Address, settings.City, settings.State].filter(Boolean).join(", ") || "Made with care, for the people around us.")}</span><div class="footer-social">${settings.InstagramURL ? `<a href="${safeUrl(settings.InstagramURL)}" target="_blank" rel="noreferrer" aria-label="Instagram">${icon("instagram", 18)}</a>` : ""}${settings.Email ? `<a href="mailto:${escapeHTML(settings.Email)}" aria-label="Email us">${icon("mail", 18)}</a>` : ""}${settings.Phone || shop.Phone ? `<a href="tel:${escapeHTML(settings.Phone || shop.Phone)}" aria-label="Call us">${icon("phone", 18)}</a>` : ""}</div><small>© ${new Date().getFullYear()} ${escapeHTML(shop.ShopName || "Your shop")}</small></footer>`;
}

function renderFooterDiscovery() {
  if (!isEcommerceShop()) return "";
  const shopName = state.shop?.ShopName || "our shop";
  const firstBanner = state.banners[0];
  const bannerImages = parseMediaImages(firstBanner?.Images || firstBanner?.ImageURLs, firstBanner?.ImageURL);
  const couponBanner = state.banners[1] || firstBanner;
  const couponImages = parseMediaImages(couponBanner?.Images || couponBanner?.ImageURLs, couponBanner?.ImageURL);
  const productImage = state.products.find((product) => product.ImageURL)?.ImageURL || "";
  const bannerImage = safeImage(bannerImages[0] || productImage);
  const couponImage = safeImage(couponImages[0] || productImage);
  const bannerCount = state.banners.length;
  const couponCount = state.coupons.length;
  return `<section class="footer-discovery page-gutter" aria-label="Explore more from ${escapeHTML(shopName)}">
    <div class="footer-discovery-heading"><span class="eyebrow"><span class="eyebrow-line"></span> A LITTLE MORE TO EXPLORE</span><p>Good things from ${escapeHTML(shopName)}.</p></div>
    <div class="footer-discovery-grid">
      <a class="footer-discovery-card ${bannerImage ? "has-image" : ""}" href="${shopHomeUrl()}/banners">
        <span class="footer-discovery-image">${bannerImage ? `<img src="${bannerImage}" alt="Latest banners from ${escapeHTML(shopName)}" loading="lazy">` : `<span class="footer-discovery-art">✳</span>`}</span>
        <span class="footer-discovery-copy"><small>THE LATEST FROM ${escapeHTML(shopName).toUpperCase()}</small><strong>Stories &amp; highlights</strong><span>${bannerCount ? `${bannerCount} ${bannerCount === 1 ? "update" : "updates"} to explore` : "See what's new at the shop"}</span></span>
        <span class="footer-discovery-arrow" aria-hidden="true">↗</span>
      </a>
      <a class="footer-discovery-card ${couponImage ? "has-image" : ""}" href="${shopHomeUrl()}/offers">
        <span class="footer-discovery-image">${couponImage ? `<img src="${couponImage}" alt="Special offers from ${escapeHTML(shopName)}" loading="lazy">` : `<span class="footer-discovery-art">✳</span>`}</span>
        <span class="footer-discovery-copy"><small>A LITTLE THANK-YOU</small><strong>Offers for you</strong><span>${couponCount ? `${couponCount} ${couponCount === 1 ? "active offer" : "active offers"}` : "Discover current shop offers"}</span></span>
        <span class="footer-discovery-arrow" aria-hidden="true">↗</span>
      </a>
    </div>
  </section>`;
}

function renderServiceCards(services = state.services) {
  if (!services.length) return `<div class="content-empty"><span>✳</span><h2>Services coming soon</h2><p>Please contact ${escapeHTML(state.shop?.ShopName || "the shop")} to learn more.</p></div>`;
  return `<div class="service-grid">${services.map((service, index) => { const image = safeImage(service.ImageURL); return `<article class="service-card" role="button" tabindex="0" data-service-id="${Number(service.ServiceID)}" aria-label="View ${escapeHTML(service.ServiceName)}">${image ? `<img src="${image}" alt="${escapeHTML(service.ServiceName)}" loading="lazy">` : `<span class="service-flower">✳</span>`}${service.VideoURL ? `<span class="service-video-badge">Video available</span>` : ""}<span class="service-number">${String(index + 1).padStart(2, "0")}</span><h3>${escapeHTML(service.ServiceName)}</h3><p>${escapeHTML(service.ShortDescription || service.Description || "A little extra care, from our team to you.")}</p>${service.Price ? `<strong>From ${money(service.Price)}</strong>` : ""}<span class="service-view-hint">View details ↗</span></article>`; }).join("")}</div>`;
}

function renderBannerMedia(banner, className = "") {
  const images = parseMediaImages(banner?.Images || banner?.ImageURLs, banner?.ImageURL);
  const video = serviceVideoMarkup(banner?.VideoURL);
  if (!images.length && !video) return `<div class="banner-media-placeholder"><span>✳</span><small>Made for ${escapeHTML(state.shop?.ShopName || "you")}</small></div>`;
  const gallery = images.length ? renderMediaCarousel(images, banner?.Title || "Storefront banner", "banner-image-carousel") : "";
  return `<div class="banner-media ${escapeHTML(className)}">${gallery}${video}</div>`;
}

function renderMediaCarousel(images, alt, className = "") {
  const list = parseMediaImages(images).map((image) => safeImage(image)).filter(Boolean);
  if (!list.length) return "";
  const slides = list.map((image, index) => `
    <button class="media-carousel-slide ${index === 0 ? "is-current" : ""}" type="button"
      data-carousel-slide="${index}" ${index ? "hidden" : ""}
      data-carousel-image="${image}"
      data-carousel-alt="${escapeHTML(`${alt} · image ${index + 1}`)}"
      aria-label="Open image ${index + 1} of ${list.length}">
      <img src="${image}" alt="${escapeHTML(`${alt} · image ${index + 1}`)}" ${index ? 'loading="lazy"' : 'fetchpriority="high"'}>
      <span class="media-carousel-zoom">View full image ↗</span>
    </button>
  `).join("");
  const controls = list.length > 1 ? `
    <button class="media-carousel-arrow media-carousel-prev" type="button" data-carousel-prev aria-label="Previous image">‹</button>
    <button class="media-carousel-arrow media-carousel-next" type="button" data-carousel-next aria-label="Next image">›</button>
    <div class="media-carousel-footer">
      <div class="media-carousel-thumbs">${list.map((image, index) => `<button type="button" class="media-carousel-thumb ${index === 0 ? "is-current" : ""}" data-carousel-go="${index}" aria-label="Show image ${index + 1}"><img src="${image}" alt="" loading="lazy"></button>`).join("")}</div>
      <span class="media-carousel-count" data-carousel-count>01 / ${String(list.length).padStart(2, "0")}</span>
    </div>
  ` : "";
  return `<div class="media-carousel ${escapeHTML(className)}" data-media-carousel><div class="media-carousel-stage">${slides}</div>${controls}</div>`;
}

function renderBannerGallery() {
  const banners = state.banners || [];
  const featured = banners[0];
  const contact = state.settings?.Phone || state.shop?.Phone
    ? `tel:${state.settings?.Phone || state.shop?.Phone}`
    : `${shopHomeUrl()}/contact`;
  if (!featured) return `<main class="banner-gallery-page"><section class="banner-gallery-empty"><span class="eyebrow">A LITTLE SOMETHING FOR YOU</span><h1>Good things are on the way.</h1><p>Check back soon for the latest from ${escapeHTML(state.shop?.ShopName || "our shop")}.</p><button class="button button-dark" data-action="open-inquiry">Get in touch ${icon("arrow", 17)}</button></section></main>`;

  const cta = (banner, featuredBanner = false) => {
    if (banner.ButtonText) {
      return `<a class="button ${featuredBanner ? "button-light" : "button-dark"}" href="${safeUrl(banner.ButtonLink, contact)}">${escapeHTML(banner.ButtonText)} ${icon("arrow", 17)}</a>`;
    }
    return `<a class="button ${featuredBanner ? "button-light" : "button-dark"}" href="${safeUrl(contact)}">Discover more ${icon("arrow", 17)}</a>`;
  };

  return `<main class="banner-gallery-page"><section class="banner-gallery-intro page-gutter"><span class="eyebrow"><span class="eyebrow-line"></span> THE LATEST FROM ${escapeHTML(state.shop?.ShopName || "US").toUpperCase()}</span><h1>Little stories.<br><em>Worth a closer look.</em></h1><p>Explore announcements, seasonal highlights, and special moments from our shop.</p></section><section class="banner-feature page-gutter"><div class="banner-feature-card">${renderBannerMedia(featured, "banner-feature-media")}<div class="banner-feature-copy"><span class="banner-feature-kicker">FEATURED · ${escapeHTML(state.shop?.ShopName || "OUR SHOP").toUpperCase()}</span><h2>${escapeHTML(featured.Title)}</h2><p>${escapeHTML(featured.Subtitle || "A little update from our team, made especially for you.")}</p>${cta(featured, true)}</div><span class="banner-feature-index">01 <i></i> ${String(banners.length).padStart(2, "0")}</span></div></section>${banners.length > 1 ? `<section class="banner-story-grid page-gutter"><div class="banner-story-heading"><span class="eyebrow"><span class="eyebrow-line"></span> MORE TO EXPLORE</span><h2>From our <em>corner.</em></h2></div><div class="banner-story-cards">${banners.slice(1).map((banner, index) => `<article class="banner-story-card">${renderBannerMedia(banner, "")}<div class="banner-story-copy"><span class="banner-story-number">${String(index + 2).padStart(2, "0")}</span><h3>${escapeHTML(banner.Title)}</h3><p>${escapeHTML(banner.Subtitle || "A little update from our team.")}</p>${cta(banner)}</div></article>`).join("")}</div></section>` : ""}<section class="banner-gallery-foot page-gutter"><span class="eyebrow">HAVE A QUESTION?</span><h2>We’d love to hear <em>from you.</em></h2><button class="text-link" data-action="open-inquiry">Get in touch ${icon("arrow", 16)}</button></section></main>`;
}

function renderPortfolioGallery() {
  const projects = state.portfolio || [];
  if (!projects.length) return `<main class="portfolio-gallery-page"><section class="portfolio-gallery-empty"><span class="eyebrow">A LITTLE MORE ABOUT OUR WORK</span><h1>Good work takes <em>heart.</em></h1><p>Projects from ${escapeHTML(state.shop?.ShopName || "our team")} will be shared here soon.</p><button class="button button-dark" data-action="open-inquiry">Tell us what you have in mind ${icon("arrow", 17)}</button></section></main>`;
  return `<main class="portfolio-gallery-page"><section class="portfolio-gallery-intro page-gutter"><span class="eyebrow"><span class="eyebrow-line"></span> SELECTED WORK · ${escapeHTML(state.shop?.ShopName || "OUR STUDIO").toUpperCase()}</span><h1>Made with care.<br><em>Remembered for years.</em></h1><p>A collection of stories, details and projects we’ve been lucky to be part of.</p></section><section class="portfolio-gallery-grid page-gutter">${projects.map((item, index) => {
    const images = parseMediaImages(item.Images || item.ImageURLs, item.ImageURL);
    const date = item.ProjectDate ? new Date(item.ProjectDate).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "";
    const gallery = images.length ? renderMediaCarousel(images, item.Title, "portfolio-image-carousel") : `<div class="portfolio-gallery-image"><span class="portfolio-image-placeholder">✳</span></div>`;
    return `<article class="portfolio-gallery-card"><div class="portfolio-gallery-image-wrap">${gallery}<small class="portfolio-gallery-index">${String(index + 1).padStart(2, "0")}</small></div><div class="portfolio-gallery-copy"><span class="eyebrow">${escapeHTML(item.Category || "SELECTED PROJECT")}</span><h2>${escapeHTML(item.Title)}</h2><div class="portfolio-project-meta">${[item.ClientName, item.Location, date].filter(Boolean).map(escapeHTML).join(" · ")}</div>${item.Description ? `<p>${escapeHTML(item.Description)}</p>` : ""}${item.VideoURL ? `<button class="portfolio-video-link" type="button" data-open-video="${escapeHTML(item.VideoURL)}">Watch the project video ${icon("arrow", 15)}</button>` : ""}</div></article>`;
  }).join("")}</section><section class="portfolio-gallery-cta page-gutter"><span class="eyebrow">YOUR STORY, NEXT</span><h2>Let’s make something <em>meaningful.</em></h2><button class="button button-dark" data-action="open-inquiry">Start a conversation ${icon("arrow", 17)}</button></section></main>`;
}

function renderServiceHome() {
  const shop = state.shop || {};
  const settings = state.settings || {};
  const hero = state.banners[0];
  const heroTitle = hero?.Title || settings.Tagline || `${shop.ShopName || "Our team"}, here to help.`;
  const heroDescription = hero?.Subtitle || settings.AboutUs || `Explore the services offered by ${shop.ShopName || "our team"} and get in touch to discuss what you need.`;
  const heroImage = hero?.ImageURL || state.services.find((service) => service.ImageURL)?.ImageURL || "";
  document.title = `${shop.ShopName || "Service provider"}${settings.Tagline ? ` — ${settings.Tagline}` : ""}`;
  app.innerHTML = `
    <div class="announcement"><span class="announcement-spark">✳</span> ${escapeHTML(settings.City || shop.ShopName || "Local services")} <span class="announcement-separator">·</span> ${escapeHTML(settings.Tagline || "Here when you need us")}</div>
    ${renderHeader(false)}
    <main class="service-home-main" id="top">
      <section class="service-home-hero page-gutter">
        <div class="service-home-copy">
          <span class="eyebrow"><span class="eyebrow-line"></span> ${escapeHTML(shop.ShopName || "LOCAL SERVICE PROVIDER").toUpperCase()}</span>
          <h1>${escapeHTML(heroTitle)}</h1>
          <p>${escapeHTML(heroDescription)}</p>
          <div class="service-home-actions">
            <a class="button button-dark" href="#services">Explore services ${icon("arrow", 18)}</a>
            ${hero?.ButtonText ? `<a class="text-link" href="${safeUrl(hero.ButtonLink, `${shopHomeUrl()}/banners`)}">${escapeHTML(hero.ButtonText)} ${icon("arrow", 16)}</a>` : state.banners.length > 1 ? `<a class="text-link" href="${shopHomeUrl()}/banners">View all banners ${icon("arrow", 16)}</a>` : ""}
            <button class="text-link" type="button" data-action="open-inquiry">Get in touch ${icon("arrow", 16)}</button>
          </div>
          <div class="service-home-proof"><span class="live-dot"></span><span>${escapeHTML([settings.City, settings.State].filter(Boolean).join(", ") || "Serving your area")}</span></div>
        </div>
        <div class="service-home-art ${heroImage ? "has-photo" : ""}" ${heroImage ? `style="--service-hero-image:url('${safeCssImage(heroImage)}')"` : ""}>
          ${heroImage ? "" : `<span class="service-home-art-mark">✳</span><span class="service-home-art-title">GOOD WORK<br>MADE PERSONAL</span>`}
          ${state.shop?.LogoURL || settings.ShopLogo ? `<span class="service-home-logo">${imageMarkup(settings.ShopLogo || shop.LogoURL, shop.ShopName || "Shop logo")}</span>` : ""}
          ${hero?.VideoURL ? `<div class="service-home-banner-video">${serviceVideoMarkup(hero.VideoURL)}</div>` : ""}
        </div>
      </section>
      <section class="service-home-services page-gutter" id="services">
        <div class="section-heading"><div><span class="eyebrow"><span class="eyebrow-line"></span> WHAT WE DO</span><h2>Services for <em>you.</em></h2></div><p>${escapeHTML(settings.City ? `Available in ${settings.City}${settings.State ? `, ${settings.State}` : ""}.` : `A few ways ${shop.ShopName || "we"} can help.`)}</p></div>
        ${renderServiceCards()}
      </section>
      <section class="service-home-about page-gutter" id="about">
        <span class="eyebrow"><span class="eyebrow-line"></span> ABOUT ${escapeHTML(shop.ShopName || "US").toUpperCase()}</span>
        <h2>Good work starts with <em>listening.</em></h2>
        <p>${escapeHTML(settings.AboutUs || heroDescription)}</p>
      </section>
      ${renderContactCard()}
    </main>
    ${renderFooter()}
  `;
  syncServiceHomeHeader();
  bindEvents();
}

function renderShopBrands() {
  if (!state.brands.length) return "";
  return `<section class="store-brand-section page-gutter"><div class="section-heading"><div><span class="eyebrow"><span class="eyebrow-line"></span> GOOD COMPANY</span><h2>Brands we <em>love.</em></h2></div><p>Thoughtful names, chosen for this shop.</p></div><div class="store-brand-grid">${state.brands.map((brand) => { const image = safeImage(brand.LogoURL); return `<article class="store-brand-card">${image ? `<img src="${image}" alt="${escapeHTML(brand.BrandName)}" loading="lazy">` : `<span class="store-brand-mark">${escapeHTML((brand.BrandName || "B").slice(0, 1))}</span>`}<strong>${escapeHTML(brand.BrandName || "Brand")}</strong>${brand.Description ? `<p>${escapeHTML(brand.Description)}</p>` : ""}</article>`; }).join("")}</div></section>`;
}

function renderCouponOffers() {
  if (!state.coupons.length) return "";
  const offerCards = state.coupons.slice(0, 3).map((coupon, index) => renderOfferCard(coupon, index)).join("");
  return `<section class="store-offer-section page-gutter" id="offers"><div class="section-heading"><div><span class="eyebrow"><span class="eyebrow-line"></span> A LITTLE EXTRA</span><h2>Good things, <em>for you.</em></h2></div><p>Current offers from ${escapeHTML(state.shop?.ShopName || "this shop")}.</p></div><div class="store-offer-grid">${offerCards}</div>${state.coupons.length > 3 ? `<a class="text-link offer-more-link" href="${shopHomeUrl()}/offers">Explore all ${state.coupons.length} offers ${icon("arrow", 16)}</a>` : ""}</section>`;
}

function renderOfferCard(coupon, index = 0) {
  const banner = state.banners[index % Math.max(state.banners.length, 1)];
  const bannerImages = parseMediaImages(banner?.Images || banner?.ImageURLs, banner?.ImageURL);
  const product = state.products.find((item) => item.ImageURL);
  const image = safeImage(bannerImages[0] || product?.ImageURL || "");
  const discount = coupon.DiscountType === "Percentage"
    ? `${coupon.DiscountValue}% off`
    : `${money(coupon.DiscountValue)} off`;
  const expires = coupon.ExpiresAt
    ? new Date(coupon.ExpiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "While this offer lasts";
  return `<article class="store-offer-card ${image ? "has-offer-image" : ""}">
    <div class="offer-image">${image ? `<img src="${image}" alt="A special offer from ${escapeHTML(state.shop?.ShopName || "the shop")}" loading="lazy">` : `<span class="offer-image-mark">✳</span>`}<span class="offer-image-label">MADE FOR YOU</span></div>
    <div class="offer-copy"><span class="eyebrow">A LITTLE THANK-YOU</span><strong>${escapeHTML(discount)}</strong>
    <p>${coupon.MinimumOrderAmount ? `On orders over ${money(coupon.MinimumOrderAmount)}` : "A little thank-you from the shop."}</p>
    <div class="offer-code-row"><span>USE CODE</span><code>${escapeHTML(coupon.CouponCode)}</code></div>
    <small class="offer-validity">${escapeHTML(expires)}</small></div>
  </article>`;
}

function renderOffersPage() {
  const coupons = state.coupons || [];
  const shopName = state.shop?.ShopName || "our shop";
  return `<main class="offers-page">
    <section class="offers-page-intro page-gutter"><span class="eyebrow"><span class="eyebrow-line"></span> A LITTLE EXTRA FROM ${escapeHTML(shopName).toUpperCase()}</span><h1>Lovely finds.<br><em>Lovelier offers.</em></h1><p>Thoughtful little savings, picked just for you.</p></section>
    ${coupons.length ? `<section class="offers-page-grid page-gutter">${coupons.map((coupon, index) => renderOfferCard(coupon, index)).join("")}</section>` : `<section class="offers-empty page-gutter"><span>✳</span><h2>A little something is on its way.</h2><p>There are no active offers from ${escapeHTML(shopName)} right now. Please check back soon.</p><a class="button button-dark" href="${shopHomeUrl()}#collections">Browse the shop ${icon("arrow", 17)}</a></section>`}
    <section class="offers-page-note page-gutter"><span class="eyebrow">A NOTE FROM ${escapeHTML(shopName).toUpperCase()}</span><p>Offers are managed by this shop and may have order minimums or expiry dates.</p></section>
  </main>`;
}

function renderContactCard() {

  const shop = state.shop || {};
  const settings = state.settings || {};

  const address = [
    settings.Address,
    settings.City,
    settings.State,
    settings.Pincode
  ]
    .filter(Boolean)
    .join(", ");

  // -----------------------------------------
  // EXACT LATITUDE / LONGITUDE
  // -----------------------------------------

  const latitude = Number(settings.Latitude);
  const longitude = Number(settings.Longitude);

  const hasCoordinates =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  // Exact Google Maps location
  const exactMapURL = hasCoordinates
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${latitude},${longitude}`
      )}`
    : "";

  // Embedded map
  const mapEmbedURL = hasCoordinates
    ? `https://www.google.com/maps?q=${encodeURIComponent(
        `${latitude},${longitude}`
      )}&z=17&output=embed`
    : "";

  return `
    <div class="contact-grid">

      ${
        address
          ? `
            <article class="contact-location-card">

              <span>
                ${icon("pin", 21)}
              </span>

              <h2>Visit us</h2>

              <p>
                ${escapeHTML(address)}
              </p>

              ${
                exactMapURL
                  ? `
                    <a
                      class="text-link"
                      href="${safeUrl(exactMapURL)}"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open exact location in Google Maps ↗
                    </a>
                  `
                  : ""
              }

            </article>
          `
          : ""
      }

      ${
        settings.Phone || shop.Phone
          ? `
            <article>

              <span>
                ${icon("phone", 21)}
              </span>

              <h2>Call us</h2>

              <a href="tel:${escapeHTML(settings.Phone || shop.Phone)}">
                ${escapeHTML(settings.Phone || shop.Phone)}
              </a>

            </article>
          `
          : ""
      }

      ${
        settings.Email
          ? `
            <article>

              <span>
                ${icon("arrow", 21)}
              </span>

              <h2>Email us</h2>

              <a href="mailto:${escapeHTML(settings.Email)}">
                ${escapeHTML(settings.Email)}
              </a>

            </article>
          `
          : ""
      }

      ${
        settings.OpeningTime || settings.ClosingTime
          ? `
            <article>

              <span>
                ${icon("clock", 21)}
              </span>

              <h2>Opening hours</h2>

              <p>
                ${escapeHTML(settings.OpeningTime || "")}
                ${
                  settings.ClosingTime
                    ? ` – ${escapeHTML(settings.ClosingTime)}`
                    : ""
                }
              </p>

            </article>
          `
          : ""
      }

    </div>


    ${
      settings.ShowMap !== false && hasCoordinates
        ? `
          <div class="shop-location-map">

            <div class="shop-location-map-head">

              <div>

                <span class="eyebrow">
                  <span class="eyebrow-line"></span>
                  FIND US
                </span>

                <h2>
                  Come <em>see us.</em>
                </h2>

                <p>
                  ${escapeHTML(address || "Visit our shop")}
                </p>

              </div>


              <a
                class="button button-dark"
                href="${safeUrl(exactMapURL)}"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in Google Maps
                ${icon("arrow", 17)}
              </a>

            </div>


            <div class="shop-location-map-frame">

              <iframe
                title="${escapeHTML(shop.ShopName || "Shop")} exact location"
                src="${safeUrl(mapEmbedURL)}"
                loading="lazy"
                referrerpolicy="no-referrer-when-downgrade"
                allowfullscreen
              ></iframe>

              <!--
                Entire map is clickable.
                Touch/click anywhere on map opens
                exact Latitude + Longitude in Google Maps.
              -->

              <a
                class="map-click-layer"
                href="${safeUrl(exactMapURL)}"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open exact shop location in Google Maps"
              ></a>

              <div class="map-open-hint">
                ${icon("pin", 16)}
                Tap map to open location
              </div>

            </div>

          </div>
        `
        : ""
    }
  `;
}

function buildPublicPageDocument(html) {
  const apiOrigin = new URL(API_BASE).origin;
  const policy = "default-src 'none'; img-src data: https: http: blob:; style-src 'unsafe-inline' https: http:; font-src data: https: http:; base-uri http: https:; form-action 'none'; frame-src 'none'";
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${policy}"><base href="${escapeHTML(`${apiOrigin}/`)}"><style>*,*::before,*::after{box-sizing:border-box}html{min-width:0;overflow-x:hidden}body{width:100%;max-width:none;margin:0;padding:0;font:16px/1.7 Arial,sans-serif;color:#172033;overflow-wrap:anywhere}img{max-width:100%;height:auto}table{width:100%;max-width:100%;border-collapse:collapse}td,th{border:1px solid #d0d5dd;padding:8px}video,iframe{max-width:100%}@media(max-width:600px){body{margin:0;padding:0}}</style></head><body>${html || ""}</body></html>`;
}

function connectDesignedPageSlider(doc) {
  const view = doc.defaultView;
  const style = doc.createElement("style");
  style.textContent = ".public-user-carousel{width:100%;max-width:1480px;margin:26px auto 44px;padding:0 clamp(16px,4vw,56px);overflow:hidden}.public-user-carousel-window{overflow:hidden;touch-action:pan-y}.public-user-carousel-track{display:flex;gap:clamp(14px,2vw,30px);transition:transform .45s cubic-bezier(.2,.7,.2,1);will-change:transform}.public-user-carousel-slide{flex:0 0 calc((100% - 2 * clamp(14px,2vw,30px))/3);min-width:0;overflow:hidden}.public-user-carousel-slide img{display:block;width:100%;height:auto;max-height:520px;aspect-ratio:1.12/1;object-fit:cover}.public-user-carousel-controls{display:flex;justify-content:center;align-items:center;gap:24px;margin:28px auto 0}.public-user-carousel-controls button{width:54px;height:54px;border:1px solid currentColor;border-radius:50%;background:transparent;color:inherit;font:inherit;font-size:25px;line-height:1;cursor:pointer;transition:background .2s,color .2s,transform .2s}.public-user-carousel-controls button:hover{background:#bd9055;color:#111;transform:translateY(-2px)}.public-user-carousel-controls button:disabled{opacity:.4;cursor:default}.public-user-carousel-counter{min-width:76px;text-align:center;font-size:12px;font-weight:700;letter-spacing:.18em}@media(max-width:1050px){.public-user-carousel-slide{flex-basis:calc((100% - clamp(14px,2vw,30px))/2)}}@media(max-width:600px){.public-user-carousel{margin:20px auto 34px;padding:0 16px}.public-user-carousel-slide{flex-basis:100%}.public-user-carousel-slide img{max-height:440px;aspect-ratio:1/1}.public-user-carousel-controls{gap:18px;margin-top:20px}.public-user-carousel-controls button{width:46px;height:46px}}";
  doc.head.append(style);

  const root = doc.querySelector("#captora-services");
  const track = root?.querySelector(".cs-track");
  const cards = [...(root?.querySelectorAll(".cs-card") || [])];
  if (track && cards.length) {
    if (root.dataset.storefrontSliderReady === "true") return;
    root.dataset.storefrontSliderReady = "true";
    const frame = root.querySelector(".cs-carousel-window") || track.parentElement;
    const count = root.querySelector(".cs-counter");
    const previous = root.querySelector(".cs-prev");
    const next = root.querySelector(".cs-next");
    let index = 0;
    let startX = 0;
    const visible = () => view.matchMedia("(max-width:600px)").matches ? 1 : view.matchMedia("(max-width:1050px)").matches ? 2 : 3;
    const maxIndex = () => Math.max(0, cards.length - visible());
    const update = () => {
      const gap = parseFloat(view.getComputedStyle(track).gap) || 0;
      const width = cards[0].getBoundingClientRect().width;
      index = Math.min(index, maxIndex());
      track.style.transform = "translate3d(-" + (index * (width + gap)) + "px,0,0)";
      if (count) count.textContent = String(index + 1).padStart(2, "0") + " / " + String(cards.length).padStart(2, "0");
    };
    const move = (direction) => { index = direction > 0 ? (index >= maxIndex() ? 0 : index + 1) : (index <= 0 ? maxIndex() : index - 1); update(); };
    previous?.addEventListener("click", () => move(-1));
    next?.addEventListener("click", () => move(1));
    root.querySelectorAll(".cs-dot").forEach((dot, i) => dot.addEventListener("click", () => { index = Math.min(i, maxIndex()); update(); }));
    frame?.addEventListener("pointerdown", event => { startX = event.clientX; });
    frame?.addEventListener("pointerup", event => { const distance = event.clientX - startX; if (Math.abs(distance) > 45) move(distance < 0 ? 1 : -1); });
    view.addEventListener("resize", update);
    view.requestAnimationFrame(update);
    return;
  }

  const counterNode = [...doc.body.querySelectorAll("p,div,span")].find(node => { const value = (node.textContent || "").trim().replaceAll("\u00a0", "").replaceAll(" ", ""); return (value.startsWith("‹") || value.startsWith("<")) && (value.endsWith("›") || value.endsWith(">")) && value.includes("/") && (value.includes("01/") || value.includes("1/")); });
  const imageBlocks = [...doc.body.querySelectorAll("p,figure")].filter(node => node.querySelector(":scope > img"));
  if (!counterNode || imageBlocks.length < 3 || imageBlocks.some(block => block.parentElement !== imageBlocks[0].parentElement)) return;
  const parent = imageBlocks[0].parentElement;
  if (parent.dataset.storefrontSliderReady === "true") return;
  const children = [...parent.children];
  const starts = imageBlocks.map(block => children.indexOf(block));
  const counterIndex = children.indexOf(counterNode);
  if (starts.some(position => position < 0) || counterIndex < starts.at(-1)) return;
  parent.dataset.storefrontSliderReady = "true";

  const carousel = doc.createElement("section");
  carousel.className = "public-user-carousel";
  carousel.setAttribute("aria-label", "Image gallery");
  const viewport = doc.createElement("div");
  viewport.className = "public-user-carousel-window";
  const rail = doc.createElement("div");
  rail.className = "public-user-carousel-track";
  viewport.append(rail);
  carousel.append(viewport);
  parent.insertBefore(carousel, imageBlocks[0]);
  const slides = [];
  for (let i = 0; i < starts.length; i += 1) {
    const slide = doc.createElement("article");
    slide.className = "public-user-carousel-slide";
    const end = i + 1 < starts.length ? starts[i + 1] : counterIndex;
    for (let childIndex = starts[i]; childIndex < end; childIndex += 1) slide.append(children[childIndex]);
    rail.append(slide);
    slides.push(slide);
  }
  counterNode.remove();
  const controls = doc.createElement("div");
  controls.className = "public-user-carousel-controls";
  const previous = doc.createElement("button");
  previous.type = "button";
  previous.setAttribute("aria-label", "Previous images");
  previous.textContent = "‹";
  const count = doc.createElement("span");
  count.className = "public-user-carousel-counter";
  const next = doc.createElement("button");
  next.type = "button";
  next.setAttribute("aria-label", "Next images");
  next.textContent = "›";
  controls.append(previous, count, next);
  carousel.append(controls);
  let index = 0;
  let startX = 0;
  const visible = () => view.matchMedia("(max-width:600px)").matches ? 1 : view.matchMedia("(max-width:1050px)").matches ? 2 : 3;
  const maxIndex = () => Math.max(0, slides.length - visible());
  const update = () => {
    const gap = parseFloat(view.getComputedStyle(rail).gap) || 0;
    const width = slides[0].getBoundingClientRect().width;
    index = Math.min(index, maxIndex());
    rail.style.transform = "translate3d(-" + (index * (width + gap)) + "px,0,0)";
    count.textContent = String(index + 1).padStart(2, "0") + " / " + String(slides.length).padStart(2, "0");
    previous.disabled = next.disabled = slides.length <= visible();
  };
  const move = direction => { index = direction > 0 ? (index >= maxIndex() ? 0 : index + 1) : (index <= 0 ? maxIndex() : index - 1); update(); };
  previous.addEventListener("click", () => move(-1));
  next.addEventListener("click", () => move(1));
  viewport.addEventListener("pointerdown", event => { startX = event.clientX; });
  viewport.addEventListener("pointerup", event => { const distance = event.clientX - startX; if (Math.abs(distance) > 45) move(distance < 0 ? 1 : -1); });
  view.addEventListener("resize", update);
  view.requestAnimationFrame(update);
}

function mountPublicPageContent(html) {
  const frame = document.querySelector(".public-page-html-frame");
  if (!frame) return;
  frame.addEventListener("load", () => {
    const doc = frame.contentDocument;
    if (!doc) return;
    const resize = () => {
      const height = Math.max(doc.documentElement?.scrollHeight || 0, doc.body?.scrollHeight || 0, doc.body?.offsetHeight || 0);
      if (height) frame.style.height = `${height + 8}px`;
    };
    doc.querySelectorAll("img").forEach((image) => image.addEventListener("load", resize));
    doc.fonts?.ready?.then(resize).catch(() => {});
    connectDesignedPageSlider(doc);
    resize();
    window.setTimeout(resize, 100);
  });
  frame.srcdoc = buildPublicPageDocument(html);
}
function renderDedicatedRoute(routeInfo) {
  const shop = state.shop || {};
  const settings = state.settings || {};
  const isEcommerce = isEcommerceShop();
  const page = routeInfo.page;
  const pageType = String(page?.PageType || "").toLowerCase();
  document.title = `${page?.PageTitle || page?.PageName || "Shop"} | ${shop.ShopName || "ShopBuilder"}`;
  if (routeInfo.kind === "not-found") {
    app.innerHTML = `<main class="status-screen"><a class="status-brand" href="${shopHomeUrl()}">${escapeHTML(shop.ShopName || "Shop")}</a><div class="status-card"><span class="status-kicker">PAGE NOT FOUND</span><h1>This page isn’t here.</h1><p>Try a link in the shop navigation.</p><a class="button button-dark" href="${shopHomeUrl()}">Back to the shop ${icon("arrow", 17)}</a></div></main>`;
    return;
  }
  if (routeInfo.kind === "product") {
    const product = routeInfo.product;
    const gallery = Array.isArray(product.Images) ? product.Images.map((image) => typeof image === "string" ? image : image.ImageURL || image.imageURL || image.url).filter((image) => Boolean(safeImage(image))) : [];
    const imageList = [...new Set([product.ImageURL, ...gallery].filter((image) => Boolean(safeImage(image))))].slice(0, 10);
    const sizes = getProductSizes(product);
    app.innerHTML = `<div class="announcement">${escapeHTML(shop.ShopName || "Your shop")}</div>${renderHeader(isEcommerce)}<main class="public-product-page page-gutter"><a class="text-link" href="${shopHomeUrl()}#collections">← Back to the shop</a><article class="public-product-detail"><div class="public-product-gallery">${imageList.length ? renderMediaCarousel(imageList, product.ProductName, "public-product-carousel") : `<div class="public-product-image"><div class="product-image-placeholder">${icon("bag", 40)}</div></div>`}</div><div class="public-product-copy"><span class="eyebrow">${escapeHTML(product.BrandName ? `Brand is ${product.BrandName}` : product.CategoryName || "SHOP FAVOURITE")}</span>${product.BrandName && product.CategoryName ? `<span class="product-detail-category">${escapeHTML(product.CategoryName)}</span>` : ""}<h1>${escapeHTML(product.ProductName)}</h1><strong class="public-product-price">${money(product.SellingPrice)}</strong>${product.ShortDescription ? `<p class="product-short-description">${escapeHTML(product.ShortDescription)}</p>` : ""}${product.Description ? `<p>${escapeHTML(product.Description)}</p>` : ""}${renderSizeSelector(sizes, "product-size")}<button class="button button-dark" data-action="add-cart" data-id="${Number(product.ProductID)}">Add to bag ${icon("bag", 18)}</button></div></article></main>${renderFooter()}${state.cartOpen ? renderCartDrawer() : ""}${state.checkoutOpen ? renderCheckout() : ""}`;
    bindEvents();
    return;
  }

  if (pageType === "banners") {
    app.innerHTML = `${isPreview ? `<div class="preview-ribbon">DESIGN PREVIEW <span>·</span> EXAMPLE CONTENT ONLY</div>` : ""}<div class="announcement"><span class="announcement-spark">✳</span> ${escapeHTML(settings.Tagline || "A good day to shop local")} <span class="announcement-separator">·</span> ${escapeHTML(settings.City || shop.ShopName || "Welcome")}</div>${renderHeader(isEcommerce)}${renderBannerGallery()}${renderFooter()}`;
    syncServiceHomeHeader();
    bindEvents();
    return;
  }
  if (pageType === "offers") {
    app.innerHTML = `${isPreview ? `<div class="preview-ribbon">DESIGN PREVIEW <span>·</span> EXAMPLE CONTENT ONLY</div>` : ""}<div class="announcement"><span class="announcement-spark">✳</span> ${escapeHTML(settings.Tagline || "A good day to shop local")} <span class="announcement-separator">·</span> ${escapeHTML(settings.City || shop.ShopName || "Welcome")}</div>${renderHeader(isEcommerce)}${renderOffersPage()}${renderFooter()}${state.cartOpen ? renderCartDrawer() : ""}${state.checkoutOpen ? renderCheckout() : ""}`;
    bindEvents();
    return;
  }
  if (pageType === "portfolio") {
    app.innerHTML = `${isPreview ? `<div class="preview-ribbon">DESIGN PREVIEW <span>·</span> EXAMPLE CONTENT ONLY</div>` : ""}<div class="announcement"><span class="announcement-spark">✳</span> ${escapeHTML(settings.City || shop.ShopName || "Welcome")} <span class="announcement-separator">·</span> ${escapeHTML(settings.Tagline || "A little shop with a lot of heart")}</div>${renderHeader(isEcommerce)}${renderPortfolioGallery()}${renderFooter()}`;
    syncServiceHomeHeader();
    bindEvents();
    return;
  }

  const pageTitle = page.PageTitle || page.PageName || "Welcome";
  const pageHtml = String(page.HtmlContent || "");
  const pageDocument = new DOMParser().parseFromString(pageHtml, "text/html");
  const pageText = pageDocument.body.textContent || "";
  const hasDesignedHeading = Boolean(pageDocument.body.querySelector("h1, h2"));
  const hasContactDetailsInPage = /\b(address|phone|email|opening hours)\b/i.test(pageText);
  const routeSection = pageType === "services" ? `<section class="content-section">${renderServiceCards()}</section>` : pageType === "gallery" && !pageHtml ? `<section class="content-section"><div class="public-content-body"><p>Gallery images can be added to this page from the Website Editor.</p></div></section>` : "";
  const pageTitleSection = !hasDesignedHeading || !pageHtml ? `<section class="public-page-hero page-gutter"><span class="eyebrow"><span class="eyebrow-line"></span>${escapeHTML(shop.ShopName || "OUR STORY").toUpperCase()}</span><h1>${escapeHTML(pageTitle)}</h1>${pageType === "custom" ? "" : `<p>${escapeHTML(settings.Tagline || "Thoughtfully made for you.")}</p>`}</section>` : "";
  app.innerHTML = `${isPreview ? `<div class="preview-ribbon">DESIGN PREVIEW <span>·</span> EXAMPLE CONTENT ONLY</div>` : ""}<div class="announcement"><span class="announcement-spark">✳</span> ${escapeHTML(settings.City || shop.ShopName || "Welcome")} <span class="announcement-separator">·</span> ${escapeHTML(settings.Tagline || "A little shop with a lot of heart")}</div>${renderHeader(isEcommerce)}<main class="public-page-main">${pageTitleSection}${pageHtml ? `<div class="public-html-frame-wrap"><iframe class="public-page-html-frame" title="${escapeHTML(pageTitle)}" sandbox="allow-same-origin" loading="eager"></iframe></div>` : `<div class="public-content-wrap page-gutter"><article class="public-content-body">${pageType === "about" ? `<p>${escapeHTML(settings.AboutUs || `Welcome to ${shop.ShopName || "our shop"}. We are glad you are here.`)}</p>` : ""}</article></div>`}${routeSection}${pageType === "about" || pageType === "contact" ? `<section class="content-section page-gutter">${pageType === "contact" ? (hasContactDetailsInPage ? "" : renderContactCard()) : `<div class="public-contact-cta"><div><span class="eyebrow">A LITTLE MORE</span><h2>We’d love to hear from you.</h2></div><a class="button button-dark" href="${shopHomeUrl()}/contact">Get in touch ${icon("arrow", 17)}</a></div>`}</section>` : ""}${isEcommerce ? `<section class="content-section page-gutter"><a class="button button-dark" href="${shopHomeUrl()}#collections">Browse the collection ${icon("arrow", 17)}</a></section>` : ""}</main>${renderFooter()}${state.cartOpen ? renderCartDrawer() : ""}${state.checkoutOpen ? renderCheckout() : ""}`;
  if (pageHtml) mountPublicPageContent(pageHtml);
  bindEvents();
}

function render() {
  const routeInfo = resolveRoute();
  if (routeInfo.kind !== "home") {
    renderDedicatedRoute(routeInfo);
    return;
  }
  if (!isEcommerceShop()) {
    renderServiceHome();
    return;
  }
  const shop = state.shop || {};
  const settings = state.settings || {};
  const isEcommerce = isEcommerceShop();
  const banner = state.banners[0];
  const editorialBanners = state.banners.slice(1, 4);
  const aboutPageIndex = state.pages.findIndex((page) => String(page.PageType).toLowerCase() === "about");
  const aboutLink = aboutPageIndex >= 0 ? pageUrl(state.pages[aboutPageIndex], aboutPageIndex) : `${shopHomeUrl()}/about`;
  const serviceLink = `${shopHomeUrl()}/services`;
  const title = banner?.Title || settings.Tagline || `A little more ${shop.ShopName || "you"}.`;
  const subtitle = banner?.Subtitle || settings.AboutUs || "Thoughtfully chosen favourites, made easy to discover and lovely to bring home.";
  const heroImage = banner?.ImageURL || state.products.find((product) => product.ImageURL)?.ImageURL || "";
  const storyImage = safeImage(state.banners[1]?.ImageURL || state.products.find((product) => product.ImageURL)?.ImageURL || "");
  const visibleProducts = state.products.filter((product) => {
    const matchesCategory = state.activeCategory === "all" || String(product.CategoryID) === String(state.activeCategory);
    const haystack = productSearchText(product);
    return matchesCategory && haystack.includes(state.query.toLowerCase());
  });
  const categories = state.categories.slice(0, 6);
  document.title = `${shop.ShopName || "Your shop"}${settings.Tagline ? ` — ${settings.Tagline}` : ""}`;

  app.innerHTML = `
    ${isPreview ? `<div class="preview-ribbon">DESIGN PREVIEW <span>·</span> EXAMPLE CONTENT ONLY</div>` : ""}
    <div class="announcement"><span class="announcement-spark">✳</span> ${escapeHTML(settings.Tagline || "A good day to shop local")} <span class="announcement-separator">·</span> ${escapeHTML(settings.City || shop.ShopName || "Welcome")}</div>
    ${renderHeader(isEcommerce)}
    <main id="top">
      <section class="hero-section page-gutter">
        <div class="hero-copy"><span class="eyebrow"><span class="eyebrow-line"></span> ${escapeHTML(shop.ShopName || "YOUR NEIGHBORHOOD SHOP").toUpperCase()}</span><h1>${escapeHTML(title)}</h1><p class="hero-description">${escapeHTML(subtitle)}</p><div class="hero-actions">${isEcommerce ? `<a class="button button-dark" href="#collections">Explore the collection ${icon("arrow", 18)}</a>` : state.services.length ? `<a class="button button-dark" href="${serviceLink}">Explore our services ${icon("arrow", 18)}</a>` : `<a class="button button-dark" href="${aboutLink}">Discover our story ${icon("arrow", 18)}</a>`}<a class="text-link" href="${aboutLink}">A little about us <span>↗</span></a></div><div class="hero-proof"><div class="proof-avatars"><span>✿</span><span>♡</span><span>✳</span></div><div><strong>${escapeHTML(shop.ShopName || "Local, personal, thoughtful")}</strong><small>${escapeHTML(settings.City || "A shop made for you")}</small></div></div></div>
        <div class="hero-art ${heroImage ? "has-photo" : ""}" ${heroImage ? `style="--hero-image:url('${safeCssImage(heroImage)}')"` : ""}>
          <div class="hero-art-orbit orbit-one"></div><div class="hero-art-orbit orbit-two"></div><div class="hero-art-center"><span class="hero-sun">✳</span><span class="hero-center-label">GOOD THINGS<br>LIVE HERE</span><span class="hero-center-rule"></span><span class="hero-center-place">${escapeHTML(settings.City || "SHOP LOCAL")}</span></div>
          <div class="hero-stamp"><span>Curated<br>for you</span><b>✳</b></div><div class="hero-art-note"><span class="note-dot"></span> A small shop, a big feeling</div>
          ${state.products[0] ? `<div class="floating-product">${safeImage(state.products[0].ImageURL) ? `<img src="${safeImage(state.products[0].ImageURL)}" alt="">` : `<span class="media-unavailable">${icon("bag", 18)}</span>`}<div><small>SHOP FAVOURITE</small><strong>${escapeHTML(state.products[0].ProductName)}</strong></div><span>${money(state.products[0].SellingPrice)}</span></div>` : ""}
        </div>
        <span class="hero-index">01 <i></i> 04</span>
      </section>
      <section class="perks-strip page-gutter"><div><span>✦</span><p><strong>Picked with care</strong><small>${escapeHTML(shop.ShopName || "Thoughtful finds, always")}</small></p></div><div><span>⌁</span><p><strong>${escapeHTML(settings.City || "Here in your neighbourhood")}</strong><small>Real people, real local</small></p></div><div><span>♡</span><p><strong>${isEcommerce ? "Shop at your own pace" : "Personal service"}</strong><small>${isEcommerce ? "Find something you love" : "Here when you need us"}</small></p></div><a href="${shopHomeUrl()}/contact">Come say hello ${icon("arrow", 16)}</a></section>
      ${isEcommerce ? `<section class="collection-section page-gutter" id="collections">
        <div class="section-heading"><div><span class="eyebrow"><span class="eyebrow-line"></span> A FEW GOOD THINGS</span><h2>Find your <em>favourite.</em></h2></div><p>Little discoveries, lovely essentials,<br>and things you didn't know you needed.</p></div>
        ${categories.length ? `<div class="category-row"><button class="category-chip ${state.activeCategory === "all" ? "selected" : ""}" data-category="all"><span class="category-chip-icon">✳</span> Everything</button>${categories.map((category) => { const image = safeImage(category.ImageURL); return `<button class="category-chip ${String(state.activeCategory) === String(category.CategoryID) ? "selected" : ""}" data-category="${category.CategoryID}">${image ? `<img src="${image}" alt="">` : `<span class="category-chip-icon">✿</span>`}${escapeHTML(category.CategoryName)}</button>`; }).join("")}</div>` : ""}
        <div class="collection-toolbar"><span id="product-count">${visibleProducts.length} lovely ${visibleProducts.length === 1 ? "find" : "finds"}</span><div><span>Sort</span><select id="sort-products"><option value="featured">Our favourites</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select></div></div>
        <div class="product-grid" id="product-grid">${renderProductCards(visibleProducts)}</div>
      </section>` : ""}
      ${editorialBanners.map((item) => { const image = safeCssImage(item.ImageURL); return `<section class="editorial-banner page-gutter"><div class="editorial-card" style="${image ? `--editorial-image:url('${image}')` : ""}"><div><span class="eyebrow">A NOTE FROM ${escapeHTML(shop.ShopName || "US").toUpperCase()}</span><h2>${escapeHTML(item.Title)}</h2><p>${escapeHTML(item.Subtitle || "Come on in and find something that feels just right.")}</p><a class="button button-light" href="${safeUrl(item.ButtonLink, isEcommerce ? `${shopHomeUrl()}#collections` : `${shopHomeUrl()}/contact`)}">${escapeHTML(item.ButtonText || "Take a look")} ${icon("arrow", 17)}</a></div><span class="editorial-seal">${escapeHTML(shop.ShopName || "SHOP").slice(0, 14)}<b>✳</b>EST. WITH LOVE</span></div></section>`; }).join("")}
      ${renderShopBrands()}
      ${renderCouponOffers()}
      ${state.services.length ? `<section class="services-section page-gutter" id="services"><div class="section-heading"><div><span class="eyebrow"><span class="eyebrow-line"></span> ${isEcommerce ? "MORE THAN A SHOP" : "WHAT WE DO"}</span><h2>${isEcommerce ? `Here for the <em>little extras.</em>` : `Good work, <em>made personal.</em>`}</h2></div><p>${isEcommerce ? "Good service is our favourite thing to put on the menu." : `A few ways ${escapeHTML(shop.ShopName || "we")} can help you.`}</p></div>${renderServiceCards(state.services.slice(0, 3))}<a class="text-link services-more" href="${serviceLink}">Explore all services <span>↗</span></a></section>` : ""}
      <section class="story-section page-gutter" id="story"><div class="story-art ${storyImage ? "has-photo" : ""}">${storyImage ? `<img class="story-photo" src="${storyImage}" alt="A glimpse of ${escapeHTML(shop.ShopName || "the shop")}" loading="lazy">` : `<span class="story-frame story-frame-one"></span><span class="story-frame story-frame-two"></span><div class="story-art-caption"><span>✳</span><strong>${escapeHTML(shop.ShopName || "GOOD THINGS").toUpperCase()}<br>GROW LOCALLY</strong></div>`}<span class="story-art-sticker">A SHOP<br>WITH SOUL</span></div><div class="story-copy"><span class="eyebrow"><span class="eyebrow-line"></span> OUR LITTLE CORNER</span><h2>${escapeHTML(shop.ShopName || "Small shop.")}<br><em>Big on heart.</em></h2><p>${escapeHTML(settings.AboutUs || `${shop.ShopName || "We"} believe good service starts with listening. We are here to make everyday a little more special, one thoughtful moment at a time.`)}</p><a class="text-link" href="${aboutLink}">Get to know us <span>↗</span></a></div></section>
${
  (() => {

    const hasCoordinates =
      settings.Latitude !== null &&
      settings.Latitude !== undefined &&
      settings.Latitude !== "" &&
      settings.Longitude !== null &&
      settings.Longitude !== undefined &&
      settings.Longitude !== "";

    const mapURL =
      settings.MapURL ||
      (
        hasCoordinates
          ? `https://www.google.com/maps?q=${encodeURIComponent(
              `${settings.Latitude},${settings.Longitude}`
            )}`
          : ""
      );

    const mapEmbedURL =
      hasCoordinates
        ? `https://www.google.com/maps?q=${encodeURIComponent(
            `${settings.Latitude},${settings.Longitude}`
          )}&output=embed`
        : "";

    return `
      <section class="visit-section page-gutter" id="visit">

        <div class="visit-card">

          <div class="visit-copy">

            <span class="eyebrow">
              <span class="eyebrow-line"></span>
              DOORS OPEN, HEART OPEN
            </span>

            <h2>
              We'd love to
              <br>
              <em>see you.</em>
            </h2>

           <p class="shop-address">
  ${
    hasCoordinates
      ? `
        <a
          class="location-icon-link"
          href="${safeUrl(
            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${settings.Latitude},${settings.Longitude}`
            )}`
          )}"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open shop location in Google Maps"
          title="Open location in Google Maps"
        >
          ${icon("pin", 17)}
        </a>
      `
      : `${icon("pin", 17)}`
  }

  <span>
    ${escapeHTML(
      [
        settings.Address,
        settings.City,
        settings.State,
        settings.Pincode
      ]
        .filter(Boolean)
        .join(", ")
        || "Your friendly neighbourhood shop"
    )}
  </span>
</p>

            <p>
              ${icon("clock", 17)}
              ${escapeHTML(settings.OpeningTime || "Today")}
              ${
                settings.ClosingTime
                  ? ` — ${escapeHTML(settings.ClosingTime)}`
                  : " · Come on in"
              }
            </p>

            <div class="visit-actions">

              <a
                class="button button-dark"
                href="${
                  settings.WhatsAppNumber
                    ? `https://wa.me/${encodeURIComponent(
                        normalizeWhatsAppNumber(settings.WhatsAppNumber)
                      )}`
                    : `tel:${encodeURIComponent(
                        settings.Phone || shop.Phone || ""
                      )}`
                }"
                target="_blank"
                rel="noreferrer"
              >
                Say hello
                ${icon("arrow", 17)}
              </a>

              ${
                mapURL
                  ? `
                    <a
                      class="text-link"
                      href="${safeUrl(mapURL)}"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Get directions ↗
                    </a>
                  `
                  : ""
              }

            </div>

          </div>


          ${
            settings.ShowMap !== false && hasCoordinates
              ? `
                <div class="visit-map">

  <iframe
    title="${escapeHTML(
      shop.ShopName || "Shop"
    )} exact location"
    src="${safeUrl(mapEmbedURL)}"
    loading="lazy"
    referrerpolicy="no-referrer-when-downgrade"
    allowfullscreen
  ></iframe>

  <a
    class="map-click-layer"
    href="${safeUrl(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${settings.Latitude},${settings.Longitude}`
      )}`
    )}"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Open exact shop location in Google Maps"
  ></a>

  <div class="map-open-hint">
    ${icon("pin", 16)}
    Tap map to open location
  </div>

</div>
              `
              : `
                <div class="visit-art">

                  <div class="visit-door">
                    <span class="door-top">OPEN</span>
                    <span class="door-star">✳</span>
                    <span class="door-bottom">COME ON IN</span>
                  </div>

                  <span class="visit-sun">✳</span>
                  <span class="visit-spark">✦</span>

                </div>
              `
          }

        </div>

      </section>
    `;
  })()
}
    </main>
    ${renderFooter()}
    ${isEcommerce && state.cartOpen ? renderCartDrawer() : ""}
    ${isEcommerce && state.checkoutOpen ? renderCheckout() : ""}
  `;

  bindEvents();
}

function renderProductCards(products) {
  if (!products.length) return `<div class="empty-products"><span>✳</span><h3>${state.query ? "Nothing by that name just yet." : "A little something is on its way."}</h3><p>${state.query ? "Try another search or browse everything." : "The shop owner can add products from the Shop Admin panel."}</p>${state.query ? `<button class="text-link" data-action="clear-search">Clear your search ↗</button>` : ""}</div>`;
  return products.map((product, index) => {
    const image = safeImage(product.ImageURL);
    const oldPrice = Number(product.MRP) > Number(product.SellingPrice);
    const discount = oldPrice ? Math.round((1 - Number(product.SellingPrice) / Number(product.MRP)) * 100) : 0;
    const productUrl = `${shopHomeUrl()}/product/${encodeURIComponent(product.Slug || product.ProductID)}`;
    const hasSizes = getProductSizes(product).length > 0;
    return `<article class="product-card"><a class="product-image-wrap" href="${productUrl}" aria-label="View ${escapeHTML(product.ProductName)}">${image ? `<img src="${image}" alt="${escapeHTML(product.ProductName)}" loading="lazy">` : `<span class="media-unavailable">${icon("bag", 32)}</span>`}<span class="product-image-shade"></span>${discount ? `<span class="product-badge">${discount}% less</span>` : `<span class="product-badge badge-soft">A good find</span>`}<span class="quick-view">Take a closer look ${icon("arrow", 15)}</span></a><div class="product-meta"><div><span class="product-category">${escapeHTML([product.BrandName, product.CategoryName || "SHOP FAVOURITES"].filter(Boolean).join(" · "))}</span><h3><a href="${productUrl}">${escapeHTML(product.ProductName)}</a></h3></div><button class="add-button" data-action="${hasSizes ? "product-detail" : "add-cart"}" data-id="${product.ProductID}" aria-label="${hasSizes ? "Choose size for" : "Add"} ${escapeHTML(product.ProductName)} to bag">${icon(hasSizes ? "arrow" : "plus", 18)}</button></div><div class="product-price"><strong>${money(product.SellingPrice)}</strong>${oldPrice ? `<del>${money(product.MRP)}</del>` : ""}<span>Inclusive of taxes</span></div></article>`;
  }).join("");
}

function renderCartDrawer() {
  const items = currentCartItems();
  return `<div class="overlay" data-action="close-overlay"><aside class="drawer" onclick="event.stopPropagation()"><div class="drawer-head"><div><span class="eyebrow">YOUR LITTLE HAUL</span><h2>Your bag <span>(${cartCount()})</span></h2></div><button class="round-close" data-action="close-cart" aria-label="Close bag">${icon("x")}</button></div>${items.length ? `<div class="cart-items">${items.map((item) => { const key = `${item.ProductID}|${item.size || ""}`; return `<article class="cart-item">${imageMarkup(item.ImageURL, item.ProductName)}<div class="cart-item-copy"><strong>${escapeHTML(item.ProductName)}</strong>${item.size ? `<small>Size: ${escapeHTML(item.size)}</small>` : ""}<small>${money(item.SellingPrice)}</small><div class="quantity-control"><button data-action="quantity" data-key="${escapeHTML(key)}" data-delta="-1" aria-label="Decrease quantity">${icon("minus", 14)}</button><span>${item.quantity}</span><button data-action="quantity" data-key="${escapeHTML(key)}" data-delta="1" aria-label="Increase quantity">${icon("plus", 14)}</button></div></div><strong class="cart-item-total">${money(Number(item.SellingPrice) * item.quantity)}</strong><button class="remove-item" data-action="remove-cart" data-key="${escapeHTML(key)}" aria-label="Remove item">${icon("x", 15)}</button></article>`; }).join("")}</div><div class="drawer-bottom"><p><span>Subtotal</span><strong>${money(cartSubtotal())}</strong></p><small>Shipping and any applicable discounts are confirmed by the shop.</small><button class="button button-dark button-full" data-action="checkout">Continue to checkout ${icon("arrow", 17)}</button><button class="continue-shopping" data-action="close-cart">Keep looking around</button></div>` : `<div class="cart-empty"><span class="empty-bag">${icon("bag", 28)}</span><h3>Your bag has room for a good find.</h3><p>Have a look around and add something you love.</p><button class="button button-dark" data-action="close-cart">Explore the collection ${icon("arrow", 16)}</button></div>`}</aside></div>`;
}

function renderCheckout() {
  const items = currentCartItems();
  const subtotal = cartSubtotal();
  const discount = state.appliedCoupon && !getCouponIssue(state.appliedCoupon, subtotal) ? couponDiscount(state.appliedCoupon, subtotal) : 0;
  const total = Math.max(0, subtotal - discount);
  const appliedCode = discount ? state.appliedCoupon.CouponCode : "";
  const couponState = discount ? "success" : state.couponMessage ? "error" : "";
  const couponMessage = discount ? `${escapeHTML(appliedCode)} applied successfully — you saved ${money(discount)}.` : state.couponMessage;
  const celebration = discount ? `<span class="coupon-celebration" aria-hidden="true">${Array.from({ length: 12 }, (_, index) => `<i style="--i:${index}"></i>`).join("")}</span>` : "";
  return `<div class="overlay checkout-overlay" data-action="close-checkout"><section class="checkout-card" onclick="event.stopPropagation()"><div class="drawer-head"><div><span class="eyebrow">ALMOST YOURS</span><h2>A few details, then hello.</h2></div><button class="round-close" data-action="close-checkout" aria-label="Close checkout">${icon("x")}</button></div><form id="checkout-form"><div class="checkout-fields"><label>Your name<input name="fullName" required autocomplete="name" placeholder="How should we address you?"></label><label>Mobile number<input name="phone" required inputmode="tel" minlength="10" autocomplete="tel" placeholder="For order updates"></label><label>Email <span>optional</span><input name="email" type="email" autocomplete="email" placeholder="you@example.com"></label><label>Address<input name="address" required autocomplete="street-address" placeholder="House, street, area"></label><label>City<input name="city" required autocomplete="address-level2" placeholder="Your city"></label><label>PIN code <span>optional</span><input name="postalCode" inputmode="numeric" autocomplete="postal-code" placeholder="000000"></label><label class="field-wide">A note for the shop <span>optional</span><textarea name="notes" rows="2" placeholder="Anything else we should know?"></textarea></label></div><div class="checkout-coupon ${couponState}"><div class="checkout-coupon-heading"><span class="coupon-ticket">✳</span><div><strong>Have an offer code?</strong><small>We’ll check the offer and order requirements.</small></div></div><div class="checkout-coupon-entry"><input id="checkout-coupon-code" value="${escapeHTML(appliedCode || state.couponCode || "")}" placeholder="Enter coupon code" autocomplete="off" ${discount ? "readonly" : ""}><button class="button ${discount ? "coupon-remove-button" : "button-dark"}" type="button" data-action="${discount ? "remove-coupon" : "apply-coupon"}">${discount ? "Remove" : "Apply"}</button></div>${couponMessage ? `<div class="checkout-coupon-message" role="status">${celebration}${discount ? `<span class="coupon-success-mark">${icon("check", 14)}</span>` : ""}${escapeHTML(couponMessage)}</div>` : ""}</div><div class="checkout-order-lines">${items.map((item) => `<div><span>${escapeHTML(item.ProductName)}${item.size ? ` <small>Size ${escapeHTML(item.size)}</small>` : ""} × ${item.quantity}</span><strong>${money(Number(item.SellingPrice) * item.quantity)}</strong></div>`).join("")}</div><div class="checkout-summary checkout-totals"><span>Subtotal <small>${cartCount()} ${cartCount() === 1 ? "item" : "items"}</small></span><strong>${money(subtotal)}</strong></div>${discount ? `<div class="checkout-summary checkout-discount"><span>Offer savings <small>${escapeHTML(appliedCode)}</small></span><strong>−${money(discount)}</strong></div>` : ""}<div class="checkout-summary checkout-grand-total"><span>Total</span><strong>${money(total)}</strong></div><button class="button button-dark button-full" type="submit" ${state.submitting ? "disabled" : ""}>${state.submitting ? "Saving your order…" : "Save order & open WhatsApp"} ${icon("arrow", 17)}</button><p class="checkout-privacy">Your order is saved with ${escapeHTML(state.shop?.ShopName || "the shop")} before WhatsApp opens.</p></form></section></div>`;
}
function bindEvents() {
  app.querySelectorAll("[data-category]").forEach((button) => button.addEventListener("click", () => {
    state.activeCategory = button.dataset.category;
    const grid = document.querySelector("#product-grid");
    const filtered = state.products.filter((product) => (state.activeCategory === "all" || String(product.CategoryID) === state.activeCategory) && productSearchText(product).includes(state.query.toLowerCase()));
    app.querySelectorAll("[data-category]").forEach((entry) => entry.classList.toggle("selected", entry === button));
    grid.innerHTML = renderProductCards(filtered);
    document.querySelector("#product-count").textContent = `${filtered.length} lovely ${filtered.length === 1 ? "find" : "finds"}`;
    bindProductActions();
  }));

  document.querySelector("#site-search")?.addEventListener("input", (event) => {
    state.query = event.target.value;
    if (state.query.trim()) state.activeCategory = "all";
    const filtered = state.products.filter((product) => (state.activeCategory === "all" || String(product.CategoryID) === state.activeCategory) && productSearchText(product).includes(state.query.toLowerCase()));
    const grid = document.querySelector("#product-grid");
    const count = document.querySelector("#product-count");
    if (grid) grid.innerHTML = renderProductCards(filtered);
    if (count) count.textContent = `${filtered.length} lovely ${filtered.length === 1 ? "find" : "finds"}`;
    updateSearchSuggestions();
    bindProductActions();
  });
  document.querySelector("#sort-products")?.addEventListener("change", (event) => {
    const products = [...state.products].filter((product) => (state.activeCategory === "all" || String(product.CategoryID) === state.activeCategory) && productSearchText(product).includes(state.query.toLowerCase()));
    if (event.target.value === "price-asc") products.sort((a, b) => Number(a.SellingPrice) - Number(b.SellingPrice));
    if (event.target.value === "price-desc") products.sort((a, b) => Number(b.SellingPrice) - Number(a.SellingPrice));
    document.querySelector("#product-grid").innerHTML = renderProductCards(products);
    bindProductActions();
  });
  document.querySelector("#site-search")?.addEventListener("keydown", (event) => { if (event.key === "Escape") { state.query = ""; render(); } });
  document.querySelector("#checkout-coupon-code")?.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); applyCheckoutCoupon(); } });
  app.querySelectorAll("[data-action]").forEach((element) => element.addEventListener("click", (event) => {
    const action = element.dataset.action;
   if (action === "toggle-more") {
    state.moreMenuOpen = !state.moreMenuOpen;
    render();
    return;
   }
   if (action === "toggle-menu") {
    state.mobileMenuOpen = !state.mobileMenuOpen;
    render();
    return;
}

if (action === "open-cart") {
    state.cartOpen = true;
    render();
    return;
}

if (action === "close-cart") {
    state.cartOpen = false;
    render();
    return;
}

if (action === "close-checkout") {
    state.checkoutOpen = false;
    state.cartOpen = true;
    render();
    return;
}

if (action === "close-overlay" && event.target === element) {
    state.cartOpen = false;
    state.checkoutOpen = false;
    render();
    return;
}

if (action === "checkout") {
    state.cartOpen = false;
    state.checkoutOpen = true;
    render();
    return;
}

if (action === "apply-coupon") { applyCheckoutCoupon(); return; }
if (action === "remove-coupon") { state.appliedCoupon = null; state.couponCode = ""; state.couponMessage = "Offer removed."; render(); return; }
if (action === "clear-search") {
    state.query = "";
    render();
    return;
}
    if (action === "open-inquiry") { event.preventDefault(); showInquiryModal(element.dataset.serviceId || ""); return; }
    if (action === "checkout") { state.cartOpen = false; state.checkoutOpen = true; render(); }
    if (action === "apply-coupon") { applyCheckoutCoupon(); return; }
if (action === "remove-coupon") { state.appliedCoupon = null; state.couponCode = ""; state.couponMessage = "Offer removed."; render(); return; }
if (action === "clear-search") { state.query = ""; render(); }
  }));
  bindProductActions();
  app.querySelectorAll("[data-service-id]").forEach((card) => {
    const open = () => showServiceDetail(card.dataset.serviceId);
    card.addEventListener("click", open);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); }
    });
  });
  app.querySelectorAll("[data-open-image]").forEach((button) => button.addEventListener("click", () => showImageLightbox(button.dataset.openImage, button.dataset.imageAlt || "Portfolio image")));
  app.querySelectorAll("[data-open-video]").forEach((button) => button.addEventListener("click", () => showVideoLightbox(button.dataset.openVideo)));
  bindMediaCarousels(app);
  document.querySelector("#checkout-form")?.addEventListener("submit", submitOrder);
}

function bindMediaCarousels(root) {
  root.querySelectorAll("[data-media-carousel]").forEach((carousel) => {
    if (carousel.dataset.carouselBound) return;
    carousel.dataset.carouselBound = "true";
    const slides = [...carousel.querySelectorAll("[data-carousel-slide]")];
    if (!slides.length) return;
    let current = 0;
    let ignoreSwipeClick = false;
    const show = (index) => {
      current = (index + slides.length) % slides.length;
      slides.forEach((slide, slideIndex) => {
        slide.hidden = slideIndex !== current;
        slide.classList.toggle("is-current", slideIndex === current);
      });
      carousel.querySelectorAll("[data-carousel-go]").forEach((button) => button.classList.toggle("is-current", Number(button.dataset.carouselGo) === current));
      const count = carousel.querySelector("[data-carousel-count]");
      if (count) count.textContent = `${String(current + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`;
    };
    carousel.querySelector("[data-carousel-prev]")?.addEventListener("click", () => show(current - 1));
    carousel.querySelector("[data-carousel-next]")?.addEventListener("click", () => show(current + 1));
    carousel.querySelectorAll("[data-carousel-go]").forEach((button) => button.addEventListener("click", () => show(Number(button.dataset.carouselGo))));
    slides.forEach((slide) => slide.addEventListener("click", (event) => {
      if (ignoreSwipeClick) { event.preventDefault(); ignoreSwipeClick = false; return; }
      showImageLightbox(slide.dataset.carouselImage, slide.dataset.carouselAlt || "Image");
    }));
    let touchStartX = null;
    carousel.addEventListener("touchstart", (event) => { touchStartX = event.changedTouches[0]?.clientX ?? null; }, { passive: true });
    carousel.addEventListener("touchend", (event) => {
      if (touchStartX === null) return;
      const distance = (event.changedTouches[0]?.clientX ?? touchStartX) - touchStartX;
      if (Math.abs(distance) > 45 && slides.length > 1) { show(current + (distance < 0 ? 1 : -1)); ignoreSwipeClick = true; setTimeout(() => { ignoreSwipeClick = false; }, 250); }
      touchStartX = null;
    }, { passive: true });
  });
}

function addCartItem(productID, size = "") {
  const existing = state.cart.find((item) => Number(item.productID) === Number(productID) && String(item.size || "") === String(size || ""));
  if (existing) existing.quantity += 1;
  else state.cart.push({ productID: Number(productID), size: String(size || ""), quantity: 1 });
  storeCart();
}

function bindProductActions() {
  app.querySelectorAll('[data-action="add-cart"], [data-action="product-detail"]').forEach((button) => button.addEventListener("click", () => {
    const productID = Number(button.dataset.id);
    if (button.dataset.action === "product-detail") return showProductDetail(productID);
    const product = state.products.find((entry) => Number(entry.ProductID) === productID);
    const size = app.querySelector("[data-product-size]")?.value || "";
    if (getProductSizes(product).length && !size) { app.querySelector("[data-product-size]")?.focus(); showNotice("Please choose a size first."); return; }
    addCartItem(productID, size);
    storeCart();
    button.classList.add("added");
    button.innerHTML = icon("check", 18);
    setTimeout(() => { if (button.isConnected) { button.classList.remove("added"); button.innerHTML = icon("plus", 18); } }, 900);
    const counter = document.querySelector(".cart-count");
    if (counter) counter.textContent = cartCount();
  }));
  app.querySelectorAll('[data-action="quantity"], [data-action="remove-cart"]').forEach((button) => button.addEventListener("click", () => {
    const [id, ...sizeParts] = String(button.dataset.key || button.dataset.id).split("|");
    const productID = Number(id);
    const size = sizeParts.join("|");
    const item = state.cart.find((entry) => Number(entry.productID) === productID && String(entry.size || "") === size);
    if (button.dataset.action === "remove-cart" || (item && item.quantity + Number(button.dataset.delta) <= 0)) state.cart = state.cart.filter((entry) => !(Number(entry.productID) === productID && String(entry.size || "") === size));
    else if (item) item.quantity += Number(button.dataset.delta);
    storeCart(); render();
  }));
}

function showProductDetail(productID) {
  const product = state.products.find((entry) => Number(entry.ProductID) === productID);
  if (!product) return;
  const productImages = (Array.isArray(product.Images) ? product.Images.map((image) => typeof image === "string" ? image : image.ImageURL || image.imageURL || image.url).filter((image) => Boolean(safeImage(image))) : []).slice(0, 10);
  if (safeImage(product.ImageURL) && !productImages.includes(product.ImageURL)) productImages.unshift(product.ImageURL);
  const modal = document.createElement("div");
  modal.className = "overlay product-overlay";
  const sizes = getProductSizes(product);
  modal.innerHTML = `<section class="product-modal"><button class="round-close" data-close aria-label="Close">${icon("x")}</button><div class="product-modal-gallery">${productImages.length ? renderMediaCarousel(productImages, product.ProductName, "product-detail-carousel") : `<div class="product-modal-image">${imageMarkup(product.ImageURL, product.ProductName)}</div>`}</div><div class="product-modal-copy"><span class="eyebrow">${escapeHTML(product.BrandName ? `Brand is ${product.BrandName}` : product.CategoryName || "SHOP FAVOURITE")}</span><h2>${escapeHTML(product.ProductName)}</h2><div class="modal-price">${money(product.SellingPrice)} ${Number(product.MRP) > Number(product.SellingPrice) ? `<del>${money(product.MRP)}</del>` : ""}</div>${product.ShortDescription ? `<p class="product-short-description">${escapeHTML(product.ShortDescription)}</p>` : ""}<p>${escapeHTML(product.Description || "A thoughtful little find, picked just for you.")}</p>${renderSizeSelector(sizes, "modal-product-size")}<span class="availability"><i></i> ${Number(product.StockQuantity) > 0 ? "Available now" : "Ask us for availability"}</span><button class="button button-dark button-full" data-add>Add to your bag ${icon("bag", 17)}</button><small>Need a hand? Message the shop directly after checkout.</small></div></section>`;
  app.appendChild(modal);
  bindMediaCarousels(modal);
  modal.addEventListener("click", (event) => { if (event.target === modal || event.target.closest("[data-close]")) modal.remove(); });
  modal.querySelector("[data-add]").addEventListener("click", () => {
    const size = modal.querySelector("[data-product-size]")?.value || "";
    if (sizes.length && !size) { modal.querySelector("[data-product-size]")?.focus(); showNotice("Please choose a size first."); return; }
    addCartItem(productID, size); storeCart(); modal.remove(); render();
  });
}

function serviceVideoMarkup(value, autoplay = false) {
  if (!value) return "";
  let url;
  try {
    const source = String(value).trim();
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(source) ? source : `https://${source}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
  } catch { return ""; }

  let embedUrl = "";
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    if (id) embedUrl = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
  } else if (["youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(host)) {
    const id = url.searchParams.get("v") || url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1];
    if (id) embedUrl = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
  } else if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = url.pathname.split("/").filter(Boolean).at(-1);
    if (id && /^\d+$/.test(id)) embedUrl = `https://player.vimeo.com/video/${id}`;
  }

  if (embedUrl) return `<div class="service-video-frame"><iframe src="${escapeHTML(`${embedUrl}${autoplay ? `${embedUrl.includes("?") ? "&" : "?"}autoplay=1` : ""}`)}" title="Service video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe></div>`;
  if (/\.(?:mp4|webm|ogg)(?:$|[?#])/i.test(url.pathname + url.search)) return `<video class="service-detail-video" src="${escapeHTML(url.href)}" controls playsinline preload="metadata" ${autoplay ? "autoplay" : ""}></video>`;
  return `<a class="service-video-link" href="${escapeHTML(url.href)}" target="_blank" rel="noopener noreferrer">Watch service video ↗</a>`;
}

function showServiceDetail(serviceID) {
  const service = state.services.find((entry) => Number(entry.ServiceID) === Number(serviceID));
  if (!service) return;
  const images = parseMediaImages(service.Images || service.ImageURLs, service.ImageURL);
  const modal = document.createElement("div");
  modal.className = "overlay product-overlay service-overlay";
  modal.innerHTML = `<section class="product-modal service-detail-modal"><button class="round-close" data-close aria-label="Close">${icon("x")}</button><div class="service-detail-media">${images.length ? renderMediaCarousel(images, service.ServiceName, "service-image-carousel") : `<div class="product-image-placeholder">${icon("bag", 38)}</div>`}${service.VideoURL ? `<button type="button" class="service-video-link" data-video="${escapeHTML(service.VideoURL)}">Watch service video ${icon("arrow", 15)}</button>` : ""}</div><div class="product-modal-copy"><span class="eyebrow">${escapeHTML(state.shop?.ShopName || "OUR SERVICE")}</span><h2>${escapeHTML(service.ServiceName)}</h2>${service.Price ? `<div class="modal-price">From ${money(service.Price)}</div>` : ""}<p>${escapeHTML(service.Description || service.ShortDescription || "Contact us to learn more about this service.")}</p><button class="button button-dark button-full" data-action="open-inquiry" data-service-id="${Number(service.ServiceID)}">Get in touch ${icon("arrow", 17)}</button></div></section>`;
  app.appendChild(modal);
  modal.addEventListener("click", (event) => { if (event.target === modal || event.target.closest("[data-close]")) modal.remove(); });
  bindMediaCarousels(modal);
  modal.querySelector("[data-video]")?.addEventListener("click", (event) => showVideoLightbox(event.currentTarget.dataset.video));
  modal.querySelector('[data-action="open-inquiry"]')?.addEventListener("click", (event) => showInquiryModal(event.currentTarget.dataset.serviceId));
}

function showImageLightbox(src, alt = "") {
  if (!src) return;
  const layer = document.createElement("div"); layer.className = "media-lightbox";
  layer.innerHTML = `<button class="media-lightbox-close" aria-label="Close">${icon("x", 22)}</button><img src="${safeImage(src)}" alt="${escapeHTML(alt)}">`;
  document.body.appendChild(layer); layer.addEventListener("click", (event) => { if (event.target === layer || event.target.closest(".media-lightbox-close")) layer.remove(); });
}

function showVideoLightbox(url) {
  if (!url) return;
  const layer = document.createElement("div"); layer.className = "media-lightbox video-lightbox";
  layer.innerHTML = `<button class="media-lightbox-close" aria-label="Close">${icon("x", 22)}</button><div class="media-lightbox-video">${serviceVideoMarkup(url, true)}</div>`;
  document.body.appendChild(layer); layer.addEventListener("click", (event) => { if (event.target === layer || event.target.closest(".media-lightbox-close")) layer.remove(); });
}

function showInquiryModal(serviceID = "") {
  const modal = document.createElement("div"); modal.className = "overlay inquiry-overlay";
  const hasWhatsapp = Boolean(normalizeWhatsAppNumber(state.settings?.WhatsAppNumber));
  const options = state.services.map((service) => `<option value="${Number(service.ServiceID)}" ${String(service.ServiceID) === String(serviceID) ? "selected" : ""}>${escapeHTML(service.ServiceName)}</option>`).join("");
  modal.innerHTML = `<section class="inquiry-card"><button class="round-close" data-close aria-label="Close">${icon("x")}</button><span class="eyebrow">A GOOD PLACE TO BEGIN</span><h2>Tell us what you have in mind.</h2><p>Share a few details and we’ll help you take the next step.</p><form id="inquiry-form"><div class="inquiry-fields"><label>Your name<input name="name" required autocomplete="name" placeholder="How should we address you?"></label><label>Phone number<input name="phone" required inputmode="tel" autocomplete="tel" placeholder="Your mobile number"></label><label>Email <span>optional</span><input name="email" type="email" autocomplete="email" placeholder="you@example.com"></label><label>Service<select name="serviceID" required><option value="">Choose a service</option>${options}</select></label><label class="inquiry-wide">What do you need? <textarea name="requirement" rows="4" required placeholder="Tell us a little about your plans, timing or requirements…"></textarea></label></div><button class="button button-dark button-full" type="submit">${hasWhatsapp ? "Continue to WhatsApp" : "Send enquiry"} ${icon("arrow", 17)}</button><small>${hasWhatsapp ? "Your enquiry is saved, then opened in WhatsApp so you can message the shop." : "Your enquiry will be sent directly to the shop."}</small></form></section>`;
  app.appendChild(modal); modal.addEventListener("click", (event) => { if (event.target === modal || event.target.closest("[data-close]")) modal.remove(); });
  modal.querySelector("#inquiry-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const submitButton = form.querySelector('button[type="submit"]');
    const whatsapp = normalizeWhatsAppNumber(state.settings?.WhatsAppNumber);
    const service = state.services.find((entry) => String(entry.ServiceID) === String(data.serviceID));
    const message = `Hello ${state.shop?.ShopName || "there"}, I’d like to enquire about ${service?.ServiceName || "a service"}.\n\nName: ${data.name}\nPhone: ${data.phone}${data.email ? `\nEmail: ${data.email}` : ""}\nService: ${service?.ServiceName || ""}\nRequirement: ${data.requirement}`;
    const whatsappURL = whatsapp ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}` : "";
    // Open WhatsApp synchronously inside the submit click so browsers don't block it after the API request.
    const whatsappWindow = whatsappURL ? window.open(whatsappURL, "_blank") : null;
    if (whatsappWindow) whatsappWindow.opener = null;
    submitButton.disabled = true;
    submitButton.textContent = "Sending your enquiry…";
    try {
      const response = await fetch(`${API_BASE}/${encodeURIComponent(state.slug)}/enquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Your enquiry could not be sent. Please try again.");
      modal.remove();
      if (whatsapp) {
        if (!whatsappWindow) showNotice("Your enquiry is saved. If WhatsApp did not open, use the shop contact details to message them.");
        else showNotice("Your enquiry is saved. Continue in WhatsApp to message the shop.");
      } else {
        showNotice("Your enquiry has been sent to the shop.");
      }
    } catch (error) {
      showNotice(error.message || "Your enquiry could not be sent. Please try again.");
      submitButton.disabled = false;
      submitButton.innerHTML = `${hasWhatsapp ? "Continue to WhatsApp" : "Send enquiry"} ${icon("arrow", 17)}`;
    }
  });
}

async function submitOrder(event) {
  event.preventDefault();
  if (!state.cart.length) return;
  state.submitting = true;
  const form = new FormData(event.currentTarget);
  const customer = Object.fromEntries(form.entries());
  const submitButton = event.currentTarget.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.innerHTML = `Saving your order… ${icon("check", 17)}`;
  try {
    const response = await fetch(`${API_BASE}/${encodeURIComponent(state.slug)}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer, items: state.cart, couponCode: state.appliedCoupon && !getCouponIssue(state.appliedCoupon) ? state.appliedCoupon.CouponCode : "" })
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || "Your order could not be saved.");
    const order = result.data;
    const lines = order.items.map((item) => `• ${item.name}${item.size ? ` (Size: ${item.size})` : ""} × ${item.quantity} — ${money(item.unitPrice * item.quantity)}`).join("\n");
    const message = `Hello ${state.shop?.ShopName || "there"}! I'd like to place this order.\n\nOrder: ${order.orderNumber}\n${lines}\n\nSubtotal: ${money(order.subtotal)}${order.discountAmount ? `\nOffer savings: -${money(order.discountAmount)} (${order.couponCode})` : ""}\nTotal: ${money(order.total)}\n\nName: ${customer.fullName}\nPhone: ${customer.phone}\nAddress: ${customer.address}, ${customer.city} ${customer.postalCode || ""}\n${customer.notes ? `Note: ${customer.notes}` : ""}`;
    state.cart = []; storeCart(); state.appliedCoupon = null; state.couponCode = ""; state.couponMessage = ""; state.checkoutOpen = false; state.submitting = false; render();
    if (order.whatsappNumber) window.open(`https://wa.me/${order.whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    else window.alert(`Order ${order.orderNumber} is saved. The shop has no WhatsApp number in Shop Settings yet.`);
  } catch (error) {
    state.submitting = false;
    submitButton.disabled = false;
    submitButton.innerHTML = `Save order & open WhatsApp ${icon("arrow", 17)}`;
    showNotice(error.message);
  }
}

function showNotice(message) {
  document.querySelector(".toast-notice")?.remove();
  const notice = document.createElement("div");
  notice.className = "toast-notice";
  notice.innerHTML = `<span>✳</span>${escapeHTML(message)}<button aria-label="Dismiss">${icon("x", 16)}</button>`;
  document.body.appendChild(notice);
  notice.querySelector("button").addEventListener("click", () => notice.remove());
  setTimeout(() => notice.remove(), 5000);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) { event.preventDefault(); document.querySelector("#site-search")?.focus(); }
  if (event.key === "Escape") { state.moreMenuOpen = false; state.cartOpen = false; state.checkoutOpen = false; document.querySelector(".product-overlay")?.remove(); document.querySelector(".media-lightbox")?.remove(); document.querySelector(".inquiry-overlay")?.remove(); render(); }
});

function syncStorefrontLocation() {
  const segments = location.pathname.split("/").filter(Boolean).map((segment) => {
    try { return decodeURIComponent(segment); } catch { return segment; }
  });
  if (segments[0] !== "shop" || String(segments[1] || "").toLowerCase() !== String(state.shop?.ShopSlug || state.slug).toLowerCase()) return false;
  const params = new URLSearchParams(location.search);
  state.route = segments.slice(2);
  state.activeCategory = params.get("category") || "all";
  state.query = params.get("q") || "";
  state.mobileMenuOpen = false;
  state.moreMenuOpen = false;
  state.cartOpen = false;
  state.checkoutOpen = false;
  render();
  if (location.hash) requestAnimationFrame(() => document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView());
  else window.scrollTo({ top: 0, behavior: "instant" });
  return true;
}

document.addEventListener("click", (event) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest("a[href]");
  if (state.moreMenuOpen && !event.target.closest(".nav-more")) {
    state.moreMenuOpen = false;
    render();
  }
  if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
  let destination;
  try { destination = new URL(link.href, location.href); } catch { return; }
  if (destination.origin !== location.origin || (destination.pathname === location.pathname && destination.search === location.search)) return;
  const parts = destination.pathname.split("/").filter(Boolean);
  if (parts[0] !== "shop" || String(parts[1] || "").toLowerCase() !== String(state.shop?.ShopSlug || state.slug).toLowerCase()) return;
  event.preventDefault();
  history.pushState({}, "", `${destination.pathname}${destination.search}${destination.hash}`);
  syncStorefrontLocation();
});

window.addEventListener("popstate", syncStorefrontLocation);
loadShop();
