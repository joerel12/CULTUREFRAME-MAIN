'use strict';

module.exports = (sequelize, DataTypes) => {
  const AnalyticsSnapshot = sequelize.define(
    'AnalyticsSnapshot',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      metricType: {
        type: DataTypes.STRING(64),
        allowNull: false,
        comment: 'e.g. overview, sales, products, orders, customers, events, destinations',
      },
      periodStart: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      periodEnd: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      metricPayload: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
        comment: 'Normalized provider payload for diagnostics. No passwords, tokens, or customer personal identifiers.',
      },
      sourceSystem: {
        type: DataTypes.STRING(64),
        allowNull: false,
        defaultValue: 'cultureframe',
      },
      dataMode: {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: 'mock',
        comment: 'Source mode for this diagnostic archive: "mock" | "live". Analytics do not read snapshots.',
      },
      generatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'analytics_snapshots',
      timestamps: true,
      indexes: [
        { fields: ['metricType'] },
        { fields: ['generatedAt'] },
        { fields: ['dataMode'] },
        { fields: ['metricType', 'periodStart', 'periodEnd'] },
      ],
    }
  );

  return AnalyticsSnapshot;
};
