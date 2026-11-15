# Render deployment for the 30-day demo

The repository root contains `render.yaml`. It creates four free web services
(main, visitor, CultureMetrics, and payments) and one free Render Postgres
instance in Singapore. Each service keeps its own PostgreSQL database in that
instance. The start command creates the extra databases, applies migrations,
seeds the Mansalay showcase, and starts the app.

## Live URLs

- Main platform and marketplace: https://cultureframe-joerel-main.onrender.com/
- Visitor guide: https://cultureframe-joerel-visitor.onrender.com/
- CultureMetrics: https://cultureframe-joerel-metrics.onrender.com/
- Payments administration: https://cultureframe-joerel-payments.onrender.com/

The Render Blueprint is `cultureframe` in Joerel's Render workspace. This
deployment uses manual sync. After pushing changes to `joerel12/CULTUREFRAME-MAIN`
`main`, run **Manual sync** on the Blueprint for configuration changes, and
deploy the latest commit for existing web services that did not redeploy.

## Deploy

1. Push this repository's `main` branch to `joerel12/CULTUREFRAME-MAIN`.
2. In Render, connect the GitHub repository and create a **Blueprint** from its
   root `render.yaml` on `main`. Review that all five resources have the **Free**
   plan before applying it.
3. When Render prompts for `ADMIN_INITIAL_PASSWORD`, enter a new password with
   12–72 UTF-8 bytes, uppercase and lowercase letters, a number, and a symbol.
   Render shares it with the payment and CultureMetrics bootstrap accounts.
   If you later correct this secret on the main service, run **Manual sync** on
   the Blueprint to copy it to the other services. Their next deploy updates a
   payment account only if its first password change is still required, and a
   CultureMetrics bootstrap account only if it has never logged in. An
   administrator can also open CultureMetrics from the main Admin side through
   the account handoff.
4. When Render prompts for `VITE_GOOGLE_MAPS_API_KEY`, enter the Maps JavaScript
   API key locally in Render. Allow the visitor service's HTTPS URL in its
   Google Cloud HTTP referrer restrictions. A missing key leaves the satellite
   map fallback in place.
5. Wait for all four health checks to pass. Open the main URL, sign in as
   `admin@cultureframe.com`, then follow the Visitor Information and
   CultureMetrics links. Open the payment service separately for its admin
   console. The payment admin must change its bootstrap password on first login.

The demo uses manual payment verification. It does not activate a real payment
gateway. Uploaded visitor media, marketplace images, sessions, and payment
proofs are stored in Postgres because free web instances lose local files when
they sleep or redeploy.

The free database expires 30 days after creation and has no managed backups.
Export any records you need before that date. The four web services share one
workspace allowance of 750 running instance hours per month; idle services
sleep after 15 minutes, and their first request after sleep may take about a
minute. The 1 GB database also holds uploaded images, so monitor its size.
