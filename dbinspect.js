// Temporary schema inspector — delete after use
import "dotenv/config";
import { sequelize } from "./models/db.js";

const [tables] = await sequelize.query("SHOW TABLES;");
console.log("\n=== Tables in database ===");
if (tables.length === 0) {
  console.log("(none)");
} else {
  for (const row of tables) {
    const tname = Object.values(row)[0];
    console.log("\n── Table:", tname);
    const [cols] = await sequelize.query(`DESCRIBE \`${tname}\`;`);
    cols.forEach(c =>
      console.log(`   ${c.Field.padEnd(22)} ${c.Type.padEnd(22)} NULL:${c.Null} KEY:${c.Key} DEFAULT:${c.Default ?? "NULL"} ${c.Extra}`)
    );
    const [[{ cnt }]] = await sequelize.query(`SELECT COUNT(*) AS cnt FROM \`${tname}\`;`);
    console.log(`   → ${cnt} row(s)`);
  }
}

await sequelize.close();
process.exit(0);
