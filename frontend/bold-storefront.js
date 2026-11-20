// "Bold" storefront template: a kinetic fly-through hero, a 3D featured-product ring and a
// sticker footer. app.js decides when a shop uses it and passes in its shared helpers, so the
// cart, checkout, search and product pages keep working exactly as in the other templates.

const FONT_STYLESHEET =
  "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Inter:wght@400..700&family=Noto+Sans+Devanagari:wght@400..700&display=swap";
const GOLDEN_ANGLE = 137.508;
const MAX_TUNNEL_CARDS = 10;
const MAX_RING_CARDS = 8;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Loads the template's sans-serif fonts once, only for shops that use it. */
export function loadBoldFonts() {
  if (document.getElementById("bold-template-fonts")) return;
  const link = document.createElement("link");
  link.id = "bold-template-fonts";
  link.rel = "stylesheet";
  link.href = FONT_STYLESHEET;
  document.head.append(link);
}

export function createBoldTemplate(helpers) {
  const { state, escapeHTML, money, safeImage, icon, shopHomeUrl, normalizeWhatsAppNumber } = helpers;

  const shopName = () => state.shop?.ShopName || "Your shop";
  const productUrl = (product) => `${shopHomeUrl()}/product/${encodeURIComponent(product.Slug || product.ProductID)}`;

  function whatsAppUrl(text = "") {
    const settings = state.settings || {};
    const number = normalizeWhatsAppNumber(settings.WhatsAppNumber || state.shop?.WhatsAppNumber || settings.Phone || state.shop?.Phone);
    if (!number) return "";
    return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
  }

  /** Product photo, or a brand-coloured tile with the product's initial when there is none. */
  function productVisual(product, sizes = "") {
    const image = safeImage(product.ImageURL);
    if (image) return `<img src="${image}" alt="${escapeHTML(product.ProductName)}" loading="lazy" decoding="async" draggable="false"${sizes ? ` sizes="${sizes}"` : ""}>`;
    return `<span class="bold-tile-fallback" aria-hidden="true">${escapeHTML(String(product.ProductName || "?").trim().slice(0, 1).toUpperCase())}</span>`;
  }

  function addButton(product) {
    if (helpers.isSoldOut(product)) return `<button class="bold-ring-add" disabled>Sold out</button>`;
    const needsSize = helpers.getProductSizes(product).length > 0;
    return `<button class="bold-ring-add" data-action="${needsSize ? "product-detail" : "add-cart"}" data-id="${Number(product.ProductID)}" aria-label="${needsSize ? "Choose size for" : "Add"} ${escapeHTML(product.ProductName)} to bag">${needsSize ? "Choose size" : "Add to bag"} ${icon(needsSize ? "arrow" : "plus", 16)}</button>`;
  }

  // ---------------------------------------------------------------- hero

  function renderTunnelCards() {
    const source = state.products.length
      ? state.products
      : state.categories.map((category) => ({ ProductID: 0, ProductName: category.CategoryName, ImageURL: category.ImageURL }));
    if (!source.length) return "";
    const count = Math.min(MAX_TUNNEL_CARDS, Math.max(source.length, 6));
    return Array.from({ length: count }, (_, index) => {
      const item = source[index % source.length];
      const angle = (index * GOLDEN_ANGLE * Math.PI) / 180;
      const radius = 40 + (index % 4) * 7; // % of the stage, so cards frame the headline
      const x = 50 + Math.cos(angle) * radius;
      const y = 50 + Math.sin(angle) * radius * 0.62;
      const depth = -380 - index * 360;
      const tilt = ((index % 5) - 2) * 3;
      const label = item.ProductID
        ? `<span class="bold-tunnel-label"><b>${escapeHTML(item.ProductName)}</b>${item.SellingPrice ? `<i>${money(item.SellingPrice)}</i>` : ""}</span>`
        : `<span class="bold-tunnel-label"><b>${escapeHTML(item.ProductName)}</b></span>`;
      return `<div class="bold-tunnel-card" data-depth="${depth}" data-tilt="${tilt}" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%;transform:translate(-50%,-50%) translateZ(${depth}px) rotate(${tilt}deg)">${productVisual(item, "220px")}${label}</div>`;
    }).join("");
  }

  function renderHero() {
    const settings = state.settings || {};
    const banner = state.banners[0];
    const title = String(banner?.Title || settings.Tagline || `Welcome to ${shopName()}`).trim();
    const words = title.split(/\s+/);
    const split = Math.max(1, Math.ceil(words.length / 2));
    const firstLine = words.slice(0, split).join(" ");
    const secondLine = words.slice(split).join(" ");
    const subtitle = banner?.Subtitle || settings.AboutUs || "Good things, picked with care and easy to order.";
    const chat = whatsAppUrl(`Hi ${shopName()}, I'd like to know more.`);
    const facts = [settings.City, state.products.length ? `${state.products.length} products` : "", state.coupons.length ? `${state.coupons.length} offers live` : ""].filter(Boolean);

    return `<section class="bold-hero" data-bold-tunnel>
      <div class="bold-hero-stage">
        <div class="bold-tunnel" aria-hidden="true">${renderTunnelCards()}</div>
        <div class="bold-hero-copy">
          ${facts.length ? `<p class="bold-kicker"><span class="bold-dot"></span>${facts.map(escapeHTML).join(" · ")}</p>` : ""}
          <h1 class="bold-hero-title"><span>${escapeHTML(firstLine)}</span>${secondLine ? `<span class="is-outline">${escapeHTML(secondLine)}</span>` : ""}</h1>
          <p class="bold-hero-text">${escapeHTML(subtitle)}</p>
          <div class="bold-actions">
            <a class="bold-btn bold-btn-solid" href="#collections">Shop the collection ${icon("arrow", 18)}</a>
            ${chat ? `<a class="bold-btn bold-btn-ghost" href="${chat}" target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a>` : ""}
          </div>
        </div>
        <span class="bold-scroll-cue" aria-hidden="true">Scroll</span>
      </div>
    </section>`;
  }

  // ---------------------------------------------------------------- shopping sections

  /** Short, true facts about how this shop works (no invented delivery or return promises). */
  function renderTrustStrip() {
    const settings = state.settings || {};
    const items = [
      whatsAppUrl() ? { icon: "phone", title: "Order on WhatsApp", text: "Confirm your order in one chat" } : null,
      state.coupons.length ? { icon: "heart", title: `${state.coupons.length} ${state.coupons.length === 1 ? "offer" : "offers"} live`, text: "Apply your code at checkout" } : null,
      settings.City ? { icon: "pin", title: `Local to ${settings.City}`, text: "A real shop near you" } : null,
      settings.OpeningTime && settings.ClosingTime ? { icon: "clock", title: "Open today", text: `${settings.OpeningTime} – ${settings.ClosingTime}` } : null,
    ].filter(Boolean);
    if (!items.length) return "";
    return `<section class="bold-trust page-gutter" aria-label="Why shop here">${items.map((item) => `<div class="bold-trust-item"><span class="bold-trust-icon">${icon(item.icon, 20)}</span><p><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(item.text)}</small></p></div>`).join("")}</section>`;
  }

  /** "Shop by category" tiles. A tile filters the product grid below and scrolls to it. */
  function renderCategoryTiles() {
    if (state.categories.length < 2) return "";
    const tiles = state.categories.slice(0, 8).map((category) => {
      const inCategory = state.products.filter((product) => String(product.CategoryID) === String(category.CategoryID));
      const image = safeImage(category.ImageURL) || safeImage(inCategory.find((product) => product.ImageURL)?.ImageURL);
      const visual = image
        ? `<img src="${image}" alt="" loading="lazy" decoding="async">`
        : `<span class="bold-tile-fallback" aria-hidden="true">${escapeHTML(String(category.CategoryName || "?").slice(0, 1).toUpperCase())}</span>`;
      return `<a class="bold-cat-tile" href="#collections" data-category="${escapeHTML(String(category.CategoryID))}"><span class="bold-cat-media">${visual}</span><strong>${escapeHTML(category.CategoryName)}</strong><small>${inCategory.length} ${inCategory.length === 1 ? "item" : "items"}</small></a>`;
    }).join("");
    return `<section class="bold-categories page-gutter bold-reveal" aria-labelledby="bold-categories-title">
      <div class="bold-row-head"><h2 id="bold-categories-title">Shop by category</h2><a href="#collections">See everything ${icon("arrow", 16)}</a></div>
      <div class="bold-cat-grid">${tiles}</div>
    </section>`;
  }

  /** Products on discount, biggest saving first, in a swipeable row. */
  function renderDeals() {
    const discount = (product) => 1 - Number(product.SellingPrice) / Number(product.MRP);
    const deals = state.products
      .filter((product) => Number(product.MRP) > Number(product.SellingPrice) && Number(product.SellingPrice) > 0)
      .sort((a, b) => discount(b) - discount(a))
      .slice(0, 10);
    if (!deals.length) return "";
    const best = Math.round(discount(deals[0]) * 100);
    return `<section class="bold-deals page-gutter bold-reveal" aria-labelledby="bold-deals-title">
      <div class="bold-row-head"><h2 id="bold-deals-title">Today's deals <span class="bold-deal-flag">Up to ${best}% off</span></h2><a href="#collections">All products ${icon("arrow", 16)}</a></div>
      <div class="bold-deals-row">${helpers.renderProductCards(deals)}</div>
    </section>`;
  }

  /** Phone-only bar that keeps the bag one tap away once something is in it. */
  function renderBagBar() {
    const count = helpers.cartCount();
    return `<button type="button" class="bold-bagbar${count ? " is-visible" : ""}" data-action="open-cart" aria-label="View bag">
      <span class="bold-bagbar-count">${icon("bag", 18)} <b data-bagbar-count>${count}</b> in bag</span>
      <span class="bold-bagbar-total"><b data-bagbar-total>${money(helpers.cartSubtotal())}</b> View bag ${icon("arrow", 16)}</span>
    </button>`;
  }

  function updateBagBar() {
    const bar = document.querySelector(".bold-bagbar");
    if (!bar) return;
    const count = helpers.cartCount();
    bar.classList.toggle("is-visible", count > 0);
    bar.querySelector("[data-bagbar-count]").textContent = String(count);
    bar.querySelector("[data-bagbar-total]").textContent = money(helpers.cartSubtotal());
  }
  document.addEventListener("storefront:cart-change", updateBagBar);

  // ---------------------------------------------------------------- featured ring

  function renderFeaturedRing() {
    const products = state.products.slice(0, MAX_RING_CARDS);
    if (products.length < 3) return "";
    const total = String(products.length).padStart(2, "0");
    return `<section class="bold-featured bold-reveal" id="featured">
      <div class="bold-section-head">
        <p class="bold-kicker"><span class="bold-dot"></span>Featured</p>
        <h2>Hot right now</h2>
        <p>Drag, swipe or use the arrows to spin through our favourites.</p>
      </div>
      <div class="bold-ring" data-bold-ring tabindex="0" role="region" aria-roledescription="carousel" aria-label="Featured products. Use the left and right arrow keys to browse.">
        <div class="bold-ring-track">
          ${products.map((product, index) => `<article class="bold-ring-card" data-ring-card="${index}" aria-label="${index + 1} of ${products.length}">
            <a class="bold-ring-media" href="${productUrl(product)}" draggable="false" tabindex="-1">${productVisual(product, "(max-width: 700px) 60vw, 300px")}</a>
            <div class="bold-ring-info">
              <small>${escapeHTML(product.CategoryName || product.BrandName || shopName())}</small>
              <a href="${productUrl(product)}" tabindex="-1"><strong>${escapeHTML(product.ProductName)}</strong></a>
              <span class="bold-ring-price">${money(product.SellingPrice)}${Number(product.MRP) > Number(product.SellingPrice) ? ` <del>${money(product.MRP)}</del>` : ""}</span>
              ${addButton(product)}
            </div>
          </article>`).join("")}
        </div>
      </div>
      <div class="bold-ring-controls">
        <button type="button" class="bold-round" data-ring-prev aria-label="Previous product">${icon("arrow", 20)}</button>
        <span data-ring-count aria-live="polite">01 / ${total}</span>
        <button type="button" class="bold-round" data-ring-next aria-label="Next product">${icon("arrow", 20)}</button>
      </div>
    </section>`;
  }

  // ---------------------------------------------------------------- collection

  function renderCollection(visibleProducts) {
    const categories = state.categories.slice(0, 8);
    const chips = categories.length
      ? `<div class="category-row bold-chips"><button class="category-chip ${state.activeCategory === "all" ? "selected" : ""}" data-category="all">Everything</button>${categories.map((category) => `<button class="category-chip ${String(state.activeCategory) === String(category.CategoryID) ? "selected" : ""}" data-category="${escapeHTML(String(category.CategoryID))}">${escapeHTML(category.CategoryName)}</button>`).join("")}</div>`
      : "";
    return `<section class="bold-collection page-gutter bold-reveal" id="collections">
      <div class="bold-section-head bold-section-head-row">
        <div><p class="bold-kicker"><span class="bold-dot"></span>The collection</p><h2>Everything in store</h2></div>
        <div class="collection-toolbar bold-toolbar"><span id="product-count">${visibleProducts.length} lovely ${visibleProducts.length === 1 ? "find" : "finds"}</span><label><span>Sort</span><select id="sort-products"><option value="featured">Our favourites</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select></label></div>
      </div>
      ${chips}
      <div class="product-grid" id="product-grid">${helpers.renderProductCards(visibleProducts)}</div>
    </section>`;
  }

  // ---------------------------------------------------------------- page + footer

  function renderHome(visibleProducts) {
    const settings = state.settings || {};
    return `
      ${helpers.isPreview ? `<div class="preview-ribbon">DESIGN PREVIEW <span>·</span> EXAMPLE CONTENT ONLY</div>` : ""}
      ${helpers.renderHeader(true)}
      <main id="top" class="bold-main">
        ${renderHero()}
        ${renderTrustStrip()}
        ${renderCategoryTiles()}
        ${renderDeals()}
        ${renderFeaturedRing()}
        ${renderCollection(visibleProducts)}
        ${helpers.renderShopBrands()}
        ${helpers.renderCouponOffers()}
        ${settings.AboutUs ? `<section class="bold-statement page-gutter bold-reveal"><p class="bold-kicker"><span class="bold-dot"></span>About ${escapeHTML(shopName())}</p><p class="bold-statement-text">${escapeHTML(settings.AboutUs)}</p></section>` : ""}
      </main>
      ${renderFooter()}
      ${state.cartOpen ? helpers.renderCartDrawer() : ""}
      ${state.checkoutOpen ? helpers.renderCheckout() : ""}`;
  }

  function renderStickers() {
    const settings = state.settings || {};
    const stickers = [
      whatsAppUrl() ? { text: "Order on WhatsApp", tone: "accent" } : null,
      settings.City ? { text: `Shop local ✳ ${settings.City}`, tone: "paper" } : null,
      state.coupons.length ? { text: `${state.coupons.length} ${state.coupons.length === 1 ? "offer" : "offers"} live`, tone: "ink", burst: true } : null,
      state.products.length ? { text: `${state.products.length} things to love`, tone: "paper" } : null,
    ].filter(Boolean);
    return stickers.map((sticker, index) => `<span class="bold-sticker is-${sticker.tone}${sticker.burst ? " is-burst" : ""}" style="--i:${index}">${escapeHTML(sticker.text)}</span>`).join("");
  }

  function renderFooter() {
    const settings = state.settings || {};
    const shop = state.shop || {};
    const logo = safeImage(settings.ShopLogo || shop.LogoURL);
    const name = shopName();
    const address = [settings.Address, settings.City, settings.State, settings.Pincode].filter(Boolean).join(", ");
    const hours = settings.OpeningTime && settings.ClosingTime ? `${settings.OpeningTime} – ${settings.ClosingTime}` : "";
    const phone = settings.Phone || shop.Phone;
    const chat = whatsAppUrl(`Hi ${name}!`);
    const hasLocation = settings.Latitude !== "" && settings.Latitude != null && settings.Longitude !== "" && settings.Longitude != null;
    const directions = settings.MapURL
      ? helpers.safeUrl(settings.MapURL)
      : hasLocation
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${settings.Latitude},${settings.Longitude}`)}`
        : address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : "";
    const wordmarkWidth = Math.max(600, [...name].length * 128);
    const home = shopHomeUrl();

    return `<footer class="bold-footer">
      <div class="bold-footer-frame">
        <div class="bold-footer-top">
          <a class="bold-footer-brand" href="${home}">${logo ? `<img src="${logo}" alt="">` : `<span class="bold-monogram">${escapeHTML(name.slice(0, 1))}</span>`}<span>${escapeHTML(name)}</span></a>
          <a class="bold-starburst" href="${home}#collections"><span>Shop<br>now</span></a>
          ${chat ? `<a class="bold-chat-bubble" href="${chat}" target="_blank" rel="noopener noreferrer">Say hi on WhatsApp ${icon("arrow", 16)}</a>` : ""}
        </div>
        <div class="bold-footer-panel">
          <div class="bold-footer-cols">
            <div>
              <h3>Visit</h3>
              <p>${escapeHTML(address || "Find us in your neighbourhood.")}</p>
              ${hours ? `<p>Open ${escapeHTML(hours)}</p>` : ""}
              ${directions ? `<a href="${directions}" target="_blank" rel="noopener noreferrer">Get directions ↗</a>` : ""}
            </div>
            <div>
              <h3>Talk to us</h3>
              ${phone ? `<a href="tel:${escapeHTML(phone)}">${escapeHTML(phone)}</a>` : ""}
              ${chat ? `<a href="${chat}" target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>` : ""}
              ${settings.Email ? `<a href="mailto:${escapeHTML(settings.Email)}">${escapeHTML(settings.Email)}</a>` : ""}
              ${settings.InstagramURL ? `<a href="${helpers.safeUrl(settings.InstagramURL)}" target="_blank" rel="noopener noreferrer">Instagram ↗</a>` : ""}
            </div>
            <div>
              <h3>Explore</h3>
              <a href="${home}#collections">Shop all</a>
              ${state.coupons.length ? `<a href="${home}/offers">Offers</a>` : ""}
              <a href="${home}/about">About us</a>
              <a href="${home}/contact">Contact</a>
            </div>
          </div>
          <div class="bold-stickers">${renderStickers()}</div>
          <div class="bold-wordmark" aria-hidden="true">
            <svg viewBox="0 0 ${wordmarkWidth} 230" preserveAspectRatio="xMidYMax meet"><text x="0" y="200" textLength="${wordmarkWidth}" lengthAdjust="spacingAndGlyphs">${escapeHTML(name)}</text></svg>
          </div>
          <p class="bold-footer-legal">© ${new Date().getFullYear()} ${escapeHTML(name)}</p>
        </div>
      </div>
      ${renderBagBar()}
      ${chat ? `<a class="bold-chat-float" href="${chat}" target="_blank" rel="noopener noreferrer" aria-label="Chat with ${escapeHTML(name)} on WhatsApp">${icon("phone", 22)}</a>` : ""}
    </footer>`;
  }

  return { renderHome, renderFooter };
}

