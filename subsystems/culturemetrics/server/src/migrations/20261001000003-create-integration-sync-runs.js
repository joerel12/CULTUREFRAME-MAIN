'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('integration_sync_runs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      providerName: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: 'cultureframe',
      },
      startedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      finishedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('running', 'completed', 'failed', 'partial'),
        defaultValue: 'running',
        allowNull: false,
      },
      recordsFetched: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      recordsProcessed: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      recordsRejected: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      errorSummary: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      dataMode: {
        type: Sequelize.STRING(16),
        allowNull: false,
        defaultValue: 'mock',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('integration_sync_runs', ['providerName']);
    await queryInterface.addIndex('integration_sync_runs', ['startedAt']);
    await queryInterface.addIndex('integration_sync_runs', ['status']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('integration_sync_runs');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_integration_sync_runs_status";');
  },
};
