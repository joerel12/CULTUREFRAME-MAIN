/**
 * Shared formatting utilities for CultureMetrics frontend.
 */

/**
 * Format a number as Philippine Peso currency.
 * @param {number|string} value
 * @param {boolean} compact - use abbreviated form (e.g. ₱1.2k)
 */
export function formatCurrency(value, compact = false) {
  const num = Number(value || 0);
  if (compact && num >= 1_000_000) {
    return `₱${(num / 1_000_000).toFixed(1)}M`;
  }
  if (compact && num >= 1_000) {
    return `₱${(num / 1_000).toFixed(1)}k`;
  }
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Format a number with locale-appropriate thousands separators.
 */
export function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-PH');
}

/**
 * Format an ISO date string to a readable date.
 * @param {string} isoString
 * @param {'short'|'medium'|'long'} style
 */
export function formatDate(isoString, style = 'medium') {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('en-PH', { dateStyle: style });
}

/**
 * Format an ISO datetime string to a readable date+time.
 */
export function formatDateTime(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleString('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/**
 * Calculate percentage change between two values.
 * @returns {string} e.g. "+12.5%" or "-3.2%"
 */
export function percentChange(current, previous) {
  if (!previous || previous === 0) return null;
  const change = ((current - previous) / previous) * 100;
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}

/**
 * Truncate a string to a maximum length with ellipsis.
 */
export function truncate(str, maxLen = 30) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}
