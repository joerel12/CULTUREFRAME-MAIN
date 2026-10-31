'use strict';

const { IntegrationConfig, isEphemeralStorageActive } = require('../models');
const { triggerSync, getSyncHistory, isRunning } = require('../services/synchronization/syncService');
const { cultureFrameClient } = require('../services/cultureframe/cultureframeClient');
const { env } = require('../config/environment');

async function recordEphemeralConnectionTest() {
  const [config] = await IntegrationConfig.findOrCreate({
    where: { providerName: 'cultureframe' },
    defaults: { apiBaseUrl: env.CULTUREFRAME_API_URL, enabled: env.CULTUREFRAME_INTEGRATION_ENABLED },
  });
  await config.update({
    apiBaseUrl: env.CULTUREFRAME_API_URL,
    enabled: env.CULTUREFRAME_INTEGRATION_ENABLED,
    lastConnectionTestAt: new Date(),
    lastConnectionTestResult: 'skipped',
  });
}

async function getStatus(req, res, next) {
  try {
    const config = await IntegrationConfig.findOne({ where: { providerName: 'cultureframe' } });
    return res.json({
      success: true,
      data: {
        providerName: 'cultureframe',
        enabled: config?.enabled ?? false,
        apiBaseUrl: env.CULTUREFRAME_API_URL,
        tokenConfigured: Boolean(env.CULTUREFRAME_API_TOKEN),
        lastConnectionTestAt: config?.lastConnectionTestAt ?? null,
        lastConnectionTestResult: config?.lastConnectionTestResult ?? null,
        lastSuccessfulSyncAt: config?.lastSuccessfulSyncAt ?? null,
        integrationEnabled: env.CULTUREFRAME_INTEGRATION_ENABLED,
        dataMode: env.DATA_MODE,
        storageMode: isEphemeralStorageActive() ? 'ephemeral' : 'postgres',
        ephemeralStorage: isEphemeralStorageActive(),
        persistenceNotice: isEphemeralStorageActive()
          ? 'Changes exist only in this process and are lost when the server restarts.'
          : null,
        syncRunning: await isRunning(),
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function testConnection(req, res, next) {
  try {
    if (!env.CULTUREFRAME_INTEGRATION_ENABLED) {
      if (isEphemeralStorageActive()) await recordEphemeralConnectionTest();
      return res.json({
        success: false,
        data: {
          result: 'skipped',
          message: isEphemeralStorageActive()
            ? 'Ephemeral demo mode is isolated; integration is disabled and no CultureFrame request was made. This status is lost on restart.'
            : 'Integration is disabled. Set CULTUREFRAME_INTEGRATION_ENABLED=true to enable.',
        },
      });
    }
    if (env.DATA_MODE !== 'live') {
      if (isEphemeralStorageActive()) await recordEphemeralConnectionTest();
      return res.json({
        success: false,
        data: {
          result: 'skipped',
          message: isEphemeralStorageActive()
            ? 'The application is in ephemeral demo mode. No CultureFrame request was made; this status is temporary and will be lost on restart.'
            : 'The application is in demo mode. Set CULTUREMETRICS_DATA_MODE=live on the server to test CultureFrame.',
        },
      });
    }
    if (!env.CULTUREFRAME_API_TOKEN) {
      return res.json({
        success: false,
        data: {
          result: 'failure',
          message: 'CULTUREFRAME_API_TOKEN is missing on the server. Add it to the server environment and restart the API.',
        },
      });
    }

    let result = 'failure';
    let message = '';

    try {
      // Check the contract's actual analytics route, not merely the website root.
      const overview = await cultureFrameClient.get('/api/integrations/analytics/overview');
      if (!overview?.data || typeof overview.data !== 'object' || Array.isArray(overview.data) ||
        !Object.prototype.hasOwnProperty.call(overview.data, 'totalOrders')) {
        throw new Error('CultureFrame returned an unexpected overview response. Expected the contract data object with totalOrders.');
      }
      result = 'success';
      message = 'CultureFrame overview analytics endpoint responded successfully.';
    } catch (err) {
      message = err.message || 'CultureFrame analytics endpoint test failed.';
    }

    const [config] = await IntegrationConfig.findOrCreate({
      where: { providerName: 'cultureframe' },
      defaults: { apiBaseUrl: env.CULTUREFRAME_API_URL, enabled: env.CULTUREFRAME_INTEGRATION_ENABLED },
    });
    await config.update({
      apiBaseUrl: env.CULTUREFRAME_API_URL,
      enabled: env.CULTUREFRAME_INTEGRATION_ENABLED,
      lastConnectionTestAt: new Date(),
      lastConnectionTestResult: result,
    });

    return res.json({ success: result === 'success', data: { result, message } });
  } catch (err) {
    return next(err);
  }
}

async function syncNow(req, res, next) {
  try {
    if (env.DATA_MODE === 'live' && !env.CULTUREFRAME_INTEGRATION_ENABLED) {
      return res.status(503).json({
        success: false,
        error: { code: 'INTEGRATION_DISABLED', message: 'Live integration is disabled. Enable it in the server environment before running a live data check.' },
      });
    }
    if (env.DATA_MODE === 'live' && !env.CULTUREFRAME_API_TOKEN) {
      return res.status(503).json({
        success: false,
        error: { code: 'INTEGRATION_TOKEN_MISSING', message: 'CULTUREFRAME_API_TOKEN is missing on the server. Add it to the API environment and restart the service.' },
      });
    }
    const result = await triggerSync();
    if (result.status !== 'completed') {
      return res.status(502).json({
        success: false,
        error: {
          code: 'SYNC_INCOMPLETE',
          message: result.errors?.[0] || `Data check finished with status: ${result.status}.`,
        },
        data: result,
      });
    }
    return res.json({ success: true, data: result });
  } catch (err) {
    if (err.code === 'SYNC_ALREADY_RUNNING') {
      return res.status(409).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
    }
    return next(err);
  }
}

async function getSyncHistory_handler(req, res, next) {
  try {
    const requestedLimit = Number.parseInt(req.query.limit || '20', 10);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 20;
    const history = await getSyncHistory(limit);
    return res.json({ success: true, data: history });
  } catch (err) {
    return next(err);
  }
}

async function getConfigurationStatus(req, res, next) {
  try {
    const config = await IntegrationConfig.findOne({ where: { providerName: 'cultureframe' } });
    const checklist = [
      { item: 'CULTUREFRAME_API_URL is set', ok: !!env.CULTUREFRAME_API_URL },
      { item: 'CULTUREFRAME_API_TOKEN is set', ok: !!env.CULTUREFRAME_API_TOKEN },
      { item: 'Data mode is live', ok: env.DATA_MODE === 'live' },
      { item: 'CULTUREFRAME_INTEGRATION_ENABLED is true', ok: env.CULTUREFRAME_INTEGRATION_ENABLED },
      { item: 'Integration config exists in database', ok: !!config },
      { item: 'Last connection test passed', ok: config?.lastConnectionTestResult === 'success' },
      { item: 'At least one successful sync completed', ok: !!config?.lastSuccessfulSyncAt },
    ];
    const allReady = checklist.every((c) => c.ok);
    return res.json({
      success: true,
      data: {
        allReady,
        checklist,
        dataMode: env.DATA_MODE,
        storageMode: isEphemeralStorageActive() ? 'ephemeral' : 'postgres',
        ephemeralStorage: isEphemeralStorageActive(),
      },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getStatus, testConnection, syncNow, getSyncHistory: getSyncHistory_handler, getConfigurationStatus };
