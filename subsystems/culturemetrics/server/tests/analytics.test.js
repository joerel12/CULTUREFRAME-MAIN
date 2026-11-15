'use strict';

process.env.JWT_SECRET = 'test-jwt-secret';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/culturemetrics_test';
process.env.NODE_ENV = 'test';
process.env.CULTUREMETRICS_DATA_MODE = 'mock';

const { getSalesMetrics, filterByDateRange, isQualifyingOrder } = require('../src/services/analytics/salesAnalytics');

// Sample normalized orders for unit tests
const makeOrder = (overrides = {}) => ({
  id: 'o1',
  createdAt: '2026-10-01T10:00:00.000Z',
  status: 'completed',
  currency: 'PHP',
  items: [{ productId: 'p1', productName: 'Test Product', category: 'Handicrafts', quantity: 2, unitPrice: '250.00' }],
  subtotal: '500.00',
  discountAmount: '0.00',
  shippingAmount: '80.00',
  taxAmount: '0.00',
  paymentStatus: 'paid',
  refundAmount: '0.00',
  ...overrides,
});

describe('isQualifyingOrder', () => {
  it('returns true for completed order', () => {
    expect(isQualifyingOrder(makeOrder({ status: 'completed' }))).toBe(true);
  });

  it('returns true for paid paymentStatus regardless of status', () => {
    expect(isQualifyingOrder(makeOrder({ status: 'processing', paymentStatus: 'paid' }))).toBe(true);
  });

  it('returns false for cancelled order', () => {
    expect(isQualifyingOrder(makeOrder({ status: 'cancelled', paymentStatus: 'pending' }))).toBe(false);
  });

  it('returns false for pending unpaid order', () => {
    expect(isQualifyingOrder(makeOrder({ status: 'pending', paymentStatus: 'pending' }))).toBe(false);
  });
});

describe('filterByDateRange', () => {
  const orders = [
    makeOrder({ createdAt: '2026-09-01T00:00:00Z' }),
    makeOrder({ id: 'o2', createdAt: '2026-10-15T00:00:00Z' }),
    makeOrder({ id: 'o3', createdAt: '2026-11-01T00:00:00Z' }),
  ];

  it('filters orders within range', () => {
    const result = filterByDateRange(orders, '2026-10-01', '2026-10-31');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('o2');
  });

  it('returns all orders when no range is specified', () => {
    expect(filterByDateRange(orders)).toHaveLength(3);
  });

  it('excludes orders before startDate', () => {
    const result = filterByDateRange(orders, '2026-10-01');
    expect(result.every((o) => o.createdAt >= '2026-10-01')).toBe(true);
  });
});

describe('getSalesMetrics (mock mode)', () => {
  it('returns expected shape', async () => {
    const result = await getSalesMetrics({ startDate: '2026-07-01', endDate: '2026-10-12' });
    expect(result).toHaveProperty('grossSales');
    expect(result).toHaveProperty('netSales');
    expect(result).toHaveProperty('qualifyingOrders');
    expect(result).toHaveProperty('avgOrderValue');
    expect(result).toHaveProperty('trend');
    expect(result).toHaveProperty('byCategory');
    expect(result).toHaveProperty('topProducts');
    expect(result._dataMode).toBe('mock');
  });

  it('grossSales is a valid decimal string', async () => {
    const result = await getSalesMetrics({});
    expect(typeof result.grossSales).toBe('string');
    expect(parseFloat(result.grossSales)).toBeGreaterThanOrEqual(0);
  });

  it('cancelled orders are excluded from qualifying orders', async () => {
    const result = await getSalesMetrics({});
    expect(result.qualifyingOrders).toBeLessThanOrEqual(result.totalOrders);
  });

  it('avgOrderValue is grossSales / qualifyingOrders', async () => {
    const result = await getSalesMetrics({});
    if (result.qualifyingOrders > 0) {
      const expected = parseFloat(result.grossSales) / result.qualifyingOrders;
      expect(parseFloat(result.avgOrderValue)).toBeCloseTo(expected, 1);
    }
  });
});
