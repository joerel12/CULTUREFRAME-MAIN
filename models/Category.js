/*
  CultureFrame — Category Model
  Table: product_categories

  Stores the curated list of cultural heritage product categories.
  Categories are seeded via seed.js; sellers cannot add new ones from
  the UI in this version — only admins manage the category list.
*/

import { DataTypes } from "sequelize";
import { sequelize }  from "./db.js";

const Category = sequelize.define(
  "Category",
  {
    id: {
      type:          DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey:    true
    },

    name: {
      type:      DataTypes.STRING(120),
      allowNull: false,
      unique:    true,          // prevents duplicate category names
      comment:   "Human-readable category label shown to sellers and buyers"
    },

    description: {
      type:         DataTypes.TEXT,
      allowNull:    true,
      defaultValue: null
    },

    is_active: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: true,
      comment:      "Inactive categories are hidden from the Add Product form"
    }
  },
  {
    tableName:  "product_categories",
    timestamps: true,               // adds createdAt / updatedAt
    underscored: true               // snake_case column names in DB
  }
);

export default Category;
