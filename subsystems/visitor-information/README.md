# CultureFrame

CultureFrame is a full-stack cultural heritage information portal for Mansalay, Oriental Mindoro. Visitors browse the public site without accounts; administrator access is provisioned by the system owner. It includes a React/TypeScript frontend, Express API, Prisma/PostgreSQL persistence, session-cookie authentication, public visitor feedback, publication-controlled content, search, image attribution management, and administrator tools.

> **Scope and source-data note:** The supplied prompt references `GREGORIO BEA DIAGRAM.docx`, but that document was not included in the workspace. This implementation follows the workflows described in the pasted prompt. The landing-page photo showcase uses two verified Mansalay photographs hosted by Wikimedia Commons: Buktot Beach by The Wandering Angel (CC BY 2.0) and the Mansalay public market by Hariboneagle927 (CC BY-SA 4.0). Their source and license links are displayed beside the images. Other initial sections use designed placeholders, not purported photographs of Mansalay. Administrators must verify facts, sources, coordinates, image licenses, and permissions before publishing additional media.

## Requirements

- Node.js LTS and npm
- Docker Desktop with Compose, or a separately managed PostgreSQL 16 database

## Setup on Windows PowerShell

1. Copy `.env.example` to `backend\.env`. Set a unique `SESSION_SECRET` (at least 32 characters), a private `ADMIN_EMAIL`, and a strong `ADMIN_PASSWORD` (at least 12 characters). Prisma and the API read environment variables from the backend directory. The sample database credentials are for local development only.
2. Start the development database: `docker compose up -d database` (the container is exposed on host port `5433` to avoid conflicting with a local PostgreSQL service on `5432`).
3. Install dependencies from the project root: `npm install`; then `npm install --prefix backend` and `npm install --prefix frontend`.
4. Generate the Prisma client and apply the checked-in migration:

   ```powershell
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

5. Start both applications: `npm run dev`
6. Open `http://localhost:5173`. During development Vite proxies `/api` and `/uploads` to the backend at `http://localhost:4001`, avoiding cross-origin cookie issues.
7. Sign in at `/login` with the `ADMIN_EMAIL` and `ADMIN_PASSWORD` values from `backend\.env`. The seed command sets or resets that administrator's password. API liveness is `http://localhost:4001/api/health/live`; database readiness is `http://localhost:4001/api/health`.

The seed command creates an administrator only from the environment variables; it does not install a source-coded default credential. Keep `.env` private. Change sample PostgreSQL credentials before any shared deployment.

## Useful commands

```powershell
npm run build
npm test
npm run db:generate
npm run db:migrate
npm run db:seed
```

`npm run db:migrate` runs Prisma's development migration workflow. For production, create and review migrations in development, then use `npx prisma migrate deploy --schema backend/prisma/schema.prisma` from the backend directory.

## Features implemented

- Public landing/about pages and responsive navigation
- Public browse/detail routes for heritage, historical sites, traditions, events, attractions, festivals, and local products
- Published-only server-side search with pagination
- Administrator login, session invalidation, and forgot/reset password token flow
- Public visitor feedback with validation and rate limiting; no account or registration required
- Administrator content create/edit-publication-state/delete, homepage editor, feedback status management, media upload and attribution, locations, audit records, and database-backed counts
- Media allowlist, upload size limit, permission-gated public gallery, secure HTTP-only session cookie, hashed passwords/session tokens, authentication rate limiting, and admin API authorization
- Docker Compose PostgreSQL, Prisma schema/seed, backend validation/access tests

There is no public registration endpoint or visitor account flow. Administrators are provisioned with the seed command, which upserts the configured account and resets its password to the current `ADMIN_PASSWORD`. Password reset delivery is intentionally not connected to an email provider. In development the reset URL is printed by the API; production requires integrating a trusted mail delivery service before enabling account recovery.

The location view links to OpenStreetMap for verified administrator-entered coordinates. A map tile widget and chart views are not yet integrated. Image compression/thumbnail generation, CSRF token workflow, email delivery, full content editing UI, migration history, and end-to-end browser tests remain follow-up work; see `REQUIREMENTS_TRACEABILITY.md`.

## Deployment checklist

- Use managed PostgreSQL and TLS; set `COOKIE_SECURE=true`, a production-only secret, and the exact HTTPS frontend origin.
- Configure a trusted email delivery provider and remove development reset-link logging.
- Configure durable private media storage, image inspection/compression, backups, and attribution/consent review.
- Review privacy/terms copy, contact information, accessibility, upload malware scanning, retention rules, and legal/cultural permissions.
- Run migrations with `prisma migrate deploy` and build both packages before release.
