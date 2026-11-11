/*
  CultureFrame — Database Migration
  • Creates the database if it does not exist
  • Imports all models so Sequelize knows about every table
  • Runs sequelize.sync({ alter: true }) — safe: adds columns, never drops data
*/

import "dotenv/config";
import { Sequelize } from "sequelize";
import inquirer from "inquirer";

const DB_NAME = process.env.DB_NAME || "cultureframe";
const DB_USER = process.env.DB_USER || "root";
const DB_PASS = process.env.DB_PASS || "";
const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = process.env.DB_PORT || "3306";

// ── Step 1: ensure the database itself exists ───────────────────────────
const rootSequelize = new Sequelize("", DB_USER, DB_PASS, {
  host:    DB_HOST,
  port:    Number(DB_PORT),
  dialect: "mysql",
  logging: false
});

const { proceed } = await inquirer.prompt([{
  type:    "confirm",
  name:    "proceed",
  message: `Sync schema for '${DB_NAME}'? (safe — no data will be dropped)`,
  default: true
}]);

if (!proceed) { console.log("Migration cancelled."); process.exit(0); }

try {
  await rootSequelize.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);
  console.log(`✅ Database '${DB_NAME}' is ready.`);
} catch (err) {
  console.error("❌ Could not create database:", err.message);
  process.exit(1);
} finally {
  await rootSequelize.close();
}

// ── Step 2: import all models (registers them with the sequelize instance)
//    Must happen AFTER dotenv/config so DB_* env vars are available.
const { sequelize } = await import("./models/index.js");

// ── Step 3: authenticate ────────────────────────────────────────────────
try {
  await sequelize.authenticate();
  console.log("✅ Connected to MySQL.");
} catch (err) {
  console.error("❌ Connection failed:", err.message);
  process.exit(1);
}

// ── Step 4: sync all registered models ─────────────────────────────────
//    alter: true  → adds missing columns / indexes, never drops data.
try {
  await sequelize.sync({ alter: true });
  console.log("✅ Schema synced (alter mode — no data dropped).");
} catch (err) {
  console.error("❌ Sync failed:", err.message);
  process.exit(1);
} finally {
  await sequelize.close();
  process.exit(0);
}
