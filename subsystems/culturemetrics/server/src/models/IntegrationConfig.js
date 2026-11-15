'use strict';

module.exports = (sequelize, DataTypes) => {
  const IntegrationConfig = sequelize.define(
    'IntegrationConfig',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      providerName: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
        defaultValue: 'cultureframe',
      },
      apiBaseUrl: {
        type: DataTypes.STRING(512),
        allowNull: true,
      },
      enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      lastConnectionTestAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      lastConnectionTestResult: {
        type: DataTypes.STRING(32),
        allowNull: true, // 'success' | 'failure' | null
      },
      lastSuccessfulSyncAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'integration_configs',
      timestamps: true,
    }
  );

  return IntegrationConfig;
};
