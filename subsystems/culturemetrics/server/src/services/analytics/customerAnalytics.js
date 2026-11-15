'use strict';

/**
 * customerAnalytics.js
 *
 * Repeat customer rate formula:
 *   (customers with >= 2 qualifying orders) / (customers with >= 1 qualifying order) * 100
 *
 * Privacy: Only aggregated counts are returned. No personal identifiers.
 */

const { fetchCustomers } = require('./dataProvider');

async function getCustomerMetrics(params = {}) {
  const { summary, _dataMode } = await fetchCustomers(params);

  const repeatRate =
    summary.withAtLeastOneOrder > 0
      ? (summary.repeatCustomers / summary.withAtLeastOneOrder) * 100
      : 0;

  const avgOrdersPerCustomer =
    summary.withAtLeastOneOrder > 0
      ? summary.withAtLeastOneOrder > 0
        ? 'Available when order-customer linkage is provided'
        : null
      : null;

  return {
    _dataMode,
    totalRegistered: summary.totalRegistered,
    newThisPeriod: summary.newThisPeriod,
    withAtLeastOneOrder: summary.withAtLeastOneOrder,
    repeatCustomers: summary.repeatCustomers,
    repeatRate: repeatRate.toFixed(1),
    repeatRateFormula: 'repeatCustomers / withAtLeastOneOrder × 100',
    registrationTrend: summary.registrationsByDate || [],
    privacyNote: 'Only aggregate counts are displayed. No personal identifiers are stored or returned.',
  };
}

module.exports = { getCustomerMetrics };
