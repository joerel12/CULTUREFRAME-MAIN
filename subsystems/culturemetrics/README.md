# CultureMetrics

**A Sales and Business Analytics System for CultureFrame**  
Mindoro State University — BSIT Capstone Project

---

## Overview

CultureMetrics is the admin-only analytics workspace for CultureFrame. Administrators enter through the main CultureFrame Admin side using a short-lived signed handoff; the dashboard connects through authenticated REST APIs to display sales, product, order, customer, event, and destination analytics.

- **Frontend:** React + Vite + Tailwind CSS + Recharts
- **Backend:** Node.js + Express + PostgreSQL + Sequelize
- **Data mode:** Runs fully in mock/demo mode without CultureFrame connection

---

## Project Structure

```
CultureMetrics/
├── client/          React frontend
├── server/          Express backend + API
├── docs/            Architecture, API contract, deployment guides
└── README.md
```

---

## Prerequisites

- **Node.js** 18 or higher: https://nodejs.org
- **PostgreSQL** 14 or higher only for persistent database mode; it is not required for the local demo.
- **npm** (comes with Node.js)

---

## Local Demo Setup (Windows / PowerShell)

The default local configuration is development + mock data. When PostgreSQL authentication/connection fails in this exact mode, the API starts with **ephemeral in-memory storage**. No database, migrations, seeders, or `bootstrap-admin` command are needed.

```powershell
cd C:\Users\jomar\Desktop\CultureMetrics\server
npm install
cd ..
npm.cmd run dev
```

If PostgreSQL is reachable, the API keeps using the normal PostgreSQL path. Production and live mode never fall back; database connection failure stops startup.

The local demo account is read from `ADMIN_BOOTSTRAP_*` settings. Without overrides, development-only defaults are:

| Setting | Local demo default |
|---|---|
| `ADMIN_BOOTSTRAP_USERNAME` | `demo-admin` |
| `ADMIN_BOOTSTRAP_EMAIL` | `demo-admin@culturemetrics.local` |
| `ADMIN_BOOTSTRAP_PASSWORD` | `DemoPassword123!` |

These are public local demo credentials; do not use them outside a local demo. If `server/.env` exists, its `ADMIN_BOOTSTRAP_*` values override these defaults. The demo admin is created in memory at startup; changing its password works for the current process only.

Open another PowerShell terminal to run the UI:

```powershell
cd C:\Users\jomar\Desktop\CultureMetrics\client
npm install
npm.cmd run dev
```

Vite proxies API requests to the local backend. Open http://localhost:5174/login and use the development demo credentials above (or your configured `ADMIN_BOOTSTRAP_*` values).

**Ephemeral behavior:** login, the current admin/password, connection-test status, sync history, snapshots/diagnostics, and overview last-sync state exist only in the running API process. They are lost when it restarts. The app logs and dashboard Integration page identify this state. No changes are written to PostgreSQL in fallback mode.

## Persistent PostgreSQL Setup (optional for local development)

For normal persistent database mode, configure a real `DATABASE_URL`, `JWT_SECRET`, and `SESSION_SECRET` in `server/.env`, create the database, run migrations, and create the initial admin using `npm run bootstrap:admin`. Admin setup is mandatory in normal DB mode; startup does not silently provision an account there.

### 1. Clone or download the project

```powershell
cd C:\Users\jomar\Desktop\CultureMetrics
```

### 2. Set up the backend

```powershell
cd server
npm install
```

Copy the example environment file and fill in your values:

```powershell
Copy-Item .env.example .env
```

Edit `.env` with Notepad or VS Code:
- Set `DATABASE_URL` to your local PostgreSQL connection string, e.g.:
  `postgres://postgres:yourpassword@localhost:5432/culturemetrics_dev`
- Generate secrets with:
  ```powershell
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```
  Paste one value into `JWT_SECRET` and another into `SESSION_SECRET`.

### 3. Create the PostgreSQL database

Open pgAdmin or psql and run:
```sql
CREATE DATABASE culturemetrics_dev;
```

### 4. Run database migrations

```powershell
# Still in the server/ directory
npm run db:migrate
```

### 5. (Optional) Seed demo data

```powershell
npm run db:seed
```

### 6. Create the first administrator

Make sure `.env` has:
```
ADMIN_BOOTSTRAP_USERNAME=admin
ADMIN_BOOTSTRAP_EMAIL=admin@culturemetrics.local
ADMIN_BOOTSTRAP_PASSWORD=YourStrongPassword1
```