// ------------------------------------------------------------------ behaviour
// The storefront re-renders with innerHTML, so mountBold() runs after every render. It looks the
// elements up again each time; the scroll listener is added only once for the whole page.

let activeTunnel = null;
let scrollQueued = false;
let revealObserver = null;

function updateTunnel() {
  scrollQueued = false;
  if (!activeTunnel?.isConnected) return;
  const rect = activeTunnel.getBoundingClientRect();
  const travelDistance = Math.max(1, rect.height - window.innerHeight);
  applyTunnel(activeTunnel, clamp(-rect.top / travelDistance, 0, 1));
}

function applyTunnel(section, progress) {
  const cards = section.querySelectorAll(".bold-tunnel-card");
  const deepest = Math.min(...[...cards].map((card) => Number(card.dataset.depth)));
  const travel = Math.abs(deepest) + 900;
  section.style.setProperty("--p", progress.toFixed(4));
  cards.forEach((card) => {
    const z = Number(card.dataset.depth) + progress * travel;
    const fadeIn = clamp((z + 4200) / 2400, 0.15, 1);
    const fadeOut = z > 250 ? clamp(1 - (z - 250) / 450, 0, 1) : 1;
    card.style.transform = `translate(-50%,-50%) translateZ(${z.toFixed(1)}px) rotate(${card.dataset.tilt}deg)`;
    card.style.opacity = (fadeIn * fadeOut).toFixed(3);
    card.style.visibility = z > 700 ? "hidden" : "visible";
  });
}

