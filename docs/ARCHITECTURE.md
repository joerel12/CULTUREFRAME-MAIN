# CultureMetrics Architecture

## Overview

CultureMetrics is a monorepo containing two independent applications:

```
client/   React SPA (Vite + Tailwind + Recharts)
server/   Express API (Node.js + PostgreSQL + Sequelize)
```

## Data Flow

```
Browser
  └─ React SPA (client/)
       └─ Axios HTTP → CultureMetrics API (server/)
            ├─ Auth middleware (JWT)
            ├─ Analytics services
            │    └─ DataProvider
            │         ├─ MockProvider (DATA_MODE=mock)
            │         └─ CultureFrameAdapter (DATA_MODE=live)
            │              └─ CultureFrameClient (HTTP → CultureFrame)
            ├─ Sync/data-check service → PostgreSQL (diagnostic snapshots and run history)
            └─ CSV reporter
```

## Backend Layers

| Layer | Files | Responsibility |
|---|---|---|
| Routes | `src/routes/*.routes.js` | URL mapping, middleware chain |
| Controllers | `src/controllers/*.controller.js` | Request/response handling |
| Services | `src/services/analytics/` | Metric calculations |
| Integration | `src/services/cultureframe/` | CultureFrame API client, adapter, normalizer, mock |
| Models | `src/models/` | Sequelize ORM models |
| Middleware | `src/middleware/` | Auth, validation, rate limiting, error handling |

## Key Design Decisions

- **Demo and live providers are isolated** — `CULTUREMETRICS_DATA_MODE=mock` uses fictional sample data; `live` requests CultureFrame directly. The browser does not switch the mode.
- **Normalizer validates all source data** — records with invalid fields are rejected, not silently accepted.
- **Monetary values as strings** — all financial values flow as decimal strings to avoid float imprecision.
- **JWT in httpOnly cookie + sessionStorage fallback** — secure browser auth with non-cookie client support.
- **No CultureFrame DB access** — CultureMetrics only communicates through CultureFrame's REST API.
- **Data checks are not an analytics cache** — runs retain aggregate snapshots and diagnostics, but analytics endpoints query the selected provider directly. Stored snapshots are not consumed by analytics.
- **Live pagination is bounded** — the adapter retrieves all advertised pages (up to 100 pages per endpoint) and fails visibly if pagination metadata is missing/invalid or the contract advertises more.
- **CultureFrame availability is not assumed** — the required analytics endpoints are proposed; a successful website response alone does not establish integration availability.