Then run:
```powershell
npm run bootstrap:admin
```

You should see:
```
[Bootstrap] Administrator created successfully.
  Username: admin
```

**Remove `ADMIN_BOOTSTRAP_PASSWORD` from `.env` after this.**

### 7. Start the backend

```powershell
npm run dev
```

The API will start at: http://localhost:5000  
Health check: http://localhost:5000/health

### 8. Set up the frontend (new terminal)

```powershell
cd C:\Users\jomar\Desktop\CultureMetrics\client
npm install
```

Copy the example environment file:
```powershell
Copy-Item .env.example .env
```

Leave `VITE_API_BASE_URL` as-is for local development (Vite proxies `/api` to the backend automatically).

### 9. Start the frontend

```powershell
npm run dev
```

The dashboard will open at: http://localhost:5174

### 10. Log in

Open http://localhost:5174/login
Username: `admin` (or whatever you set in `ADMIN_BOOTSTRAP_USERNAME`)  
Password: the password you set in `ADMIN_BOOTSTRAP_PASSWORD`

---

## Development Mode (Mock Data)

By default, `CULTUREMETRICS_DATA_MODE=mock`. All charts, tables, and metrics display fictional demo data clearly labeled as **DEMO DATA**.

This lets you develop and present the full dashboard without a live CultureFrame connection.

---

## Running Tests

```powershell
cd server
npm test
```

Tests cover: authentication (JWT, bcrypt), analytics calculations, mock provider, normalizer, CSV output.

---

## Verify API Endpoints

```powershell
# Health check
Invoke-WebRequest http://localhost:5000/health | Select-Object -ExpandProperty Content

# Login (returns JWT)
$body = '{"username":"admin","password":"YourStrongPassword1"}'
Invoke-WebRequest -Method POST -Uri http://localhost:5000/api/v1/auth/login -Body $body -ContentType "application/json" | Select-Object -ExpandProperty Content
```

---

## Connecting to CultureFrame (Live Integration)

1. Deploy the CultureFrame `integration/unified-cultureframe` branch, which implements the endpoints in `docs/CULTUREFRAME_API_CONTRACT.md`
2. They issue an integration token
3. Update your backend `.env`:
   ```
   CULTUREFRAME_API_TOKEN=<token-from-cultureframe-team>
   CULTUREFRAME_INTEGRATION_ENABLED=true
   CULTUREMETRICS_DATA_MODE=live
   ```
4. Restart the backend: `npm run dev`
5. Go to **CultureFrame Integration** in the dashboard and review the server-side readiness checklist
6. Click **Test required analytics endpoint**. This checks the contract's overview route, not just whether the CultureFrame website responds.
7. If the required endpoints are implemented, run a data check to record aggregate snapshots and diagnostics.

The analytics pages request live data directly; the recorded normalized provider snapshots are an audit/diagnostic archive and do **not** populate or replace analytics. The documented CultureFrame routes are implemented on its integration branch but are not active until that branch is reviewed and deployed. Until then, the endpoint test and live analytics will fail with a visible, actionable error. Use demo mode for presentations and development.

---

## Deployment on Render

See `docs/DEPLOYMENT.md` for complete Render deployment instructions.

---

## Documentation

| File | Description |
|---|---|
| `docs/ARCHITECTURE.md` | System architecture overview |
| `docs/CULTUREFRAME_API_CONTRACT.md` | Required CultureFrame endpoints |
| `docs/API_DOCUMENTATION.md` | CultureMetrics REST API reference |
| `docs/DATABASE_SCHEMA.md` | Database tables and fields |
| `docs/DEPLOYMENT.md` | Render deployment guide |
| `docs/TESTING.md` | How to run and extend tests |

---

## Integration Status Checklist

Before live integration is possible, CultureFrame must:

- [x] Implement 7 analytics endpoints on `integration/unified-cultureframe` (see `docs/CULTUREFRAME_API_CONTRACT.md`)
- [ ] Issue a read-only integration token
- [x] Validate Bearer token on each analytics endpoint
- [x] Return monetary values as decimal strings
- [x] Provide `paymentStatus` explicitly on order records
- [x] Keep customer personal data out of analytics endpoints

Until then, use `CULTUREMETRICS_DATA_MODE=mock`.

---

*Built with Node.js, Express, React, Tailwind CSS, and Recharts.*  
*CultureFrame: https://jennycultureframe-1.onrender.com*