function onScroll() {
  if (scrollQueued) return;
  scrollQueued = true;
  requestAnimationFrame(updateTunnel);
}

function mountTunnel(root) {
  activeTunnel = root.querySelector("[data-bold-tunnel]");
  if (!activeTunnel) return;
  if (reducedMotion()) {
    activeTunnel.classList.add("is-static");
    applyTunnel(activeTunnel, 0.3);
    return;
  }
  if (!window.__boldScrollBound) {
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    window.__boldScrollBound = true;
  }
  updateTunnel();
}

// Cards sit on a curved arc around the front card. Each card's place is its distance from the
// current position, wrapped around the list, so the arc works for any number of products.
const RING_STEP_DEGREES = 34;
const RING_VISIBLE_DISTANCE = 2.2;

function mountRing(ring) {
  if (ring.dataset.ringBound) return;
  ring.dataset.ringBound = "true";
  const section = ring.closest(".bold-featured");
  const track = ring.querySelector(".bold-ring-track");
  const cards = [...ring.querySelectorAll("[data-ring-card]")];
  const counter = section?.querySelector("[data-ring-count]");
  const count = cards.length;
  // Show the same number of cards on both sides of the front one.
  const visibleDistance = Math.min(RING_VISIBLE_DISTANCE, count / 2 - 0.01);
  let position = 0; // index of the card at the front; fractional while dragging
  let radius = 0;

  const wrap = (offset) => {
    const wrapped = ((offset % count) + count) % count;
    return wrapped > count / 2 ? wrapped - count : wrapped;
  };
  const frontIndex = () => ((Math.round(position) % count) + count) % count;

  const render = () => {
    const front = frontIndex();
    track.style.transform = `translateZ(${-radius}px)`;
    cards.forEach((card, index) => {
      const offset = wrap(index - position);
      const previous = Number(card.dataset.offset ?? offset);
      // A card that wraps from one end of the arc to the other jumps instead of sweeping across.
      card.classList.toggle("no-motion", Math.abs(offset - previous) > 1.5);
      card.dataset.offset = String(offset);
      const distance = Math.abs(offset);
      card.style.transform = `rotateY(${(offset * RING_STEP_DEGREES).toFixed(2)}deg) translateZ(${radius}px)`;
      card.style.setProperty("--d", distance.toFixed(3));
      card.style.opacity = distance > visibleDistance ? "0" : "";
      card.style.pointerEvents = distance > visibleDistance ? "none" : "";
      card.style.zIndex = String(100 - Math.round(distance * 10));
      const isFront = index === front;
      card.classList.toggle("is-front", isFront);
      card.setAttribute("aria-hidden", String(!isFront));
      card.querySelectorAll("a, button").forEach((element) => { element.tabIndex = isFront ? 0 : -1; });
    });
    if (counter) counter.textContent = `${String(front + 1).padStart(2, "0")} / ${String(count).padStart(2, "0")}`;
  };

  const layout = () => {
    const width = cards[0].offsetWidth || 260;
    radius = Math.round(width * 1.75);
    render();
  };
  const goTo = (index) => {
    position = Math.round(position) + wrap(index - Math.round(position));
    render();
  };
  const move = (delta) => {
    position = Math.round(position) + delta;
    render();
  };

  section?.querySelector("[data-ring-prev]")?.addEventListener("click", () => move(-1));
  section?.querySelector("[data-ring-next]")?.addEventListener("click", () => move(1));
  ring.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
    if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
  });
  cards.forEach((card, index) => card.addEventListener("click", (event) => {
    if (!card.classList.contains("is-front")) { event.preventDefault(); goTo(index); }
  }));

  // Drag / swipe. A drag of more than a few pixels never counts as a click on a card.
  let startX = 0;
  let startPosition = 0;
  let dragged = false;
  ring.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target.closest("button")) return;
    startX = event.clientX;
    startPosition = position;
    dragged = false;
    ring.classList.add("is-dragging");
    ring.setPointerCapture(event.pointerId);
  });
  ring.addEventListener("pointermove", (event) => {
    if (!ring.classList.contains("is-dragging")) return;
    const distance = event.clientX - startX;
    if (Math.abs(distance) > 6) dragged = true;
    position = startPosition - distance / ((cards[0].offsetWidth || 260) * 0.8);
    render();
  });
  const endDrag = () => {
    if (!ring.classList.contains("is-dragging")) return;
    ring.classList.remove("is-dragging");
    position = Math.round(position);
    render();
  };
  ring.addEventListener("pointerup", endDrag);
  ring.addEventListener("pointercancel", endDrag);
  ring.addEventListener("click", (event) => {
    if (dragged) { event.preventDefault(); event.stopPropagation(); dragged = false; }
  }, true);

  window.addEventListener("resize", () => { if (ring.isConnected) layout(); }, { passive: true });
  layout();
}

function mountReveal(root) {
  revealObserver?.disconnect();
  const targets = root.querySelectorAll(".bold-reveal, .bold-footer");
  if (!("IntersectionObserver" in window) || reducedMotion()) {
    targets.forEach((target) => target.classList.add("is-visible"));
    return;
  }
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.15 });
  targets.forEach((target) => revealObserver.observe(target));
}

/** Starts the template's motion after each render. Safe to call repeatedly. */
export function mountBold(root) {
  mountTunnel(root);
  root.querySelectorAll("[data-bold-ring]").forEach(mountRing);
  mountReveal(root);
}
