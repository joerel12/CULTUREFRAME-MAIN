import bcrypt from "bcrypt";
import crypto from "node:crypto";

export const validRecoveryPassword = password =>
  typeof password === "string" &&
  password.length >= 12 &&
  Buffer.byteLength(password, "utf8") <= 72 &&
  password === password.trim() &&
  /[a-z]/.test(password) &&
  /[A-Z]/.test(password) &&
  /\d/.test(password) &&
  /[^A-Za-z0-9]/.test(password);

export const validRecoveryNonce = nonce =>
  typeof nonce === "string" && /^[A-Za-z0-9_-]{24,128}$/.test(nonce);

export async function resetAdminPasswordOnce(client, { password, nonce }) {
  if (!validRecoveryNonce(nonce)) {
    throw new Error("ADMIN_PASSWORD_RESET_NONCE must be 24–128 letters, digits, underscores, or hyphens.");
  }

  const nonceHash = crypto.createHash("sha256").update(nonce).digest("hex");
  await client.query("BEGIN");
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS cultureframe_admin_password_resets (
        nonce_hash CHAR(64) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    const marker = await client.query(
      "INSERT INTO cultureframe_admin_password_resets (nonce_hash) VALUES ($1) ON CONFLICT DO NOTHING RETURNING nonce_hash",
      [nonceHash]
    );
    if (!marker.rowCount) {
      await client.query("COMMIT");
      return "already-applied";
    }

    if (!validRecoveryPassword(password)) {
      throw new Error("ADMIN_INITIAL_PASSWORD must contain 12–72 UTF-8 bytes, upper/lowercase letters, a number, and a symbol, with no surrounding whitespace.");
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const email = "admin@cultureframe.com";
    const existing = await client.query(
      "SELECT id, role, status FROM users WHERE email = $1 FOR UPDATE",
      [email]
    );
    let result;
    if (existing.rowCount) {
      const admin = existing.rows[0];
      if (admin.role !== "admin" || admin.status !== "active") {
        throw new Error("The bootstrap administrator exists but is not an active administrator.");
      }
      await client.query(
        "UPDATE users SET password = $1, \"updatedAt\" = NOW() WHERE id = $2",
        [passwordHash, admin.id]
      );
      await client.query(
        "DELETE FROM session_records WHERE data::jsonb ->> 'userId' = $1",
        [String(admin.id)]
      );
      result = "reset";
    } else {
      const otherAdmin = await client.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
      if (otherAdmin.rowCount) {
        throw new Error("A different administrator already exists; recovery will not create another one.");
      }
      await client.query(
        "INSERT INTO users (name, email, password, role, status, \"createdAt\", \"updatedAt\") VALUES ($1, $2, $3, 'admin', 'active', NOW(), NOW())",
        ["System Administrator", email, passwordHash]
      );
      result = "created";
    }
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}
