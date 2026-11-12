# Requirements traceability

The source diagrams in `GREGORIO BEA DIAGRAM.docx` were not available in the workspace. The following reflects the pasted requirements as updated by the owner: visitors browse anonymously, and only administrators authenticate; visitor registration/profile flows are out of scope.

| Workflow | Routes / implementation | Data/API | Validation and tests | Status / remaining |
|---|---|---|---|---|
| 01 Visitor registration | Not applicable; visitors use the public site anonymously | No public registration endpoint | Test confirms `/api/auth/register` is unavailable | Removed per owner direction |
| 02 Administrator login | `/login`; redirects to admin dashboard | `POST /api/auth/login`, `GET /api/auth/me` | Generic invalid-credentials message, rate limiter, protected endpoint test | Login is implemented; the configured bootstrap account is not provisioned until the database is available and seeded |
| 03 Homepage | `/`; feature/category navigation | `GET /api/home`, homepage content | Published-only featured data | Implemented; hero art is an explicitly disclosed CSS placeholder |
| 04 Cultural heritage | `/heritage`, `/heritage/:slug` | `/api/heritage`, admin content API | Published-only query and 404 detail behavior | Implemented |
| 05 Historical sites | `/historical-sites`, detail route | Content records of historical-site kind | Published-only query | Implemented |
| 06 Traditions | `/traditions`, detail route | Content records of tradition kind | Published-only query | Implemented |
| 07 Cultural events | `/events`, detail route | Content records of event kind | Published-only query | Implemented; date-specific filtering not finished |
| 08 Attractions | `/attractions`, detail route | Content records of attraction kind | Published-only query | Implemented |
| 09 Search and browse | `/search` | `GET /api/search` | Server-side term/category/page support; unpublished exclusion | Keyword, content-type filter, URL-persisted query, and pagination connected |
| 10 Heritage detail | `/heritage/:slug` and other content details | `GET /api/{module}/:slug` | Missing/unpublished returns 404; test included | Implemented |
| 11 Images and gallery | `/gallery`, lightbox | `GET /api/gallery`, admin upload | MIME/size limits; approved-only public list | Implemented; thumbnails, image processing, zoom and keyboard gallery navigation remain |
| 12 Locations | `/locations`; map and `Rate this place` links | `GET /api/locations`; admin location create with GPS radius | Coordinate bounds, 25–2,000 m radius, and explicit verified flag | Map and feedback entry points render only for verified coordinates; admin edit/delete remain |
| 13 Festivals | `/festivals`, detail route | Content records of festival kind | Published-only query | Implemented |
| 14 Local products | `/local-products`, detail route | Content records of local-product kind | Published-only query | Implemented as informational content, not commerce |
| 15 Visitor feedback | Public `/visitor/feedback`; no account required | `POST /api/visitor/location-verification` issues a signed five-minute token; `POST /api/visitor/feedback` requires it | Fresh GPS reading, ≤100 m accuracy, server-side Haversine radius check, signed token, required fields/rating range, and IP rate limits | Implemented; outside, stale, inaccurate, missing, tampered, or expired location proofs cannot submit feedback |
| 16 Administrator logout | Header sign-out confirmation | `POST /api/auth/logout`, session table | Server invalidates session, cookie cleared | Implemented; anonymous visitors have no session to log out of |

## Cross-cutting coverage

| Area | Implemented | Not yet complete |
|---|---|---|
| Database | PostgreSQL Prisma schema with users, sessions, resets, categories, content, media, locations, feedback, homepage, audit logs, settings | Migration file generation is a local setup step; several module-specific tables from the prompt are represented by typed `content_records` rather than separate physical tables |
| Administrator dashboard | Live counts, content create/publish/archive/delete, homepage editor, feedback, media upload, location creation, audit log list | Rich edit UI, bulk actions, full management CRUD for categories/settings, charts/analytics trends |
| Security | Password hashing, hashed random session tokens, HTTP-only/SameSite cookies, role checks, rate limits, Zod validation, Helmet, MIME/size allowlist | Email delivery, CSRF token strategy for cross-site deployment, image content inspection, upload scanning, production security review |
| Design/accessibility | Responsive glassmorphism-inspired styles, labels, keyboard-operable controls, reduced motion | Formal WCAG audit and automated browser/accessibility suite |
| Tests | Registration endpoint disabled, malformed administrator login/feedback validation, unauthenticated admin endpoint, GPS distance/token unit tests, inside/outside geofence route tests, location-evidence persistence test, API-client error handling | Live database migration test, complete workflow matrix, Playwright geolocation/ responsive/auth/admin suite |
| Cultural media/content | Attribution and permission fields; publication gating | No authentic media or researched cultural records supplied/verified; add only with documented source/license/consent |

## Test report

Latest verification: the backend suite passes 17 tests across API validation,
main-system contracts, GPS distance and token behavior, inside/outside geofences,
and privacy-preserving feedback persistence. The frontend API-client test passes,
and production builds pass for both packages. The frontend build reports a
bundle-size advisory for its main JavaScript chunk.

The Docker PostgreSQL service could not be started because Docker Desktop's engine was unavailable, and the local PostgreSQL service rejected the sample credentials. The test suite therefore does not verify database persistence or administrator login against PostgreSQL. Start PostgreSQL with usable credentials, apply migrations, run the seed command, and add integration/Playwright tests before treating those workflows as verified.
