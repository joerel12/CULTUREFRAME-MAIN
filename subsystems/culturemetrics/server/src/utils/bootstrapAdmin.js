'use strict';

/**
 * bootstrapAdmin.js
 *
 * One-time CLI script to create the first CultureMetrics administrator.
 * Run with: npm run bootstrap:admin
 *
 * Reads credentials from environment variables:
 *   ADMIN_BOOTSTRAP_USERNAME
 *   ADMIN_BOOTSTRAP_EMAIL
 *   ADMIN_BOOTSTRAP_PASSWORD
 *
 * Will NOT overwrite an existing admin with the same username.
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, Admin } = require('../models');

async function bootstrap() {
  const username = process.env.ADMIN_BOOTSTRAP_USERNAME;
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;

  if (!username || !email || !password) {
    console.error('[Bootstrap] Missing required environment variables:');
    console.error('  ADMIN_BOOTSTRAP_USERNAME, ADMIN_BOOTSTRAP_EMAIL, ADMIN_BOOTSTRAP_PASSWORD');
    console.error('Set these in your .env file before running this script.');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('[Bootstrap] ADMIN_BOOTSTRAP_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }

  try {
    await sequelize.authenticate();

    const existing = await Admin.findOne({ where: { username } });
    if (existing) {
      console.log(`[Bootstrap] Admin "${username}" already exists. No changes made.`);
      process.exit(0);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await Admin.create({
      username,
      email,
      passwordHash,
      role: 'superadmin',
      isActive: true,
    });

    console.log(`[Bootstrap] Administrator created successfully.`);
    console.log(`  ID:       ${admin.id}`);
    console.log(`  Username: ${admin.username}`);
    console.log(`  Email:    ${admin.email}`);
    console.log(`  Role:     ${admin.role}`);
    console.log(`[Bootstrap] You can now log in at the CultureMetrics dashboard.`);
    console.log(`[Bootstrap] IMPORTANT: Remove ADMIN_BOOTSTRAP_PASSWORD from your .env after first login.`);
  } catch (err) {
    console.error('[Bootstrap] Failed to create admin:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

bootstrap();
