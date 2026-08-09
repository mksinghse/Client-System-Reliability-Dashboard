# Client System Reliability Dashboard

Enterprise client system reliability platform for global health, inventory, diagnostics, collector ingestion, and client comparison.

## Data sources

- **Baseline fleet:** `data/device-info-client-comparison.json` (GM / Melco / SJM / SW / Wynn / MGM — all Macau)
- **Countries:** Only countries with client data are shown (Macau today). Uploading with a new country/client creates them automatically
- **Collector:** [WDTS Offline Table Diagnostic Collector — Run from SharePoint](https://wdtablesystems.atlassian.net/wiki/spaces/SEKB/pages/5713002543/WDTS+Offline+Table+Diagnostic+Collector+Run+from+SharePoint)

Per-table hardware rows appear after Admin → Uploads. Upload a collector `.zip` (auto-extracted), single `*_SUPPORT.log`, or mapped collector JSON.

## Quick start

```bash
npm ci
cp .env.example .env
npx prisma db push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

Demo accounts (local / seeded DynamoDB):

- `admin@wdts.com` — Admin
- `ops@wdts.com` — Operator

### AWS Amplify + DynamoDB

- Amplify Hosting (SSR): `ap-south-1` app `client-system-reliability-dashboard`
- Storage: DynamoDB table `csrd-data` (single-table design)
- Env: `DYNAMODB_TABLE_NAME=csrd-data`

```bash
export AWS_PROFILE=opsninja AWS_REGION=ap-south-1 DYNAMODB_TABLE_NAME=csrd-data
npm run db:seed
```

If `CreateTable` is denied by org SCP, ask an account admin to create `csrd-data` (pk/sk + gsi1/gsi2) in `ap-south-1`, then seed.

## Modules

- Executive Dashboard
- Country Dashboard + client tiles
- Client Detail (collector-backed drill-down)
- Client Comparison (device-info metrics: OK%, heap, temp, FAILED)
- Administration Portal (clients, countries, uploads, data quality, audit)

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm run start:prod` | Migrate/seed if needed + start |
| `npm test` | Unit tests (parser) |
| `npm run db:seed` | Seed countries + comparison clients |

## Hosting (Render)

`render.yaml` deploys a single web service. Port binding uses Render’s `PORT` automatically.

Repository: https://github.com/mksinghse/Client-System-Reliability-Dashboard
