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
deployment currently uses manual sync. The Blueprint specifies
`autoDeployTrigger: commit` for all four services. Run **Manual sync** once to
apply that setting and the current build commands. In the Blueprint Settings,
turn **Auto Sync** on if configuration changes in future `render.yaml` commits
should also apply automatically. After that, pushes to
`joerel12/CULTUREFRAME-MAIN` `main` rebuild each connected service. If an
existing web service does not redeploy, check its **Settings → Auto-Deploy**
setting and deploy the latest commit from its Deploys page.
The Blueprint's **Resources already up to date** message confirms its
configuration sync; check each service's **Deploys** page separately to see
which Git commit is live. A new commit after enabling **On Commit** starts the
first automatic build when earlier code pushes happened while auto-deploy was
disabled.
The main service's build command also compiles `public/tailwind.css`. If an
administrator page shows an oversized logo and plain text, sync the Blueprint
and rebuild the main service from the latest commit. The served `/tailwind.css`
must contain compiled CSS, not the three `@tailwind` source directives.

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

## Recover a forgotten main administrator password

Render's Free web services do not provide a shell. The main service includes a
one-time startup recovery for the bootstrap administrator instead. In the
`cultureframe-joerel-main` service's **Environment** page:

1. Replace `ADMIN_INITIAL_PASSWORD` with a **new** password containing 12–72
   UTF-8 bytes, uppercase and lowercase letters, a number, and a symbol. Do
   not add surrounding spaces. Keep the value private.
2. Add `ADMIN_PASSWORD_RESET_NONCE` with a new, unique 24–128 character value
   using only letters, digits, underscores, or hyphens. A generated UUID without
   hyphens works. This marker is not a password; never reuse it for another reset.
3. Choose **Save, rebuild, and deploy** so Render builds the latest main-branch
   commit with the recovery code. The main service log must show `Administrator
   password recovery reset.` (or `created.` if the account was missing), and
   the deployment must become live. The marker is recorded in PostgreSQL, so
   later restarts with the same marker cannot reset the password again.
4. Remove `ADMIN_PASSWORD_RESET_NONCE` from the service environment and save.
   Sign in at the main URL using `admin@cultureframe.com` and the new password.

This recovery affects only the main administrator account. The payment console
has its own login; CultureMetrics can be opened from the signed-in main admin
side. If the main service reports `already-applied`, choose a fresh marker.
If deployment fails, inspect its logs before trying another login; an invalid
password or a non-admin account at that email causes recovery to stop safely.

The demo uses manual payment verification. It does not activate a real payment
gateway. Uploaded visitor media, marketplace images, sessions, and payment
proofs are stored in Postgres because free web instances lose local files when
they sleep or redeploy.

The free database expires 30 days after creation and has no managed backups.
Export any records you need before that date. The four web services share one
workspace allowance of 750 running instance hours per month; idle services
sleep after 15 minutes, and their first request after sleep may take about a
minute. The 1 GB database also holds uploaded images, so monitor its size.
