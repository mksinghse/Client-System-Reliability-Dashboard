# Client System Reliability Dashboard

Enterprise-grade client system reliability platform for global health, inventory, diagnostics, collector ingestion, and client comparison.

Design language extends the [WDTS CTO Dashboard](https://cto-dashboard.aiwdts.com/).

## Quick start

```bash
cd Client-System-Reliability-Dashboard
npm ci
cp .env.example .env
npx prisma db push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

Demo accounts:

- `admin@wdts.com` — Admin
- `ops@wdts.com` — Operator

## Modules

- Executive Dashboard
- Country Dashboard + client tiles
- Client Detail (collector-backed drill-down)
- Client Comparison (side-by-side + benchmarks + trends)
- Administration Portal (clients, countries, uploads, data quality, audit)

## Collector upload

Upload JSON produced by **WDTS Offline Table Diagnostic Collector** in **Admin → Uploads**.

See `samples/collector-sample.json` and `docs/ARCHITECTURE.md`.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm run start:prod` | Migrate/seed if needed + start |
| `npm test` | Unit tests (parser) |
| `npm run db:seed` | Seed demo countries/clients |

## Hosting (Render)

`render.yaml` deploys a single web service. On Render:

1. Connect this repo (standalone, or monorepo with `rootDir: Client-System-Reliability-Dashboard`)
2. Apply the Blueprint
3. Open the service URL and sign in with a demo account

Port binding uses Render’s `PORT` automatically.

Repository: https://github.com/mksinghse/Client-System-Reliability-Dashboard
