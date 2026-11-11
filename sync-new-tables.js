/**
 * sync-new-tables.js
 * Run once to create the new sellers and payments tables.
 *
 * Usage:  node sync-new-tables.js
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);
try { require("dotenv").config(); } catch (e) {}

import { sequelize } from "./models/db.js";
import { Seller } from "./models/Seller.js";
import { Payment } from "./models/Payment.js";
import { Follow } from "./models/Follow.js";

(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ DB connected");

    await Seller.sync({ alter: true });
    console.log("✅ sellers table ready");

    await Payment.sync({ alter: true });
    console.log("✅ payments table ready");

    await Follow.sync({ alter: true });
    console.log("✅ follows table ready");

    console.log("\n🎉 New tables synced successfully.\n");
    process.exit(0);
  } catch (err) {
    console.error("❌ sync failed:", err.message);
    process.exit(1);
  }
})();
