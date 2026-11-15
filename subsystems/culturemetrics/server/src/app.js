'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const { env } = require('./config/environment');
const { errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

const authRoutes = require('./routes/auth.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const reportsRoutes = require('./routes/reports.routes');
const integrationRoutes = require('./routes/integration.routes');

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [env.CLIENT_URL].filter(Boolean);

// In development, allow any localhost port so Vite port changes don't break things
const isAllowedOrigin = (origin) => {
  if (!origin) return true; // allow no-origin requests (curl, health checks)
  if (allowedOrigins.includes(origin)) return true;
  if (!env.isProduction() && /^http:\/\/localhost:\d+$/.test(origin)) return true;
  return false;
};

app.use(
  cors({
    origin: (origin, cb) => {
      if (isAllowedOrigin(origin)) return cb(null, true);
      return cb(new Error(`CORS: Origin ${origin} is not allowed.`));
    },
    credentials: true,
  })
);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(cookieParser());

// ── Logging ───────────────────────────────────────────────────────────────────
if (env.isDevelopment()) {
  app.use(morgan('dev'));
} else {
  // Production: short format without sensitive data
  app.use(morgan('short'));
}

// ── Health check (no auth, no sensitive data) ─────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'CultureMetrics API',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/v1', apiLimiter);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/integration', integrationRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found.` },
  });
});

// ── Centralized error handler ─────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
