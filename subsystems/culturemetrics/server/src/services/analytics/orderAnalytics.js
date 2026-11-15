'use strict';

const { fetchOrders } = require('./dataProvider');
const { filterByDateRange, isQualifyingOrder } = require('./salesAnalytics');

// Normalize CultureFrame statuses to internal display names
const STATUS_DISPLAY_MAP = {
  completed: 'Completed',
  pending: 'Pending',
  processing: 'Processing',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  failed: 'Failed',
  unknown: 'Unknown',
};

function normalizeStatus(status) {
  const key = (status || 'unknown').toLowerCase();
  return STATUS_DISPLAY_MAP[key] || status;
}

async function getOrderMetrics(params = {}) {
  const { startDate, endDate } = params;
  const { orders, _dataMode } = await fetchOrders({ startDate, endDate });

  const filtered = filterByDateRange(orders, startDate, endDate);

  // Status counts
  const statusMap = {};
  for (const order of filtered) {
    const key = normalizeStatus(order.status);
    statusMap[key] = (statusMap[key] || 0) + 1;
  }

  const qualifying = filtered.filter(isQualifyingOrder);
  const cancelled = filtered.filter((o) => o.status === 'cancelled');
  const totalRevenue = qualifying.reduce((sum, o) => sum + parseFloat(o.subtotal || '0'), 0);
  const avgOrderValue = qualifying.length > 0 ? totalRevenue / qualifying.length : 0;

  // Daily trend
  const dailyMap = {};
  for (const order of filtered) {
    const d = (order.createdAt || '').slice(0, 10);
    if (!d) continue;
    if (!dailyMap[d]) dailyMap[d] = { date: d, total: 0, completed: 0, cancelled: 0 };
    dailyMap[d].total++;
    if (order.status === 'completed') dailyMap[d].completed++;
    if (order.status === 'cancelled') dailyMap[d].cancelled++;
  }
  const dailyTrend = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  // Monthly trend
  const monthlyMap = {};
  for (const order of filtered) {
    const m = (order.createdAt || '').slice(0, 7);
    if (!m) continue;
    if (!monthlyMap[m]) monthlyMap[m] = { month: m, total: 0, completed: 0, cancelled: 0 };
    monthlyMap[m].total++;
    if (order.status === 'completed') monthlyMap[m].completed++;
    if (order.status === 'cancelled') monthlyMap[m].cancelled++;
  }
  const monthlyTrend = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));

  const completionRate = filtered.length > 0 ? (qualifying.length / filtered.length) * 100 : 0;
  const cancellationRate = filtered.length > 0 ? (cancelled.length / filtered.length) * 100 : 0;

  return {
    _dataMode,
    totalOrders: filtered.length,
    qualifyingOrders: qualifying.length,
    cancelledOrders: cancelled.length,
    completionRate: completionRate.toFixed(1),
    cancellationRate: cancellationRate.toFixed(1),
    avgOrderValue: avgOrderValue.toFixed(2),
    currency: 'PHP',
    byStatus: Object.entries(statusMap).map(([status, count]) => ({ status, count })),
    dailyTrend,
    monthlyTrend,
  };
}

module.exports = { getOrderMetrics };
