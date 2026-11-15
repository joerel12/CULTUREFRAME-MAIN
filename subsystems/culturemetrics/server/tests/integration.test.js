'use strict';

process.env.JWT_SECRET = 'test-jwt-secret';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/culturemetrics_test';
process.env.NODE_ENV = 'test';
process.env.CULTUREMETRICS_DATA_MODE = 'mock';
process.env.CULTUREFRAME_INTEGRATION_ENABLED = 'false';

const { mockCultureFrameProvider } = require('../src/services/cultureframe/mockCultureframeProvider');
const { normalizeOrders, normalizeProducts, normalizeCustomers, normalizeEvents } = require('../src/services/cultureframe/cultureframeNormalizer');

describe('MockCultureFrameProvider', () => {
  it('returns mock orders with _dataMode = mock', async () => {
    const result = await mockCultureFrameProvider.getOrders({});
    expect(result._dataMode).toBe('mock');
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);
  });

  it('returns mock products', async () => {
    const result = await mockCultureFrameProvider.getProducts();
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data[0]).toHaveProperty('id');
    expect(result.data[0]).toHaveProperty('name');
    expect(result.data[0]).toHaveProperty('price');
  });

  it('returns mock events', async () => {
    const result = await mockCultureFrameProvider.getEvents();
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data[0]).toHaveProperty('totalRegistrations');
  });

  it('labels data with the DEMO DATA label', async () => {
    const result = await mockCultureFrameProvider.getOrders({});
    expect(result._label).toMatch(/DEMO/i);
  });

  it('filters orders by date range', async () => {
    const result = await mockCultureFrameProvider.getOrders({ startDate: '2099-01-01', endDate: '2099-12-31' });
    // Should return empty since mock dates are in 2026
    expect(result.data.length).toBe(0);
  });
});

describe('CultureFrameNormalizer', () => {
  it('normalizes a valid order response', () => {
    const raw = {
      data: [{
        id: '123',
        createdAt: '2026-10-01T10:00:00.000Z',
        status: 'completed',
        currency: 'PHP',
        items: [{ productId: '45', productName: 'Test', category: 'Crafts', quantity: 2, unitPrice: '250.00' }],
        subtotal: '500.00',
        discountAmount: '0.00',
        shippingAmount: '80.00',
        taxAmount: '0.00',
        paymentStatus: 'paid',
        refundAmount: '0.00',
      }],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
    };
    const result = normalizeOrders(raw);
    expect(result.orders).toHaveLength(1);
    expect(result.orders[0].externalId ?? result.orders[0].id).toBe('123');
    expect(result.rejected).toBe(0);
  });

  it('rejects orders with invalid data gracefully and does not throw', () => {
    const raw = { data: [{ id: 'bad', status: 123 }] };
    // Normalizer should not throw — it logs and rejects the record
    expect(() => normalizeOrders(raw)).not.toThrow();
  });

  it('rejected invalid orders end up in the rejected count, not the orders array', () => {
    const raw = { data: [{ id: 'bad', status: 123 }] };
    const result = normalizeOrders(raw);
    expect(result.orders).toHaveLength(0);
    expect(result.rejected).toBeGreaterThan(0);
  });

  it('normalizes products', () => {
    const raw = {
      data: [{ id: 'p1', name: 'Basket', category: 'Crafts', price: '350.00', stockQuantity: 10, unitsSold: 5, totalRevenue: '1750.00', isAvailable: true }],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
    };
    const result = normalizeProducts(raw);
    expect(result.products).toHaveLength(1);
    expect(result.products[0].price).toBe('350.00');
  });

  it('does not silently convert missing paymentStatus to paid', () => {
    // Provide a full valid order but omit paymentStatus — it should default to null
    const raw = {
      data: [{
        id: 'o1',
        createdAt: '2026-10-01T10:00:00.000Z',
        status: 'completed',
        currency: 'PHP',
        items: [],
        subtotal: '500.00',
        discountAmount: '0.00',
        shippingAmount: '0.00',
        taxAmount: '0.00',
        refundAmount: '0.00',
        // paymentStatus intentionally omitted
      }],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
    };
    const result = normalizeOrders(raw);
    expect(result.orders).toHaveLength(1);
    // paymentStatus should default to null, not 'paid'
    expect(result.orders[0].paymentStatus).toBeNull();
  });
});

describe('CSV formula injection protection', () => {
  const { generateSalesCsv, generateProductsCsv } = require('../src/services/reporting/csvReporter');

  it('generates a sales CSV without throwing', async () => {
    const result = await generateSalesCsv({});
    expect(typeof result.csv).toBe('string');
    expect(result.csv).toContain('Period');
    expect(result.csv).toContain('Gross Sales');
  });

  it('generates a products CSV without throwing', async () => {
    const result = await generateProductsCsv({});
    expect(typeof result.csv).toBe('string');
    expect(result.csv).toContain('Product Name');
  });

  it('CSV filename includes a date', async () => {
    const result = await generateSalesCsv({});
    expect(result.filename).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('marks mock data mode', async () => {
    const result = await generateSalesCsv({});
    expect(result.dataMode).toBe('mock');
  });
});
