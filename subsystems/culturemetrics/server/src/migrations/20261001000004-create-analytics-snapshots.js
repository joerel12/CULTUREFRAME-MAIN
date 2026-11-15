'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('analytics_snapshots', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      metricType: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      periodStart: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      periodEnd: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      metricPayload: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      sourceSystem: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: 'cultureframe',
      },
      dataMode: {
        type: Sequelize.STRING(16),
        allowNull: false,
        defaultValue: 'mock',
      },
      generatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('analytics_snapshots', ['metricType']);
    await queryInterface.addIndex('analytics_snapshots', ['generatedAt']);
    await queryInterface.addIndex('analytics_snapshots', ['dataMode']);
    await queryInterface.addIndex('analytics_snapshots', ['metricType', 'periodStart', 'periodEnd']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('analytics_snapshots');
  },
};
