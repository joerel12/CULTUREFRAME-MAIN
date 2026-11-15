'use strict';

require('dotenv').config();
const { validateEnv } = require('./config/environment');

// Validate required environment variables before starting
try {
  validateEnv();
} catch (err) {
  console.error('[Server] Environment validation failed:', err.message);
  process.exit(1);
}

const app = require('./app');
const { sequelize, Admin, activateEphemeralStorage } = require('./models');
const { env } = require('./config/environment');
const bcrypt = require('bcryptjs');

const PORT = env.PORT;

async function initializeEphemeralDemo() {
  activateEphemeralStorage();
  try {
    const passwordHash = await bcrypt.hash(env.ADMIN_BOOTSTRAP_PASSWORD, 12);
    await Admin.create({
      username: env.ADMIN_BOOTSTRAP_USERNAME,
      email: env.ADMIN_BOOTSTRAP_EMAIL,
      passwordHash,
      role: 'superadmin',
      isActive: true,
    });
  } catch {
    console.error('[Demo] Unable to initialize the in-memory administrator. Startup is stopping.');
    process.exit(1);
    return false;
  }

  console.warn('[DB] Continuing in development-only ephemeral memory mode (no persistent changes).');
  console.warn('[Demo] A temporary administrator is ready from ADMIN_BOOTSTRAP_* configuration. Its account and changes will be lost on restart.');
  return true;
}

async function start() {
  let postgresConnected = false;
  if (env.canUseEphemeralStorage() && !env.DATABASE_CONFIGURED) {
    console.warn('[DB] No PostgreSQL configuration found; skipping the database connection attempt for local demo mode.');
  } else {
    try {
      await sequelize.authenticate();
      postgresConnected = true;
      console.log('[DB] PostgreSQL connection established.');
    } catch {
      if (!env.canUseEphemeralStorage()) {
        console.error('[DB] PostgreSQL connection failed; startup is stopping. Ephemeral storage is disabled for this environment.');
        process.exit(1);
        return;
      }
      console.warn('[DB] PostgreSQL connection/authentication failed in development mock mode.');
    }
  }

  if (!postgresConnected) {
    const initialized = await initializeEphemeralDemo();
    if (!initialized) return;
  }

  const server = app.listen(PORT, () => {
    console.log(`[Server] CultureMetrics API running on port ${PORT} (${env.NODE_ENV})`);
    console.log(`[Server] Data mode: ${env.DATA_MODE}`);
    console.log(`[Server] CultureFrame integration: ${env.CULTUREFRAME_INTEGRATION_ENABLED ? 'ENABLED' : 'DISABLED'}`);
    if (require('./models').isEphemeralStorageActive()) {
      console.log('[Server] Storage: EPHEMERAL (in-memory, process lifetime only).');
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[Server] SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      sequelize.close().then(() => {
        console.log('[Server] Database connection closed. Goodbye.');
        process.exit(0);
      });
    });
  });
}

start();
