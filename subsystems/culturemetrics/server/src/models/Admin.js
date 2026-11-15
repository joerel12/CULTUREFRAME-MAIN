'use strict';

module.exports = (sequelize, DataTypes) => {
  const Admin = sequelize.define(
    'Admin',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      username: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
        validate: { len: [3, 64], notEmpty: true },
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: { isEmail: true, notEmpty: true },
      },
      passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM('superadmin', 'admin', 'viewer'),
        defaultValue: 'admin',
        allowNull: false,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      lastLoginAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'admins',
      timestamps: true,
      indexes: [
        { unique: true, fields: ['username'] },
        { unique: true, fields: ['email'] },
      ],
    }
  );

  // Never return passwordHash in JSON serialization
  Admin.prototype.toSafeJSON = function () {
    const values = { ...this.get() };
    delete values.passwordHash;
    return values;
  };

  return Admin;
};
