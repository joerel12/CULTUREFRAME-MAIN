# Deployment Guide — CultureMetrics on Render

## Services to Deploy

1. **PostgreSQL** — Render managed PostgreSQL
2. **Express Backend** — Render Web Service
3. **React Frontend** — Render Static Site

---

## Step 1: Create the PostgreSQL Database

1. Go to [render.com](https://render.com) → New → PostgreSQL
2. Name it `culturemetrics-db`
3. Choose Free tier for development
4. Copy the **External Database URL** (used in backend env vars)

---

## Step 2: Deploy the Backend

1. Push your code to GitHub.
2. New → Web Service → Connect your repo.
3. Settings:
   - **Name:** `culturemetrics-api`
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free

4. Environment Variables (under Environment tab):
   ```
   NODE_ENV=production
   PORT=5000
   CLIENT_URL=https://your-frontend.onrender.com
   DATABASE_URL=<paste Render PostgreSQL external URL>
   JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
   SESSION_SECRET=<generate similarly>
   JWT_EXPIRES_IN=8h
   CULTUREFRAME_API_URL=https://jennycultureframe-1.onrender.com
   CULTUREFRAME_API_TOKEN=<from CultureFrame team>
   CULTUREFRAME_INTEGRATION_ENABLED=false
   CULTUREMETRICS_DATA_MODE=mock
   ADMIN_BOOTSTRAP_USERNAME=admin
   ADMIN_BOOTSTRAP_EMAIL=admin@yourdomain.com
   ADMIN_BOOTSTRAP_PASSWORD=<strong password — remove after first login>
   ```

5. After first deploy, run migrations via Render Shell:
   ```
   npm run db:migrate
   npm run bootstrap:admin
   ```

---

## Step 3: Deploy the Frontend

1. New → Static Site → Connect your repo.
2. Settings:
   - **Name:** `culturemetrics`
   - **Root Directory:** `client`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`

3. Environment Variables:
   ```
   VITE_API_BASE_URL=https://culturemetrics-api.onrender.com/api/v1
   ```

4. After deploy, update backend `CLIENT_URL` to match the frontend URL.

---

## Health Check

The backend exposes:
```
GET /health
```

Returns:
```json
{ "status": "ok", "service": "CultureMetrics API", "timestamp": "...", "environment": "production" }
```

Set this as the Render health check path.

---

## After Deployment

1. Visit `https://your-frontend.onrender.com/login`
2. Log in with the bootstrap credentials
3. Remove `ADMIN_BOOTSTRAP_PASSWORD` from environment variables
4. Navigate to Integration Settings to configure the CultureFrame connection

---

## Troubleshooting

| Problem | Solution |
|---|---|
| Backend won't start | Check `DATABASE_URL` is correct and database is running |
| Login fails | Run `npm run bootstrap:admin` from Render shell |
| Charts show no data | Confirm `CULTUREMETRICS_DATA_MODE=mock` for demo mode |
| CORS error | Set `CLIENT_URL` to exact frontend URL (no trailing slash) |
| Migrations fail | Check database connection and run `npm run db:migrate:undo` then re-migrate |
