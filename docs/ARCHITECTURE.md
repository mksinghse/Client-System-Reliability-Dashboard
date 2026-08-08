# Client System Reliability Dashboard — Architecture

Enterprise operations platform for global client system reliability, hardware health, inventory, diagnostics, collector ingestion, and client comparison. Visual language extends the [CTO Dashboard](https://cto-dashboard.aiwdts.com/) (`wdts-deepred-contrast` + teal brand token).

## 1. Application architecture

```
┌──────────────────────────────────────────────────────────┐
│ Browser (Next.js App Router UI)                          │
│ Login · Executive · Country · Client · Compare · Admin   │
└───────────────────────────┬──────────────────────────────┘
                            │ REST / Server Actions
┌───────────────────────────▼──────────────────────────────┐
│ Next.js Route Handlers + Server Components               │
│ Auth session · Analytics · Admin APIs · Upload ingest    │
└───────────────┬─────────────────────────────┬────────────┘
                │                             │
     ┌──────────▼──────────┐       ┌──────────▼──────────┐
     │ Collector Parser    │       │ Analytics Engine    │
     │ Zod schema validate │       │ KPI / trends / map  │
     │ Health inference    │       │ Comparison / ranks  │
     └──────────┬──────────┘       └──────────┬──────────┘
                │                             │
                └──────────────┬──────────────┘
                               ▼
                     Prisma + SQLite/Postgres
         Countries · Clients · Tables · Uploads · Snapshots
```

### Front-end

| Concern | Choice |
| --- | --- |
| Framework | Next.js 15 App Router + TypeScript |
| Styling | Tailwind v4 + WDTS design tokens (deep red header, teal accent, Inter) |
| Charts | Recharts |
| State | Server Components for data; client islands for forms/compare/theme |
| Layout | Sticky header + sidebar shell, card/panel system matching CTO login aesthetics |

### Back-end

| Concern | Choice |
| --- | --- |
| API | Next.js Route Handlers under `/api/*` |
| Auth | Cookie session (`wdts_hm_session`) with role gate (VIEWER/OPERATOR/ADMIN) |
| Parser | `src/lib/collector-parser.ts` (Zod) |
| Ingest | `src/lib/ingest.ts` transactional upsert + snapshot + audit |
| Analytics | `src/lib/analytics.ts` aggregation layer |

## 2. Database schema

Core entities (see `prisma/schema.prisma`):

- **Country** — code, name, region, geo coordinates
- **Client** — country FK, environment, health score/status, inventory counters, availability
- **HardwareTable** — firmware, OS, CPU/memory/storage, network, service status
- **Peripheral / TableLog** — collector device + log detail
- **CollectorUpload** — file metadata, status, raw payload, parse counts
- **DiagnosticFinding** — open issues + recommendations
- **HealthSnapshot / ClientMetric** — historical trends
- **User / AuditLog** — RBAC + activity trail

Hierarchy: `Country → Clients → Hardware Tables`.

## 3. API architecture

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/login` | Establish session |
| POST | `/api/auth/logout` | Clear session |
| POST | `/api/uploads` | Ingest collector JSON for a client |
| POST | `/api/admin/clients` | Create client (ADMIN) |
| POST | `/api/admin/countries` | Create country (ADMIN) |

Server pages load aggregated views directly via Prisma/analytics (no extra BFF hop).

## 4. Data ingestion flow

1. Admin/Operator selects client in Upload Center
2. Uploads Offline Table Diagnostic Collector JSON
3. Parser validates schema and infers table health
4. Transaction upserts tables/peripherals/logs
5. Replaces open diagnostic findings
6. Recomputes client health score, availability, issue counts
7. Writes `HealthSnapshot` + `AuditLog`
8. Dashboards and comparison views refresh on next read

## 5. UI/UX screen map

### Login
CTO-aligned centered card, maroon brand lockup, SSO-style CTA, secure trust row, light atmospheric gradients. Dark mode supported via `data-theme`.

### Executive Dashboard
Global KPIs, country map, health pie, region stats, 14-day trend, issue classification, recent uploads.

### Country Dashboard
Country KPIs + client tiles (name, health badge, tables, criticals, last update, availability, view details).

### Client Detail
Summary, inventory table, drill-down collector details (firmware, CPU/memory/storage, peripherals, logs), findings/recommendations, upload history, trend chart.

### Comparison
Multi-client select, side-by-side metrics, benchmarks (best/most stable/highest risk/most issues), trend view.

### Admin
Client/country management, upload center, data quality KPIs, audit log.

## 6. Comparison workflow

1. Open Compare
2. Choose 2–4 clients (same or cross-country)
3. Review metric matrix + benchmarks
4. Inspect historical health trend
5. Jump to client detail for remediation

## 7. Admin workflow

1. Ensure Country exists
2. Add Client under Country
3. Upload collector output for that client
4. Validate processing history / failures
5. Confirm dashboard KPIs and audit entries

## 8. Hosting

Render Blueprint (`render.yaml`):

- Web service: Node, build `npm ci && npx prisma generate && npm run build`, start `npm run start:prod`
- SQLite file for demo persistence within instance disk (ephemeral on free tier; reseed on boot)
- Binds to `0.0.0.0:$PORT` via Next.js

## 9. Design recommendations (CTO-aligned)

- Header: WDTS deep red (`#A32136`)
- Accent actions: teal (`#006B81`)
- Primary CTA / brand lockup: maroon (`#7A1F35`)
- Surfaces: cool gray background `#F4F6F8`, white cards, soft multi-layer shadows
- Top accent bar on panels
- Status badges as pills (healthy/warn/critical/offline)
- Motion: rise-in panels, map pulse, hover lift on client tiles
