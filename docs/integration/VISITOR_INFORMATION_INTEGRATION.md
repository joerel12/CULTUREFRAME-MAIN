# Visitor Information Integration

## Source

- Repository: `https://github.com/gregoriobea/Visitor-Information.git`
- Reviewed source commit: `876588899ea975d20c26fa97a16461b89c5da50a`
- Source location in this repository: `subsystems/visitor-information/`

Visitor Information remains an independent TypeScript/Express/Prisma service
with its own database, administrator publishing workflow, media records, and
public React portal. Its source is included in this repository in an isolated
directory; its tables are not merged into the main Express/Sequelize database.
The main application continues to read its published public API over HTTP(S).

## Running the included subsystem

Run these commands from the CultureFrame repository root:

```powershell
npm run visitor:install
Copy-Item subsystems/visitor-information/.env.example subsystems/visitor-information/backend/.env
```

Edit the copied backend `.env` with a unique session secret, private administrator
credentials, and a dedicated Visitor Information PostgreSQL database. Keep it
separate from the main application's `.env` and database. The example credentials
and Compose database are for local development. If using Compose, start it from
the subsystem directory to keep its volumes scoped to that project:

```powershell
Push-Location subsystems/visitor-information
docker compose up -d database
Pop-Location
Push-Location subsystems/visitor-information/backend
npx prisma migrate deploy
npm run db:seed
Pop-Location
npm run visitor:dev
```

The seed command creates or resets the configured subsystem administrator. Run it
only against the intended Visitor database. The main database needs no Visitor
tables or migrations.

The Visitor API listens on port `4001`; its React portal listens on `5173` and
proxies `/api` and `/uploads` to `4001`. Keep `VISITOR_INFORMATION_URL=http://localhost:5173`
in the main application's environment for this development arrangement. Start
the main application separately with its existing command, `npm run xian-start`.
Its configured port must differ from the two Visitor ports. Open the main
application's `/discover` page to see the published Visitor content.

```powershell
npm run visitor:build
npm run visitor:test
node --test tests/visitorInformationIntegration.test.js
```

For production, deploy the backend and built frontend separately with a shared
HTTPS origin that routes `/api` and `/uploads` to the backend. Set the main
application's `VISITOR_INFORMATION_URL` to that origin. After building, run
`npm start` from `subsystems/visitor-information/backend` (entry point:
`dist/src/server.js`). Apply reviewed migrations with `npx prisma migrate deploy`
from that backend directory against the dedicated Visitor database. Do not run
the main application's reset migration command to set up Visitor Information.

The imported source and lockfiles come from the reviewed commit above. Subsequent
local adjustments correct the backend start path, align its default port with
the frontend proxy, and add repository-level commands and contract verification.
See the subsystem's `README.md` and `REQUIREMENTS_TRACEABILITY.md` for its existing
feature limitations and deployment prerequisites. Updating the original Visitor
repository does not automatically update this source snapshot.

## Source-of-truth rule

Visitor Information owns visitor-facing cultural documentation:

- heritage and historical sites;
- traditions;
- informational cultural events;
- attractions and festivals; and
- local-product stories that provide cultural context.

Jenny's application continues to own commerce, carts, purchasable products,
orders, sellers, payments, customer accounts, and event registrations. A local
product in Visitor Information is informational and never supplies a checkout
price or stock count. Existing `/heritage`, `/events`, `/scenic`, and `/crafts`
pages remain available while the team reviews legacy local content; the new
`/discover` area is the authoritative federated entry point.

## CultureFrame routes

| Route | Visitor API used |
| --- | --- |
| `GET /discover` | `GET /api/home` |
| `GET /discover/search` | `GET /api/search` |
| `GET /discover/:category` | `GET /api/:category` |
| `GET /discover/:category/:slug` | `GET /api/:category/:slug` |

The allowed categories are explicitly limited to `heritage`,
`historical-sites`, `traditions`, `events`, `attractions`, `festivals`, and
`local-products`. CultureFrame never proxies arbitrary paths or forwards user
cookies, sessions, authorization headers, or administrator credentials.

Remote text is normalized and rendered through Handlebars escaping. Requests
have an eight-second timeout, accept JSON only, reject oversized responses, and
show a controlled unavailable page when the service is offline or unconfigured.

## Environment configuration

Set the public root of the Visitor Information deployment:

```text
VISITOR_INFORMATION_URL=https://visitor.example.com
```

The configured URL may use HTTP on localhost for development. A non-local
production deployment must use HTTPS. Do not add `/api` to the value; the client
adds that path itself.

For local development, start the Visitor Information backend and point this
variable to the origin that serves its `/api/*` routes. The two applications can
use different ports and databases.

## Activation checklist

1. Deploy the Visitor Information backend and database.
2. Publish at least one test record through its administrator workflow.
3. Set `VISITOR_INFORMATION_URL` in Jenny's deployment.
4. Open `/discover`, a category, a detail record, and global search.
5. Stop the Visitor service once in staging and confirm the controlled
   unavailable page appears.
6. Confirm that Visitor local products do not enter Jenny's cart or checkout.

No Visitor database migration, production deployment, or content import was run
as part of this code integration.

## Verification of the included source

- Backend TypeScript compilation and frontend production build pass.
- Backend tests pass (8 tests), including a contract check that runs the main
  application's actual Visitor client against the included Express API. Only
  database reads are replaced by fixtures; publication filters are asserted.
- Frontend API-client test passes (1 test).
- The main application's Visitor integration suite passes (7 tests).
- The full main-system test run also exposes three existing failures in
  unchanged files: analytics imports an undeclared `bcrypt` package; payment
  integration expects a named `Product` export; seller integration expects a
  named `Seller` export. This import preserves those collaborators' files and
  does not claim that the complete main application is ready for deployment.
- Live PostgreSQL migrations, content persistence, and deployment activation
  require a separately configured Visitor database and were not exercised.
