'use strict';

module.exports = (sequelize, DataTypes) => {
  const IntegrationSyncRun = sequelize.define(
    'IntegrationSyncRun',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      providerName: {
        type: DataTypes.STRING(64),
        allowNull: false,
        defaultValue: 'cultureframe',
      },
      startedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      finishedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('running', 'completed', 'failed', 'partial'),
        defaultValue: 'running',
        allowNull: false,
      },
      recordsFetched: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      recordsProcessed: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      recordsRejected: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      errorSummary: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      dataMode: {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: 'mock',
      },
    },
    {
      tableName: 'integration_sync_runs',
      timestamps: true,
      updatedAt: false,
      indexes: [
        { fields: ['providerName'] },
        { fields: ['startedAt'] },
        { fields: ['status'] },
      ],
    }
  );

  return IntegrationSyncRun;
};
