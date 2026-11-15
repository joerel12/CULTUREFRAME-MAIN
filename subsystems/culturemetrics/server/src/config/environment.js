require('dotenv').config();
const crypto = require('crypto');

const nodeEnv = process.env.NODE_ENV || 'development';
const dataMode = process.env.CULTUREMETRICS_DATA_MODE || 'mock';
const allowEphemeralDefaults = nodeEnv === 'development' && dataMode === 'mock';

const env = {
  NODE_ENV: nodeEnv,
  PORT: parseInt(process.env.PORT || '5000', 10),
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',

  DATABASE_URL: process.env.DATABASE_URL || '',
  DATABASE_CONFIGURED: Boolean(
    process.env.DATABASE_URL || process.env.DB_HOST || process.env.DB_USER || process.env.DB_PASS ||
    process.env.DB_NAME || process.env.DB_PORT
  ),

  // Process-local secrets keep a no-configuration local demo possible. They
  // are intentionally unavailable outside development mock mode.
  JWT_SECRET: process.env.JWT_SECRET || (allowEphemeralDefaults ? crypto.randomBytes(64).toString('hex') : ''),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  SESSION_SECRET: process.env.SESSION_SECRET || (allowEphemeralDefaults ? crypto.randomBytes(64).toString('hex') : ''),
  CULTUREFRAME_SSO_SECRET: process.env.CULTUREFRAME_SSO_SECRET || (nodeEnv === 'production' ? '' : 'cultureframe-local-sso-secret-change-before-production-2026'),

  // These defaults only create the in-memory local demo admin. Normal database
  // mode continues to require the explicit bootstrap-admin CLI operation.
  ADMIN_BOOTSTRAP_USERNAME: process.env.ADMIN_BOOTSTRAP_USERNAME || (allowEphemeralDefaults ? 'demo-admin' : ''),
  ADMIN_BOOTSTRAP_EMAIL: process.env.ADMIN_BOOTSTRAP_EMAIL || (allowEphemeralDefaults ? 'demo-admin@culturemetrics.local' : ''),
  ADMIN_BOOTSTRAP_PASSWORD: process.env.ADMIN_BOOTSTRAP_PASSWORD || (allowEphemeralDefaults ? 'DemoPassword123!' : ''),

  CULTUREFRAME_API_URL: process.env.CULTUREFRAME_API_URL || 'https://jennycultureframe-1.onrender.com',
  CULTUREFRAME_API_TOKEN: process.env.CULTUREFRAME_API_TOKEN || '',
  CULTUREFRAME_API_TIMEOUT_MS: parseInt(process.env.CULTUREFRAME_API_TIMEOUT_MS || '15000', 10),
  CULTUREFRAME_INTEGRATION_ENABLED: process.env.CULTUREFRAME_INTEGRATION_ENABLED === 'true',

  // "mock" | "live"; persisted run snapshots are diagnostic only.
  DATA_MODE: dataMode,

  isProduction: () => nodeEnv === 'production',
  isDevelopment: () => nodeEnv === 'development',
  canUseEphemeralStorage: () => nodeEnv === 'development' && dataMode === 'mock',
};

function validateEnv() {
  const required = ['JWT_SECRET', 'SESSION_SECRET', 'CULTUREFRAME_SSO_SECRET'];
  if (!env.canUseEphemeralStorage()) required.push('DATABASE_URL');
  const missing = required.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  if (!['mock', 'live'].includes(env.DATA_MODE)) {
    throw new Error('CULTUREMETRICS_DATA_MODE must be either "mock" or "live".');
  }
  if (env.CULTUREFRAME_SSO_SECRET.length < 32) {
    throw new Error('CULTUREFRAME_SSO_SECRET must contain at least 32 characters.');
  }
  if (env.isProduction() && env.DATA_MODE === 'mock') {
    console.warn('[ENV] WARNING: CULTUREMETRICS_DATA_MODE is "mock" in production. Set to "live" when CultureFrame integration is ready.');
  }
  if (env.canUseEphemeralStorage()) {
    if (!env.ADMIN_BOOTSTRAP_USERNAME || !env.ADMIN_BOOTSTRAP_EMAIL || !env.ADMIN_BOOTSTRAP_PASSWORD) {
      throw new Error('ADMIN_BOOTSTRAP_USERNAME, ADMIN_BOOTSTRAP_EMAIL, and ADMIN_BOOTSTRAP_PASSWORD must be configured for local demo mode.');
    }
    if (env.ADMIN_BOOTSTRAP_PASSWORD.length < 8) {
      throw new Error('ADMIN_BOOTSTRAP_PASSWORD must be at least 8 characters in local demo mode.');
    }
  }
}

module.exports = { env, validateEnv };
