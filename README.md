# Shop Builder SaaS

A multi-shop website builder: every shop owner gets an online store (or service website) with
their own products, design and address, managed from their own Shop Admin. A super admin
manages all shops. Each shop's data is kept separate from every other shop.

## Folders

```
shop-builder-saas/
├── server/          API — Express + SQL Server (the only part with database access)
│   ├── config/        database connection
│   ├── controllers/   request handlers (super admin, shop admin, public storefront)
│   ├── middleware/    sign-in checks, shop access, rate limits
│   ├── routes/        URL → controller
│   ├── services/      email, OTP, shop domains
│   ├── utils/         small helpers
│   └── scripts/       check-db.js (npm run check:db)
├── client/          Admin panel — React + Vite (super admin and Shop Admin)
│   └── src/  pages/ components/ layouts/ lib/ styles/
├── frontend/        Storefront — the shops' public websites (plain HTML/CSS/JS)
│   └── scripts/     builds env.js from the storefront's settings
├── database/        SQL: full schema (Database.sql) and update scripts (*Migration.sql)
├── docs/            DEPLOYMENT.md (going live), DOMAINS.md (shop addresses)
├── uploads/         photos uploaded by shops (not in git)
└── render.yaml      Render blueprint for the API
```

## Run it on your computer

Requirements: Node.js 20+ and access to the SQL Server database.

```bash
cp server/.env.example server/.env        # then fill in the database details and JWT_SECRET
cp client/.env.example client/.env
cp frontend/.env.example frontend/.env
```

Install once:

```bash
npm --prefix server install
npm --prefix client install
```

Start each part in its own terminal:

```bash
npm --prefix server run dev
```

```bash
npm --prefix client run dev
```

```bash
npm --prefix frontend run dev
```

| Address | What |
|---|---|
| http://localhost:5001 | API |
| http://localhost:5173/admin/login | Super admin |
| http://localhost:5173/shop/login | Shop Admin |
| http://localhost:5174/shop/&lt;shop-slug&gt; | A shop's website |
| http://&lt;shop-slug&gt;.localhost:5174 | The same shop on its free subdomain address |

## Settings

Each part has its own `.env` (copy from `.env.example`). Secrets live only in `server/.env`; the
admin panel and storefront only hold web addresses. `.env` files are never committed.

## Going live

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for Render, Vercel and Hostinger, and
[docs/DOMAINS.md](docs/DOMAINS.md) for free subdomains and shops' own domains.
