import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

// Render's free web instances lose local uploads whenever they sleep or redeploy.
export const StoredFile = sequelize.define("StoredFile", {
  key: { type: DataTypes.STRING(255), primaryKey: true },
  mimeType: { type: DataTypes.STRING(80), allowNull: false },
  data: { type: DataTypes.BLOB("long"), allowNull: false }
}, { tableName: "stored_files", timestamps: true });
