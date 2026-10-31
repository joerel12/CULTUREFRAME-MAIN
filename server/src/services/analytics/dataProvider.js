'use strict';

/**
 * dataProvider.js
 *
 * Routes data requests to the mock provider or the live CultureFrame adapter
 * based on the configured data mode. Also handles normalization.
 *
 * Data mode: "mock" | "live". Diagnostic snapshots are not an analytics provider.
 */

const { env } = require('../../config/environment');
const { cultureFrameAdapter } = require('../cultureframe/cultureframeAdapter');
const { mockCultureFrameProvider } = require('../cultureframe/mockCultureframeProvider');
const {
  normalizeOrders,
  normalizeProducts,
  normalizeCustomers,
  normalizeEvents,
  normalizeHeritage,
  normalizeScenicDestinations,
} = require('../cultureframe/cultureframeNormalizer');

function getMode() {
  return env.DATA_MODE || 'mock';
}

function isMockMode() {
  return getMode() === 'mock';
}

function assertLiveIntegrationEnabled() {
  if (!env.CULTUREFRAME_INTEGRATION_ENABLED) {
    throw Object.assign(
      new Error('Live CultureFrame requests are disabled. Set CULTUREFRAME_INTEGRATION_ENABLED=true on the server to enable them.'),
      { code: 'INTEGRATION_DISABLED', status: 503, exposeMessage: true }
    );
  }
}

async function fetchOrders(params = {}) {
  if (isMockMode()) {
    const raw = await mockCultureFrameProvider.getOrders(params);
    return { ...normalizeOrders(raw), _dataMode: 'mock' };
  }
  assertLiveIntegrationEnabled();
  const raw = await cultureFrameAdapter.getOrders(params);
  return { ...normalizeOrders(raw), _dataMode: 'live' };
}

async function fetchProducts(params = {}) {
  if (isMockMode()) {
    const raw = await mockCultureFrameProvider.getProducts(params);
    return { ...normalizeProducts(raw), _dataMode: 'mock' };
  }
  assertLiveIntegrationEnabled();
  const raw = await cultureFrameAdapter.getProducts(params);
  return { ...normalizeProducts(raw), _dataMode: 'live' };
}

async function fetchCustomers(params = {}) {
  if (isMockMode()) {
    const raw = await mockCultureFrameProvider.getCustomers(params);
    return { ...normalizeCustomers(raw), _dataMode: 'mock' };
  }
  assertLiveIntegrationEnabled();
  const raw = await cultureFrameAdapter.getCustomers(params);
  return { ...normalizeCustomers(raw), _dataMode: 'live' };
}

async function fetchEvents(params = {}) {
  if (isMockMode()) {
    const raw = await mockCultureFrameProvider.getEvents(params);
    return { ...normalizeEvents(raw), _dataMode: 'mock' };
  }
  assertLiveIntegrationEnabled();
  const raw = await cultureFrameAdapter.getEvents(params);
  return { ...normalizeEvents(raw), _dataMode: 'live' };
}

async function fetchHeritage(params = {}) {
  if (isMockMode()) {
    const raw = await mockCultureFrameProvider.getHeritage(params);
    return { ...normalizeHeritage(raw), _dataMode: 'mock' };
  }
  assertLiveIntegrationEnabled();
  const raw = await cultureFrameAdapter.getHeritage(params);
  return { ...normalizeHeritage(raw), _dataMode: 'live' };
}

async function fetchScenicDestinations(params = {}) {
  if (isMockMode()) {
    const raw = await mockCultureFrameProvider.getScenicDestinations(params);
    return { ...normalizeScenicDestinations(raw), _dataMode: 'mock' };
  }
  assertLiveIntegrationEnabled();
  const raw = await cultureFrameAdapter.getScenicDestinations(params);
  return { ...normalizeScenicDestinations(raw), _dataMode: 'live' };
}

async function fetchOverview() {
  if (isMockMode()) {
    const raw = await mockCultureFrameProvider.getOverview();
    return { overview: raw, _dataMode: 'mock' };
  }
  assertLiveIntegrationEnabled();
  const raw = await cultureFrameAdapter.getOverview();
  return { overview: raw, _dataMode: 'live' };
}

module.exports = {
  getMode,
  isMockMode,
  assertLiveIntegrationEnabled,
  fetchOrders,
  fetchProducts,
  fetchCustomers,
  fetchEvents,
  fetchHeritage,
  fetchScenicDestinations,
  fetchOverview,
};
