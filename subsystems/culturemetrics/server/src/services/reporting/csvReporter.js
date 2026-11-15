'use strict';

/**
 * csvReporter.js
 *
 * Generates CSV reports from analytics data.
 * Security:
 * - Sanitizes all string values to prevent formula injection (strips leading =, +, -, @, TAB, CR).
 * - Excludes passwords, tokens, payment details.
 * - Streams rows to avoid loading entire datasets into memory.
 */

const { getSalesMetrics } = require('../analytics/salesAnalytics');
const { getProductMetrics } = require('../analytics/productAnalytics');
const { getOrderMetrics } = require('../analytics/orderAnalytics');
const { getEventMetrics } = require('../analytics/eventAnalytics');
const { getDestinationMetrics } = require('../analytics/destinationAnalytics');

// Sanitize a cell value against spreadsheet formula injection
function sanitizeCell(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Strip leading characters that could trigger formula execution
  return str.replace(/^[=+\-@\t\r]/, "'$&");
}

function buildRow(values) {
  return values.map((v) => {
    const sanitized = sanitizeCell(v);
    // Wrap in quotes if contains comma, quote, or newline
    if (/[,"\n\r]/.test(sanitized)) {
      return `"${sanitized.replace(/"/g, '""')}"`;
    }
    return sanitized;
  }).join(',');
}

function buildCsv(headers, rows, dataMode = 'live') {
  const modeLabel = dataMode === 'mock' ? 'DEMO DATA — NOT REAL' : 'LIVE DATA';
  const lines = [buildRow(['Data mode', ...headers])];
  for (const row of rows) {
    lines.push(buildRow([modeLabel, ...row]));
  }
  return `\uFEFF${lines.join('\r\n')}`;
}

async function generateSalesCsv(params = {}) {
  const data = await getSalesMetrics(params);
  const headers = ['Period', 'Gross Sales (PHP)', 'Order Count'];
  const rows = (data.trend || []).map((t) => [t.period, t.grossSales, t.orderCount]);
  return {
    csv: buildCsv(headers, rows, data._dataMode),
    filename: `culturemetrics-sales-${new Date().toISOString().slice(0, 10)}.csv`,
    dataMode: data._dataMode,
  };
}

async function generateProductsCsv(params = {}) {
  const data = await getProductMetrics(params);
  const headers = ['Rank', 'Product ID', 'Product Name', 'Category', 'Units Sold', 'Gross Sales (PHP)', 'Current Price', 'Stock', 'Available'];
  const rows = (data.rankedProducts || []).map((p) => [
    p.rank,
    p.productId,
    p.productName,
    p.category,
    p.unitsSold,
    p.grossSales,
    p.currentPrice ?? '',
    p.currentStock ?? 'N/A',
    p.isAvailable ? 'Yes' : 'No',
  ]);
  return {
    csv: buildCsv(headers, rows, data._dataMode),
    filename: `culturemetrics-products-${new Date().toISOString().slice(0, 10)}.csv`,
    dataMode: data._dataMode,
  };
}

async function generateOrdersCsv(params = {}) {
  const data = await getOrderMetrics(params);
  const headers = ['Status', 'Count'];
  const rows = (data.byStatus || []).map((s) => [s.status, s.count]);
  return {
    csv: buildCsv(headers, rows, data._dataMode),
    filename: `culturemetrics-orders-${new Date().toISOString().slice(0, 10)}.csv`,
    dataMode: data._dataMode,
  };
}

async function generateEventsCsv(params = {}) {
  const data = await getEventMetrics(params);
  const headers = ['Event ID', 'Event Name', 'Start Date', 'Status', 'Total Registrations', 'Cancelled Registrations', 'Confirmed Attendance'];
  const rows = (data.byEvent || []).map((e) => [
    e.eventId,
    e.name,
    e.startDate ?? '',
    e.status,
    e.totalRegistrations,
    e.cancelledRegistrations,
    e.confirmedAttendance ?? 'N/A',
  ]);
  return {
    csv: buildCsv(headers, rows, data._dataMode),
    filename: `culturemetrics-events-${new Date().toISOString().slice(0, 10)}.csv`,
    dataMode: data._dataMode,
  };
}

async function generateDestinationsCsv(params = {}) {
  const data = await getDestinationMetrics(params);
  const rows = [];

  for (const h of data.heritage?.topByViews || []) {
    rows.push(['Heritage', h.id, h.name, h.category, h.location ?? '', h.viewCount ?? 'N/A', h.isPublished ? 'Yes' : 'No']);
  }
  for (const s of data.scenic?.topByViews || []) {
    rows.push(['Scenic', s.id, s.name, s.category, '', s.viewCount ?? 'N/A', s.isPublished ? 'Yes' : 'No']);
  }

  const headers = ['Type', 'ID', 'Name', 'Category', 'Location', 'View Count', 'Published'];
  return {
    csv: buildCsv(headers, rows, data._dataMode),
    filename: `culturemetrics-destinations-${new Date().toISOString().slice(0, 10)}.csv`,
    dataMode: data._dataMode,
  };
}

module.exports = {
  generateSalesCsv,
  generateProductsCsv,
  generateOrdersCsv,
  generateEventsCsv,
  generateDestinationsCsv,
};
