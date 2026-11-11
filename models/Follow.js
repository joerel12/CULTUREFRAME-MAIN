import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const Follow = sequelize.define("follows", {
  follower_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: "User who is following"
  },
  following_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: "User being followed"
  }
}, {
  tableName: "follows",
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ["follower_id", "following_id"]
    }
  ]
});

export { sequelize };
