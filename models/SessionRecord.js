import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const SessionRecord = sequelize.define("SessionRecord", {
  sid: { type: DataTypes.STRING(255), primaryKey: true },
  data: { type: DataTypes.TEXT, allowNull: false },
  expiresAt: { type: DataTypes.DATE, allowNull: false }
}, { tableName: "session_records", timestamps: false });
