/*
  MIT License
  Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
  Mindoro State University - Philippines
*/

import "dotenv/config";
import express from "express";
import path from "path";
import session from "express-session";
import flash from "connect-flash";
import router from "./routes/index.js";
import { testConnection } from "./models/db.js";
import fs from "fs";
import hbs from "hbs";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(process.cwd(), "public")));

app.use(session({
  secret: process.env.SESSION_SECRET || "cultureframe-xianfire-fallback",
  resave: false,
  saveUninitialized: false
}));
app.use(flash());

app.engine("xian", async (filePath, options, callback) => {
  try {
    const originalPartialsDir = hbs.partialsDir;
    hbs.partialsDir = path.join(__dirname, "views");

    const result = await new Promise((resolve, reject) => {
      hbs.__express(filePath, options, (err, html) => {
        if (err) return reject(err);
        resolve(html);
      });
    });

    hbs.partialsDir = originalPartialsDir;
    callback(null, result);
  } catch (err) {
    callback(err);
  }
});

app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  next();
});

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "xian");

const partialsDir = path.join(__dirname, "views/partials");
fs.readdir(partialsDir, (err, files) => {
  if (err) {
    console.error("❌ Could not read partials directory:", err);
    return;
  }
  files
    .filter(file => file.endsWith(".xian"))
    .forEach(file => {
      const partialName = file.replace(".xian", "");
      const fullPath = path.join(partialsDir, file);
      fs.readFile(fullPath, "utf8", (err, content) => {
        if (err) {
          console.error(`❌ Failed to read partial: ${file}`, err);
          return;
        }
        hbs.registerPartial(partialName, content);
      });
    });
});

// ── Handlebars helpers ──────────────────────────────────────────────────
// formatPrice: formats a DECIMAL value as "₱1,234.00"
hbs.registerHelper("formatPrice", (value) => {
  const n = parseFloat(value);
  if (isNaN(n)) return "₱0.00";
  return "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
});

// formatDate: formats a JS Date / ISO string as "Jan 15, 2025"
hbs.registerHelper("formatDate", (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
});

// eq: equality check for use in {{#if (eq a b)}}
hbs.registerHelper("eq", (a, b) => a === b);

// inc: increment a number (used for display row numbers)
hbs.registerHelper("inc", (n) => Number(n) + 1);

app.use("/", router);

export default app;

if (!process.env.ELECTRON) {
  app.listen(PORT, async () => {
    console.log(`🔥 XianFire running at http://localhost:${PORT}`);

    // ── Database connection test ────────────────────────────────────
    const db = await testConnection();
    if (db.ok) {
      console.log("✅ MySQL connected  →  database:", process.env.DB_NAME || "cultureframe");
    } else {
      console.error("❌ MySQL connection failed:", db.error.message);
      console.error("   Check that Laragon MySQL is running and .env credentials are correct.");
    }
  });
}
