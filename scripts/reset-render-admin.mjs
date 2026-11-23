import "dotenv/config";
import { Client } from "pg";
import { resetAdminPasswordOnce } from "../services/adminPasswordRecovery.js";

const nonce = process.env.ADMIN_PASSWORD_RESET_NONCE;
if (nonce) {
  if (process.env.NODE_ENV !== "production" || !process.env.DATABASE_URL) {
    throw new Error("Administrator recovery requires production mode and DATABASE_URL.");
  }
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const result = await resetAdminPasswordOnce(client, {
      password: process.env.ADMIN_INITIAL_PASSWORD,
      nonce
    });
    console.log(`Administrator password recovery ${result}.`);
  } finally {
    await client.end();
  }
}
