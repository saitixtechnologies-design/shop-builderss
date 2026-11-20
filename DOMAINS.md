# Shop web addresses

Every shop can be opened in three ways:

| Address | Example | Needs |
|---|---|---|
| Shop link (always works) | `https://shops.example.com/shop/sneha-center` | nothing |
| Free subdomain | `https://sneha-center.shopbuilder.in` | one-time platform setup (below) |
| Shop's own domain | `https://www.snehacenter.com` | the owner connects it in Shop Admin |

The storefront (`frontend/app.js`) looks at the address it was opened on. On a subdomain or own
domain, the shop's pages live at the root (`/product/…`, `/about`, `/offers`).

## One-time platform setup

1. **Run the database update** `database/ShopDomainsMigration.sql` (adds `CustomDomain`,
   `DomainStatus`, `DomainVerifyToken`, `DomainVerifiedAt` to `dbo.Shops`). Until then, own
   domains show "not switched on yet" in Shop Admin; everything else works.
2. **Pick your main domain**, e.g. `shopbuilder.in`, and set it in two places:
   - `frontend/config.js` → `PLATFORM_DOMAIN = "shopbuilder.in"` (and `PRODUCTION_API_ORIGIN`)
   - API environment (Render) → `PLATFORM_DOMAIN=shopbuilder.in`
3. **Free subdomains:** in Vercel, add `*.shopbuilder.in` to the storefront project. Wildcard
   domains need the domain's nameservers to point to Vercel (Vercel shows the steps).
4. **Own domains with automatic https (optional):** on the API set `VERCEL_TOKEN`,
   `VERCEL_PROJECT_ID` (the storefront project) and, for a team, `VERCEL_TEAM_ID`. When an owner
   saves a domain, the API adds it to the Vercel project and Vercel issues the certificate.
   Without these, add each owner's domain to the Vercel project by hand.
   If you host the storefront somewhere else, set `DOMAIN_CNAME_TARGET` / `DOMAIN_A_RECORD`.

## How a shop owner connects their own domain

Shop Admin → Shop Settings → **Website address**:

1. Type the domain (best: `www.yourshop.com`) and press **Connect domain**.
2. At the company where they bought it (GoDaddy, Hostinger…), add the two records shown:
   - `CNAME www → cname.vercel-dns.com` (or `A @ → 76.76.21.21` for a bare domain): sends visitors to the shop
   - `TXT _shopbuilder.www → shopbuilder-verify=…`: proves the domain is theirs
3. Press **Check now**. DNS can take minutes to 24 hours. When the TXT record is found the status
   becomes **Connected** and the shop opens on the domain.

Safety: a domain only opens a shop after its TXT record is verified, one domain belongs to one
shop, and a suspended shop never opens on any address.

## Try it on your computer

Browsers treat `*.localhost` as your own computer, so the free subdomain works locally with no
setup: start the API and storefront, then open `http://sneha-center.localhost:5174/`.

## Shop on/off: two separate switches

| Switch | Who | Where | Effect |
|---|---|---|---|
| Platform status (`Shops.Status`) | Super admin only | Super admin → Shops → Active / Suspended | Suspended: website offline, owner locked out of Shop Admin at once |
| Website switch (`ShopSettings.WebsiteStatus`) | Shop owner only | Shop Admin → Shop Settings | Closed: website offline; owner can reopen any time |

The website is live only when both are on. The owner cannot change the platform status, and the
super admin's settings page shows the owner's switch read-only.
