/*
  CultureFrame — Category Seed
  Inserts the 6 official cultural heritage product categories.

  Safe to run multiple times:
    • Uses INSERT IGNORE internally (via findOrCreate) so no duplicates
      are ever created, and no existing data is overwritten.
*/

import "dotenv/config";
import { sequelize, Category } from "./models/index.js";

const CATEGORIES = [
  {
    name:        "Handwoven Products",
    description: "Textiles and fabric items crafted using traditional Mangyan and Mansalay weaving techniques."
  },
  {
    name:        "Traditional Handicrafts",
    description: "Hand-made crafts using indigenous materials such as bamboo, rattan, and native wood."
  },
  {
    name:        "Local Souvenirs",
    description: "Keepsakes and mementos that represent the cultural identity of Mansalay, Oriental Mindoro."
  },
  {
    name:        "Traditional Accessories",
    description: "Jewellery, ornaments, and wearable items inspired by indigenous Mansalay traditions."
  },
  {
    name:        "Indigenous Art and Crafts",
    description: "Paintings, sculptures, and artistic works rooted in the indigenous heritage of Mansalay."
  },
  {
    name:        "Other Local Products",
    description: "Other locally produced items that support the cultural heritage economy of Mansalay."
  }
];

try {
  await sequelize.authenticate();
  console.log("✅ Connected to MySQL.");

  let created = 0;
  let skipped = 0;

  for (const cat of CATEGORIES) {
    const [, wasCreated] = await Category.findOrCreate({
      where:    { name: cat.name },  // lookup key — never inserts if name exists
      defaults: { description: cat.description, is_active: true }
    });
    if (wasCreated) {
      console.log(`   + Inserted: "${cat.name}"`);
      created++;
    } else {
      console.log(`   ~ Skipped (already exists): "${cat.name}"`);
      skipped++;
    }
  }

  console.log(`\n✅ Seed complete — ${created} inserted, ${skipped} skipped.`);
} catch (err) {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
} finally {
  await sequelize.close();
  process.exit(0);
}
