/*
  CultureFrame — Database Connection (Sequelize + MySQL)
  Credentials are loaded from .env — never hardcoded here.
*/

import "dotenv/config";
import { Sequelize } from "sequelize";

const {
  DB_NAME = "cultureframe",
  DB_USER = "root",
  DB_PASS = "",
  DB_HOST = "localhost",
  DB_PORT = "3306"
} = process.env;

export const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
  host:    DB_HOST,
  port:    Number(DB_PORT),
  dialect: "mysql",
  logging: false,          // set to console.log to see SQL queries during dev
  pool: {
    max:     5,
    min:     0,
    acquire: 30000,
    idle:    10000
  }
});

/**
 * testConnection()
 * Calls sequelize.authenticate() — the correct Sequelize v6 method for
 * verifying that the credentials and host are reachable.
 * Returns { ok: true } on success, { ok: false, error } on failure.
 */
export async function testConnection() {
  try {
    await sequelize.authenticate();
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}
