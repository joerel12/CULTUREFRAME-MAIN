/*
  CultureFrame — Seller Model
  Table: sellers

  Stores registered seller accounts.
  Passwords are NEVER stored in plain text — only bcrypt hashes.
*/

import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

const Seller = sequelize.define(
  "Seller",
  {
    id: {
      type:          DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey:    true
    },

    full_name: {
      type:      DataTypes.STRING(150),
      allowNull: false
    },

    email: {
      type:      DataTypes.STRING(200),
      allowNull: false,
      unique:    true,     // prevent duplicate accounts at the DB level
      validate:  { isEmail: true }
    },

    // bcrypt hash — never the raw password
    password_hash: {
      type:      DataTypes.STRING(255),
      allowNull: false
    }
  },
  {
    tableName:   "sellers",
    timestamps:  true,
    underscored: true
  }
);

export default Seller;
