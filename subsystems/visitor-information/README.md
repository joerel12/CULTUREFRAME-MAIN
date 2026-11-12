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

`npm run db:migrate` runs Prisma's development migration workflow. For production, create and review migrations in development, then use `npx prisma migrate deploy` from the backend directory.

## Features implemented

- Public landing/about pages and responsive navigation
- Public browse/detail routes for heritage, historical sites, traditions, events, attractions, festivals, and local products
- Published-only server-side search with pagination
- Administrator login, session invalidation, and forgot/reset password token flow
- GPS-verified visitor ratings and comments with a configurable per-site radius,
  fresh high-accuracy readings, signed short-lived verification tokens, validation,
  and rate limiting; no visitor account is required
- Administrator content create/edit-publication-state/delete, homepage editor, feedback status management, media upload and attribution, locations, audit records, and database-backed counts
- Media allowlist, upload size limit, permission-gated public gallery, secure HTTP-only session cookie, hashed passwords/session tokens, authentication rate limiting, and admin API authorization
- Docker Compose PostgreSQL, Prisma schema/seed, backend validation/access tests

There is no public registration endpoint or visitor account flow. Administrators are provisioned with the seed command, which upserts the configured account and resets its password to the current `ADMIN_PASSWORD`. Password reset delivery is intentionally not connected to an email provider. In development the reset URL is printed by the API; production requires integrating a trusted mail delivery service before enabling account recovery.

The location view maps verified administrator-entered coordinates and links each
eligible place to its GPS-gated feedback form. Administrators set a feedback
radius from 25 to 2,000 meters; the default is 150 meters and browser accuracy
must be 100 meters or better. Exact visitor coordinates are evaluated in memory
and are not stored. The selected location, calculated distance, accuracy, and
verification time are stored with accepted feedback.

The seed includes Buktot Beach at `12.44872704, 121.4203594` with a 150-meter
feedback radius, based on the Provincial Tourism Office destination listing.
Administrators can add and configure more verified sites from **Admin > Locations**.

Browser geolocation is a practical presence check, not tamper-proof proof: a
technically capable visitor can spoof device coordinates. Stronger assurance
would require a native application with device attestation or a separately
controlled on-site factor such as a rotating QR code.

## Deployment checklist

- Use managed PostgreSQL and TLS; browser geolocation works only on HTTPS origins
  (with `localhost` allowed for development). Set `COOKIE_SECURE=true`, a
  production-only secret, and the exact HTTPS frontend origin.
- Configure a trusted email delivery provider and remove development reset-link logging.
- Configure durable private media storage, image inspection/compression, backups, and attribution/consent review.
- Review privacy/terms copy, contact information, accessibility, upload malware scanning, retention rules, and legal/cultural permissions.
- Run migrations with `prisma migrate deploy` and build both packages before release.
