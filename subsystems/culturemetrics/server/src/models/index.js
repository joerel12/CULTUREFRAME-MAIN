'use strict';
const { Sequelize } = require('sequelize');
require('dotenv').config();
const { createMemoryStore } = require('./memoryStore');

const env = process.env.NODE_ENV || 'development';
const config = require('../config/database')[env];

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
const postgresModels = {
  Admin: require('./Admin')(sequelize, Sequelize.DataTypes),
  IntegrationConfig: require('./IntegrationConfig')(sequelize, Sequelize.DataTypes),
  IntegrationSyncRun: require('./IntegrationSyncRun')(sequelize, Sequelize.DataTypes),
  AnalyticsSnapshot: require('./AnalyticsSnapshot')(sequelize, Sequelize.DataTypes),
};
const memoryStore = createMemoryStore();
let ephemeralStorageActive = false;

for (const [name, postgresModel] of Object.entries(postgresModels)) {
  db[name] = new Proxy(postgresModel, {
    get(target, property) {
      if (ephemeralStorageActive) {
        const value = memoryStore.models[name][property];
        return typeof value === 'function' ? value.bind(memoryStore.models[name]) : value;
      }
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

db.activateEphemeralStorage = () => {
  ephemeralStorageActive = true;
};
db.resetEphemeralStorage = () => {
  memoryStore.reset();
  ephemeralStorageActive = false;
};
db.isEphemeralStorageActive = () => ephemeralStorageActive;

module.exports = db;
