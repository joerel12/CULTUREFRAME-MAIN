/*
  CultureFrame — Product Model
  Table: products

  ┌─────────────────────────────────────────────────────────────────────┐
  │  DEVELOPMENT NOTE — seller_id                                       │
  │                                                                     │
  │  Full seller authentication (login / session / users table) has     │
  │  NOT been implemented yet.  Until it is:                            │
  │                                                                     │
  │    • seller_id is a plain UNSIGNED INT, nullable.                   │
  │    • The seed and all dev inserts use seller_id = 1 as a            │
  │      placeholder ("dev seller").                                    │
  │    • When real auth is added, this column will be made NOT NULL     │
  │      and a FK to a future `users` table will be added via           │
  │      migration.                                                     │
  │    • DO NOT treat seller_id = 1 as a real authenticated user.       │
  └─────────────────────────────────────────────────────────────────────┘
*/

import { DataTypes } from "sequelize";
import { sequelize }  from "./db.js";

const Product = sequelize.define(
  "Product",
  {
    id: {
      type:          DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey:    true
    },

    /*
     * seller_id — development placeholder (see note above).
     * Nullable so the app works before auth is built.
     * Index added for future query performance when filtering by seller.
     */
    seller_id: {
      type:      DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      defaultValue: 1,
      comment:   "DEV PLACEHOLDER — replace with FK to users.id when auth is ready"
    },

    category_id: {
      type:       DataTypes.INTEGER.UNSIGNED,
      allowNull:  false,
      references: {
        model: "product_categories",
        key:   "id"
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT"       // prevent orphaned products if category removed
    },

    name: {
      type:      DataTypes.STRING(200),
      allowNull: false,
      comment:   "Product display name"
    },

    description: {
      type:         DataTypes.TEXT,
      allowNull:    true,
      defaultValue: null
    },

    /*
     * price — stored as DECIMAL(10,2) for exact PHP peso arithmetic.
     * Never use FLOAT for currency — binary floating-point is imprecise.
     */
    price: {
      type:      DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment:   "Price in Philippine Pesos (PHP)"
    },

    stock_quantity: {
      type:         DataTypes.INTEGER.UNSIGNED,
      allowNull:    false,
      defaultValue: 0
    },

    /*
     * image_path — relative path from the project public/ directory,
     * e.g. "uploads/products/basket-001.jpg".
     * Null means no image uploaded yet.
     */
    image_path: {
      type:         DataTypes.STRING(500),
      allowNull:    true,
      defaultValue: null
    },

    /*
     * status — lifecycle of a listing:
     *   active   → visible on the storefront
     *   inactive → hidden by seller
     *   pending  → awaiting admin approval (future feature)
     */
    status: {
      type:         DataTypes.ENUM("active", "inactive", "pending"),
      allowNull:    false,
      defaultValue: "active"
    }
  },
  {
    tableName:   "products",
    timestamps:  true,            // Sequelize manages created_at / updated_at
    underscored: true,            // snake_case column names in DB
    indexes: [
      { fields: ["seller_id"]   },   // fast filter by seller
      { fields: ["category_id"] },   // fast filter by category
      { fields: ["status"]      },   // fast filter by listing status
      {
        fields: ["name"],
        type:   "FULLTEXT"           // enables FULLTEXT search on product names
      }
    ]
  }
);

export default Product;
