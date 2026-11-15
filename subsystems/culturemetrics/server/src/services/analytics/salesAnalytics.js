'use strict';

/**
 * salesAnalytics.js
 *
 * Calculates sales metrics from normalized order data.
 *
 * Definitions:
 * - Gross sales: sum of subtotal for paid/completed orders (excludes cancelled, refunded).
 * - Net sales: gross sales minus confirmed refund amounts.
 * - Paid orders: orders where paymentStatus === 'paid' OR status === 'completed'.
 * - Average order value: gross sales / number of qualifying paid orders.
 * - Sales growth: % change vs. prior equivalent period.
 *
 * Monetary arithmetic uses parseFloat on decimal strings and toFixed(2) for output.
 * This is acceptable for display aggregation — source records store strings.
 */

const { fetchOrders } = require('./dataProvider');

const QUALIFYING_STATUSES = new Set(['completed']);
const QUALIFYING_PAYMENT_STATUSES = new Set(['paid']);

function isQualifyingOrder(order) {
  return (
    QUALIFYING_STATUSES.has(order.status) ||
    QUALIFYING_PAYMENT_STATUSES.has(order.paymentStatus)
  );
}

function filterByDateRange(orders, startDate, endDate) {
  return orders.filter((o) => {
    if (!o.createdAt) return false;
    const d = o.createdAt.slice(0, 10);
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  });
}

function groupByDate(orders, granularity = 'day') {
  const map = {};
  for (const order of orders) {
    if (!order.createdAt) continue;
    let key;
    const d = order.createdAt.slice(0, 10);
    if (granularity === 'month') key = d.slice(0, 7);
    else if (granularity === 'year') key = d.slice(0, 4);
    else key = d;

    if (!map[key]) map[key] = { period: key, grossSales: 0, orderCount: 0 };
    if (isQualifyingOrder(order)) {
      map[key].grossSales += parseFloat(order.subtotal || '0');
      map[key].orderCount++;
    }
  }
  return Object.values(map)
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((v) => ({ ...v, grossSales: v.grossSales.toFixed(2) }));
}

function groupByCategory(orders) {
  const map = {};
  for (const order of orders) {
    if (!isQualifyingOrder(order)) continue;
    for (const item of order.items || []) {
      const cat = item.category || 'Uncategorized';
      if (!map[cat]) map[cat] = { category: cat, revenue: 0, unitsSold: 0 };
      map[cat].revenue += parseFloat(item.unitPrice || '0') * (item.quantity || 0);
      map[cat].unitsSold += item.quantity || 0;
    }
  }
  return Object.values(map)
    .sort((a, b) => b.revenue - a.revenue)
    .map((v) => ({ ...v, revenue: v.revenue.toFixed(2) }));
}

function topProducts(orders, limit = 10) {
  const map = {};
  for (const order of orders) {
    if (!isQualifyingOrder(order)) continue;
    for (const item of order.items || []) {
      const id = item.productId;
      if (!map[id]) {
        map[id] = {
          productId: id,
          productName: item.productName || 'Unknown',
          category: item.category || 'Uncategorized',
          unitsSold: 0,
          revenue: 0,
        };
      }
      map[id].unitsSold += item.quantity || 0;
      map[id].revenue += parseFloat(item.unitPrice || '0') * (item.quantity || 0);
    }
  }
  return Object.values(map)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
    .map((v) => ({ ...v, revenue: v.revenue.toFixed(2) }));
}

async function getSalesMetrics(params = {}) {
  const { startDate, endDate, granularity = 'day' } = params;
  const { orders, _dataMode } = await fetchOrders({ startDate, endDate });

  const filtered = filterByDateRange(orders, startDate, endDate);
  const qualifying = filtered.filter(isQualifyingOrder);
  const cancelled = filtered.filter((o) => o.status === 'cancelled');

  const grossSales = qualifying.reduce((sum, o) => sum + parseFloat(o.subtotal || '0'), 0);
  const totalRefunds = qualifying.reduce((sum, o) => sum + parseFloat(o.refundAmount || '0'), 0);
  const netSales = grossSales - totalRefunds;
  const avgOrderValue = qualifying.length > 0 ? grossSales / qualifying.length : 0;

  return {
    _dataMode,
    grossSales: grossSales.toFixed(2),
    netSales: netSales.toFixed(2),
    totalRefunds: totalRefunds.toFixed(2),
    totalOrders: filtered.length,
    qualifyingOrders: qualifying.length,
    cancelledOrders: cancelled.length,
    avgOrderValue: avgOrderValue.toFixed(2),
    currency: 'PHP',
    note: 'Paid orders: status=completed or paymentStatus=paid. Shipping and taxes are excluded from gross sales when not present in subtotal.',
    trend: groupByDate(filtered, granularity),
    byCategory: groupByCategory(filtered),
    topProducts: topProducts(filtered),
  };
}

module.exports = { getSalesMetrics, filterByDateRange, isQualifyingOrder };
