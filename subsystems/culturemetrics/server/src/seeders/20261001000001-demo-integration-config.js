'use strict';

const crypto = require('crypto');

function generateUuid() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for older Node versions
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    // Insert default integration config for CultureFrame
    await queryInterface.bulkInsert('integration_configs', [
      {
        id: generateUuid(),
        providerName: 'cultureframe',
        apiBaseUrl: 'https://jennycultureframe-1.onrender.com',
        enabled: false,
        lastConnectionTestAt: null,
        lastConnectionTestResult: null,
        lastSuccessfulSyncAt: null,
        createdAt: now,
        updatedAt: now,
      },
    ], {});

    // Insert a sample completed sync run (DEMO DATA — not real)
    await queryInterface.bulkInsert('integration_sync_runs', [
      {
        id: generateUuid(),
        providerName: 'cultureframe',
        startedAt: new Date(Date.now() - 60000),
        finishedAt: new Date(),
        status: 'completed',
        recordsFetched: 0,
        recordsProcessed: 0,
        recordsRejected: 0,
        errorSummary: null,
        dataMode: 'mock',
        createdAt: now,
      },
    ], {});
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('integration_configs', null, {});
    await queryInterface.bulkDelete('integration_sync_runs', null, {});
  },
};
