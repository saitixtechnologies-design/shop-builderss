# Going live

Shop Builder has three parts. Each one reads its settings from its **own** `.env` file locally, or
from the hosting panel's environment settings when live. Copy each `.env.example` to `.env` to start.

| Part | Folder | What it is | Settings file |
|---|---|---|---|
| API | `server/` | Express + SQL Server, the only part that talks to the database | `server/.env` |
| Admin panel | `client/` | React app for the super admin and shop owners | `client/.env` |
| Storefront | `frontend/` | The shops' public websites (plain HTML/CSS/JS) | `frontend/.env` |

Only `server/.env` holds secrets (database password, JWT secret, email). The two front ends only
hold web addresses.

## 1. Before the first deploy

1. Database: run the scripts in `database/` that your database does not have yet (each is safe to
   run more than once). Check the connection with `npm run check:db` in `server/`.
2. Decide the addresses, for example:
   - API: `https://api.yourdomain.com`
   - Admin panel: `https://admin.yourdomain.com`
   - Storefront: `https://shops.yourdomain.com` (and `*.yourdomain.com` for free shop subdomains)

## 2. API (`server/`)

### Render
New → **Blueprint** → pick this repository. `render.yaml` creates the API service; fill in the
values it asks for. Important ones:

| Key | Value |
|---|---|
| `DB_SERVER`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD` | your SQL Server details |
| `DB_TRUST_CERTIFICATE` | `Yes` for site4now / hosts with their own certificate |
| `JWT_SECRET` | a long random value (see `server/.env.example`) |
| `CORS_ORIGINS` | the admin panel and storefront addresses, comma-separated |
| `PLATFORM_DOMAIN` | your main domain (free shop subdomains) |

Uploaded photos are stored in `uploads/` on the server. Render's free plan deletes them on every
redeploy: add a persistent disk mounted at the project's `uploads` folder (paid plan), or host the
API on Hostinger.

### Hostinger (Node.js hosting / VPS)
1. hPanel → **Websites → Node.js** (Business / Cloud plans) → create an app.
2. Application root: the `server` folder. Startup file: `server.js`. Node version 24 (20–24 work).
3. Add the same environment variables as above (hPanel → the app → Environment variables), plus
   `NODE_ENV=production`.
4. Run **NPM install**, then **Start**. Point `api.yourdomain.com` at the app.

`uploads/` stays on Hostinger's disk between deploys.

## 3. Admin panel (`client/`)

Settings (`client/.env.example`):

| Key | Value |
|---|---|
| `VITE_API_URL` | the API address, e.g. `https://api.yourdomain.com` |
| `VITE_PUBLIC_SHOP_URL` | the storefront address, e.g. `https://shops.yourdomain.com` |

These are built into the app, so **rebuild after changing them**.

- **Vercel:** New project → root directory `client` → add the two variables → Deploy.
  `client/vercel.json` already sends every page address to the app.
- **Hostinger:** on your computer, put the two values in `client/.env`, run `npm install` and
  `npm run build` in `client/`, then upload the **contents of `client/dist/`** to the site's
  folder (e.g. `public_html` of `admin.yourdomain.com`). The included `.htaccess` makes page
  refreshes work.

## 4. Storefront (`frontend/`)

Settings (`frontend/.env.example`):

| Key | Value |
|---|---|
| `SHOP_API_URL` | the API address, e.g. `https://api.yourdomain.com` |
| `PLATFORM_DOMAIN` | your main domain, e.g. `yourdomain.com` (empty = no free subdomains) |

`npm run build` writes these into `env.js`, which the page loads first.

- **Vercel:** New project → root directory `frontend` → add the two variables → Deploy
  (`frontend/vercel.json` runs the build). For free subdomains, add `*.yourdomain.com` to this
  project (see `docs/DOMAINS.md`).
- **Hostinger (static):** put the two values in `frontend/.env`, run `npm run build` in
  `frontend/` (creates `env.js`), then upload the frontend files — `index.html`, `env.js`,
  `config.js`, `app.js`, `bold-storefront.js`, all `*.css` and `.htaccess` — to `public_html`.
- **Any Node host (Hostinger Node.js, Render web service):** start command `npm start` in
  `frontend/`; it reads the variables directly, no build needed.

## 5. After deploying

1. Open the API address: it should say "Shop Builder SaaS API is running".
2. Sign in to the admin panel, open a shop's **Live Preview**, and place a test order.
3. Shop owners connect their own domains in Shop Admin → Shop Settings → Website address
   (`docs/DOMAINS.md`).
