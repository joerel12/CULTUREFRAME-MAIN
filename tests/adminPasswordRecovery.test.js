import "dotenv/config";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import bcrypt from "bcrypt";
import { Client } from "pg";
import {
  resetAdminPasswordOnce,
  validRecoveryNonce,
  validRecoveryPassword
} from "../services/adminPasswordRecovery.js";

test("recovery accepts only strong passwords and unique marker syntax", () => {
  assert.equal(validRecoveryPassword("StrongRecovery2026!"), true);
  assert.equal(validRecoveryPassword("admin123"), false);
  assert.equal(validRecoveryPassword(" StrongRecovery2026!"), false);
  assert.equal(validRecoveryPassword("A1!" + "a".repeat(70)), false);
  assert.equal(validRecoveryNonce(crypto.randomBytes(16).toString("hex")), true);
  assert.equal(validRecoveryNonce("reuse"), false);
});

test("recovery resets once, revokes sessions, and can create a missing bootstrap admin", {
  skip: process.env.RUN_ADMIN_RECOVERY_DB_TEST !== "true"
}, async () => {
  const connectionString = process.env.DATABASE_URL;
  assert.ok(connectionString, "DATABASE_URL is required for the isolated local test");
  assert.match(new URL(connectionString).hostname, /^(?:localhost|127\.0\.0\.1)$/);
  const schema = `admin_recovery_test_${crypto.randomBytes(6).toString("hex")}`;
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    await client.query(`CREATE TABLE users (
      id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL, role TEXT NOT NULL, status TEXT NOT NULL,
      "createdAt" TIMESTAMPTZ, "updatedAt" TIMESTAMPTZ
    )`);
    await client.query("CREATE TABLE session_records (sid TEXT PRIMARY KEY, data TEXT NOT NULL)");
    const oldHash = await bcrypt.hash("OriginalPassword2026!", 4);
    await client.query(
      "INSERT INTO users (name, email, password, role, status) VALUES ($1, $2, $3, 'admin', 'active')",
      ["System Administrator", "admin@cultureframe.com", oldHash]
    );
    await client.query(
      "INSERT INTO session_records (sid, data) VALUES ($1, $2)",
      ["old-session", JSON.stringify({ userId: 1 })]
    );

    const nonce = crypto.randomBytes(16).toString("hex");
    const password = "NewRecoveryPassword2026!";
    assert.equal(await resetAdminPasswordOnce(client, { password, nonce }), "reset");
    const changed = await client.query("SELECT password FROM users WHERE email = $1", ["admin@cultureframe.com"]);
    assert.equal(await bcrypt.compare(password, changed.rows[0].password), true);
    assert.equal((await client.query("SELECT 1 FROM session_records")).rowCount, 0);
    assert.equal(await resetAdminPasswordOnce(client, { password: "AnotherPassword2026!", nonce }), "already-applied");
    const unchanged = await client.query("SELECT password FROM users WHERE email = $1", ["admin@cultureframe.com"]);
    assert.equal(unchanged.rows[0].password, changed.rows[0].password);

    await assert.rejects(
      resetAdminPasswordOnce(client, { password: "admin123", nonce: crypto.randomBytes(16).toString("hex") }),
      /ADMIN_INITIAL_PASSWORD/
    );
    assert.equal((await client.query("SELECT 1 FROM cultureframe_admin_password_resets")).rowCount, 1);

    await client.query("DELETE FROM users");
    const newNonce = crypto.randomBytes(16).toString("hex");
    assert.equal(await resetAdminPasswordOnce(client, { password, nonce: newNonce }), "created");
    const created = await client.query("SELECT role, status, password FROM users WHERE email = $1", ["admin@cultureframe.com"]);
    assert.equal(created.rowCount, 1);
    assert.equal(created.rows[0].role, "admin");
    assert.equal(created.rows[0].status, "active");
    assert.equal(await bcrypt.compare(password, created.rows[0].password), true);
  } finally {
    await client.query("SET search_path TO public");
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await client.end();
  }
});
