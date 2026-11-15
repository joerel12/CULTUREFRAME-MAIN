import "dotenv/config";
import { Client } from "pg";
import { spawn } from "node:child_process";

const service = process.argv[2];
const config = {
  main: { database: null, cwd: ".", setup: [["node", ["scripts/sync-render-db.mjs"]], ["node", ["scripts/seed-mansalay-content.mjs"]]], start: ["node", ["index.js"]] },
  visitor: { database: "cultureframe_visitor", cwd: "subsystems/visitor-information/backend", setup: [["npx", ["prisma", "migrate", "deploy"]], ["node", ["dist/prisma/seed.js"]]], start: ["node", ["dist/src/server.js"]] },
  metrics: { database: "cultureframe_metrics", cwd: "subsystems/culturemetrics/server", setup: [["npm", ["run", "db:migrate"]], ["npm", ["run", "bootstrap:admin"]]], start: ["npm", ["start"]] },
  payments: { database: "cultureframe_payments", cwd: "subsystems/cultureframe-payments", setup: [["npm", ["run", "db:postgres:deploy"]]], start: ["npm", ["start"]] }
}[service];

if (!config || !process.env.DATABASE_URL) throw new Error("Valid service and DATABASE_URL are required.");
const environment = { ...process.env };
if (process.env.RENDER_EXTERNAL_URL) {
  if (service === "visitor") environment.FRONTEND_ORIGIN = process.env.RENDER_EXTERNAL_URL;
  if (service === "metrics") environment.CLIENT_URL = process.env.RENDER_EXTERNAL_URL;
  if (service === "payments") environment.APP_URL = process.env.RENDER_EXTERNAL_URL;
}
if (config.database) {
  const connection = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await connection.connect();
    const existing = await connection.query("SELECT 1 FROM pg_database WHERE datname = $1", [config.database]);
    if (!existing.rowCount) {
      try { await connection.query(`CREATE DATABASE "${config.database}"`); }
      catch (error) { if (error.code !== "42P04") throw error; }
    }
  } finally { await connection.end(); }
  const url = new URL(process.env.DATABASE_URL);
  url.pathname = `/${config.database}`;
  environment.DATABASE_URL = url.toString();
}

const run = ([command, args]) => new Promise((resolve, reject) => {
  const executable = process.platform === "win32" && ["npm", "npx"].includes(command) ? `${command}.cmd` : command;
  const child = spawn(executable, args, { cwd: config.cwd, env: environment, stdio: "inherit", shell: process.platform === "win32" });
  child.on("error", reject);
  child.on("exit", code => code === 0 ? resolve() : reject(new Error(`${command} exited with code ${code}`)));
});

for (const command of config.setup) await run(command);
if (process.env.RENDER_SETUP_ONLY !== "true") await run(config.start);
