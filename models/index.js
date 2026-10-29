/*
  CultureFrame — Models Index
  Import this file anywhere that needs Sequelize models.
  All models are registered against the shared sequelize instance
  from db.js, and associations are declared here.
*/

export { sequelize, testConnection } from "./db.js";

export { default as Category } from "./Category.js";
export { default as Product  } from "./Product.js";

// ── Associations ────────────────────────────────────────────────────────
// Import after exporting to avoid circular references.
import Category from "./Category.js";
import Product  from "./Product.js";

// One category has many products; each product belongs to one category.
Category.hasMany(Product,  { foreignKey: "category_id", as: "products"  });
Product.belongsTo(Category, { foreignKey: "category_id", as: "category"  });
