'use strict';

/**
 * syncService.js
 *
 * Handles on-demand synchronization of CultureFrame data.
 * Records every run in IntegrationSyncRun.
 * Prevents overlapping runs.
 * Preserves the last successful snapshot on failure.
 */

const { IntegrationSyncRun, AnalyticsSnapshot, IntegrationConfig } = require('../../models');
const { env } = require('../../config/environment');
const {
  fetchOrders,
  fetchProducts,
  fetchCustomers,
  fetchEvents,
  fetchHeritage,
  fetchScenicDestinations,
  fetchOverview,
} = require('../analytics/dataProvider');

let _runningSync = false;

async function isRunning() {
  return _runningSync;
}

async function triggerSync() {
  if (_runningSync) {
    throw Object.assign(new Error('A synchronization is already in progress. Please wait for it to finish.'), {
      code: 'SYNC_ALREADY_RUNNING',
      status: 409,
    });
  }

  _runningSync = true;

  let syncRun = null;
  let totalFetched = 0;
  let totalProcessed = 0;
  let totalRejected = 0;
  const errors = [];

  try {
    syncRun = await IntegrationSyncRun.create({
      providerName: 'cultureframe',
      startedAt: new Date(),
      status: 'running',
      dataMode: env.DATA_MODE,
    });

    const tasks = [
      { key: 'overview', fn: fetchOverview },
      { key: 'orders', fn: fetchOrders },
      { key: 'products', fn: fetchProducts },
      { key: 'customers', fn: fetchCustomers },
      { key: 'events', fn: fetchEvents },
      { key: 'heritage', fn: fetchHeritage },
      { key: 'scenic', fn: fetchScenicDestinations },
    ];

    for (const task of tasks) {
      try {
        const result = await task.fn({});
        const items =
          result.orders ||
          result.products ||
          result.events ||
          result.heritage ||
          result.scenic ||
          (result.summary ? [result.summary] : null) ||
          (result.overview ? [result.overview] : null) ||
          [];
        const validCount = Array.isArray(items) ? items.length : 1;
        const rejected = result.rejected || 0;
        totalFetched += validCount + rejected;
        totalRejected += rejected;

        // Keep a diagnostic archive. Analytics requests continue to query the selected provider.
        await AnalyticsSnapshot.create({
          metricType: task.key,
          periodStart: null,
          periodEnd: null,
          metricPayload: result,
          sourceSystem: 'cultureframe',
          dataMode: env.DATA_MODE,
          generatedAt: new Date(),
        });

        totalProcessed += validCount;
      } catch (taskErr) {
        errors.push(`[${task.key}] ${taskErr.message}`);
        console.error(`[SyncService] Task "${task.key}" failed:`, taskErr.message);
      }
    }

    const finalStatus = errors.length === 0 ? 'completed' : errors.length === tasks.length ? 'failed' : 'partial';

    await syncRun.update({
      finishedAt: new Date(),
      status: finalStatus,
      recordsFetched: totalFetched,
      recordsProcessed: totalProcessed,
      recordsRejected: totalRejected,
      errorSummary: errors.length > 0 ? errors.join('\n') : null,
    });

    // Only a complete check updates the timestamp shown as the last successful run.
    if (finalStatus === 'completed') {
      const [config] = await IntegrationConfig.findOrCreate({
        where: { providerName: 'cultureframe' },
        defaults: { apiBaseUrl: env.CULTUREFRAME_API_URL, enabled: env.CULTUREFRAME_INTEGRATION_ENABLED },
      });
      await config.update({
        apiBaseUrl: env.CULTUREFRAME_API_URL,
        enabled: env.CULTUREFRAME_INTEGRATION_ENABLED,
        lastSuccessfulSyncAt: new Date(),
      });
    }

    return {
      syncRunId: syncRun.id,
      status: finalStatus,
      recordsFetched: totalFetched,
      recordsProcessed: totalProcessed,
      recordsRejected: totalRejected,
      errors: errors.length > 0 ? errors : null,
    };
  } catch (err) {
    if (syncRun) {
      await syncRun.update({
        finishedAt: new Date(),
        status: 'failed',
        errorSummary: err.message,
      });
    }
    throw err;
  } finally {
    _runningSync = false;
  }
}

async function getSyncHistory(limit = 20) {
  return IntegrationSyncRun.findAll({
    order: [['startedAt', 'DESC']],
    limit,
    attributes: ['id', 'providerName', 'startedAt', 'finishedAt', 'status', 'recordsFetched', 'recordsProcessed', 'recordsRejected', 'errorSummary', 'dataMode', 'createdAt'],
  });
}

async function getLatestSnapshot(metricType) {
  return AnalyticsSnapshot.findOne({
    where: { metricType, dataMode: env.DATA_MODE },
    order: [['generatedAt', 'DESC']],
  });
}

module.exports = { triggerSync, getSyncHistory, getLatestSnapshot, isRunning };
