'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('integration_configs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      providerName: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true,
        defaultValue: 'cultureframe',
      },
      apiBaseUrl: {
        type: Sequelize.STRING(512),
        allowNull: true,
      },
      enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      lastConnectionTestAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      lastConnectionTestResult: {
        type: Sequelize.STRING(32),
        allowNull: true,
      },
      lastSuccessfulSyncAt: {
        type: Sequelize.DATE,
        allowNull: true,
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
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('integration_configs');
  },
};
