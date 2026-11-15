'use strict';

/**
 * mockCultureframeProvider.js
 *
 * Development-only mock data provider.
 * ALL DATA IS FICTIONAL. Never mix with real CultureFrame data.
 * Disabled automatically when CULTUREMETRICS_DATA_MODE !== 'mock'.
 */

const { env } = require('../../config/environment');

const DATA_MODE_LABEL = 'DEMO DATA — NOT REAL CULTUREFRAME DATA';

// ── Fictional mock data ───────────────────────────────────────────────────────

const MOCK_PRODUCTS = [
  { id: 'p1', name: 'Handwoven Basket', category: 'Handicrafts', price: '350.00', stockQuantity: 45, unitsSold: 120, totalRevenue: '42000.00', isAvailable: true },
  { id: 'p2', name: 'Buri Mat', category: 'Handicrafts', price: '250.00', stockQuantity: 30, unitsSold: 85, totalRevenue: '21250.00', isAvailable: true },
  { id: 'p3', name: 'T\'boli Brass Bracelet', category: 'Jewelry', price: '480.00', stockQuantity: 20, unitsSold: 62, totalRevenue: '29760.00', isAvailable: true },
  { id: 'p4', name: 'Mangyan Pottery', category: 'Pottery', price: '600.00', stockQuantity: 15, unitsSold: 40, totalRevenue: '24000.00', isAvailable: true },
  { id: 'p5', name: 'Local Honey', category: 'Food & Produce', price: '180.00', stockQuantity: 80, unitsSold: 200, totalRevenue: '36000.00', isAvailable: true },
  { id: 'p6', name: 'Organic Rice (5kg)', category: 'Food & Produce', price: '290.00', stockQuantity: 100, unitsSold: 310, totalRevenue: '89900.00', isAvailable: true },
  { id: 'p7', name: 'Embroidered Pouch', category: 'Textiles', price: '150.00', stockQuantity: 60, unitsSold: 95, totalRevenue: '14250.00', isAvailable: true },
  { id: 'p8', name: 'Coco Shell Earrings', category: 'Jewelry', price: '120.00', stockQuantity: 50, unitsSold: 78, totalRevenue: '9360.00', isAvailable: true },
];

const STATUS_MAP = ['completed', 'completed', 'completed', 'pending', 'processing', 'cancelled'];

function randomStatus(seed) {
  return STATUS_MAP[seed % STATUS_MAP.length];
}

function randomProduct(seed) {
  return MOCK_PRODUCTS[seed % MOCK_PRODUCTS.length];
}

// Pre-generate orders once at module load — consistent within a process lifecycle
function generateOrders(count = 60) {
  const orders = [];
  // Use a deterministic base date so orders don't move on every request
  const BASE_TIME = new Date('2026-10-12T00:00:00.000Z').getTime();

  for (let i = 1; i <= count; i++) {
    const daysAgo = (i * 1.47) % 90; // deterministic spread over 90 days
    const created = new Date(BASE_TIME - Math.floor(daysAgo) * 86400000);
    const status = randomStatus(i);
    const itemCount = (i % 3) + 1;
    const items = [];
    let subtotal = 0;

    for (let j = 0; j < itemCount; j++) {
      const p = randomProduct(i + j * 7);
      const qty = (j % 3) + 1;
      const lineTotal = parseFloat(p.price) * qty;
      subtotal += lineTotal;
      items.push({
        productId: p.id,
        productName: p.name,
        category: p.category,
        quantity: qty,
        unitPrice: p.price,
      });
    }

    orders.push({
      id: `mock-order-${i}`,
      createdAt: created.toISOString(),
      updatedAt: created.toISOString(),
      status,
      currency: 'PHP',
      items,
      subtotal: subtotal.toFixed(2),
      discountAmount: '0.00',
      shippingAmount: '80.00',
      taxAmount: '0.00',
      paymentStatus: status === 'completed' ? 'paid' : status === 'cancelled' ? 'refunded' : 'pending',
      refundAmount: status === 'cancelled' ? subtotal.toFixed(2) : '0.00',
    });
  }

  return orders;
}

// Pre-generate once — stable for the lifetime of the process
const MOCK_ORDERS = generateOrders(80);

const MOCK_EVENTS = [
  { id: 'ev1', name: 'Mansalay Heritage Festival 2026', startDate: '2026-11-01', endDate: '2026-11-03', totalRegistrations: 320, confirmedAttendance: null, cancelledRegistrations: 15, status: 'upcoming' },
  { id: 'ev2', name: 'Traditional Crafts Workshop', startDate: '2026-09-15', endDate: '2026-09-15', totalRegistrations: 45, confirmedAttendance: 38, cancelledRegistrations: 4, status: 'completed' },
  { id: 'ev3', name: 'Scenic Trek to Mt. Calavite', startDate: '2026-10-05', endDate: '2026-10-05', totalRegistrations: 80, confirmedAttendance: 72, cancelledRegistrations: 8, status: 'completed' },
  { id: 'ev4', name: 'Buri Weaving Demonstration', startDate: '2026-08-20', endDate: '2026-08-20', totalRegistrations: 30, confirmedAttendance: 28, cancelledRegistrations: 2, status: 'completed' },
  { id: 'ev5', name: 'Year-End Cultural Gala', startDate: '2026-12-20', endDate: '2026-12-20', totalRegistrations: 150, confirmedAttendance: null, cancelledRegistrations: 0, status: 'upcoming' },
];

const MOCK_HERITAGE = [
  { id: 'h1', name: 'Mansalay Municipal Church', category: 'Religious Heritage', location: 'Mansalay, Oriental Mindoro', viewCount: 542, isPublished: true },
  { id: 'h2', name: 'Mangyan Traditional Settlement', category: 'Indigenous Culture', location: 'Mansalay Uplands', viewCount: 389, isPublished: true },
  { id: 'h3', name: 'Spanish-era Bridge Ruins', category: 'Historical Structure', location: 'Mansalay River', viewCount: 210, isPublished: true },
  { id: 'h4', name: 'Bulalacao Ancestral House', category: 'Ancestral Heritage', location: 'Bulalacao', viewCount: 175, isPublished: true },
];

const MOCK_SCENIC = [
  { id: 's1', name: 'Mt. Calavite Natural Park', category: 'Mountain', latitude: 12.7603, longitude: 121.0964, viewCount: 810, isPublished: true },
  { id: 's2', name: 'Mansalay White Beach', category: 'Beach', latitude: 12.5207, longitude: 121.4281, viewCount: 1240, isPublished: true },
  { id: 's3', name: 'Batangas Channel Viewpoint', category: 'Coastal', latitude: 12.5481, longitude: 121.4012, viewCount: 430, isPublished: true },
  { id: 's4', name: 'Biga Falls', category: 'Waterfall', latitude: 12.7100, longitude: 121.1500, viewCount: 320, isPublished: true },
  { id: 's5', name: 'Rizal Rice Terraces', category: 'Agricultural', latitude: 12.6200, longitude: 121.2000, viewCount: 215, isPublished: true },
];

const MOCK_CUSTOMERS = {
  totalRegistered: 248,
  newThisPeriod: 34,
  withAtLeastOneOrder: 186,
  repeatCustomers: 102,
  registrationsByDate: (() => {
    const entries = [];
    // Deterministic registration trend — base date fixed
    const BASE = new Date('2026-10-12T00:00:00.000Z').getTime();
    for (let i = 89; i >= 0; i--) {
      const d = new Date(BASE - i * 86400000);
      const dateStr = d.toISOString().slice(0, 10);
      // Deterministic count based on day index
      entries.push({ date: dateStr, count: (i * 3 + 7) % 6 });
    }
    return entries;
  })(),
};

// ── Mock provider class ───────────────────────────────────────────────────────

class MockCultureFrameProvider {
  _assertMockMode() {
    if (env.isProduction() && env.DATA_MODE !== 'mock') {
      throw Object.assign(new Error('Mock provider must not be used in production with live data mode.'), {
        code: 'MOCK_IN_PRODUCTION',
        status: 500,
      });
    }
  }

  getDataModeLabel() {
    return DATA_MODE_LABEL;
  }

  async getOverview() {
    this._assertMockMode();
    const completedOrders = MOCK_ORDERS.filter((o) => o.status === 'completed');
    const totalRevenue = completedOrders.reduce((sum, o) => sum + parseFloat(o.subtotal || '0'), 0);

    return {
      _dataMode: 'mock',
      _label: DATA_MODE_LABEL,
      totalRevenue: totalRevenue.toFixed(2),
      totalOrders: MOCK_ORDERS.length,
      completedOrders: completedOrders.length,
      totalProducts: MOCK_PRODUCTS.length,
      totalCustomers: MOCK_CUSTOMERS.totalRegistered,
      totalEventRegistrations: MOCK_EVENTS.reduce((s, e) => s + e.totalRegistrations, 0),
      totalHeritageSites: MOCK_HERITAGE.length,
      totalScenicDestinations: MOCK_SCENIC.length,
    };
  }

  async getOrders(params = {}) {
    this._assertMockMode();
    let orders = [...MOCK_ORDERS];

    if (params.startDate) {
      orders = orders.filter((o) => o.createdAt >= params.startDate);
    }
    if (params.endDate) {
      orders = orders.filter((o) => o.createdAt <= params.endDate + 'T23:59:59');
    }

    const page = parseInt(params.page || '1', 10);
    const limit = parseInt(params.limit || '50', 10);
    const start = (page - 1) * limit;
    const paginated = orders.slice(start, start + limit);

    return {
      _dataMode: 'mock',
      _label: DATA_MODE_LABEL,
      data: paginated,
      pagination: { page, limit, total: orders.length, totalPages: Math.ceil(orders.length / limit) },
    };
  }

  async getProducts() {
    this._assertMockMode();
    return {
      _dataMode: 'mock',
      _label: DATA_MODE_LABEL,
      data: MOCK_PRODUCTS,
      pagination: { page: 1, limit: 50, total: MOCK_PRODUCTS.length, totalPages: 1 },
    };
  }

  async getCustomers() {
    this._assertMockMode();
    return {
      _dataMode: 'mock',
      _label: DATA_MODE_LABEL,
      data: MOCK_CUSTOMERS,
    };
  }

  async getEvents() {
    this._assertMockMode();
    return {
      _dataMode: 'mock',
      _label: DATA_MODE_LABEL,
      data: MOCK_EVENTS,
      pagination: { page: 1, limit: 50, total: MOCK_EVENTS.length, totalPages: 1 },
    };
  }

  async getHeritage() {
    this._assertMockMode();
    return {
      _dataMode: 'mock',
      _label: DATA_MODE_LABEL,
      data: MOCK_HERITAGE,
      pagination: { page: 1, limit: 50, total: MOCK_HERITAGE.length, totalPages: 1 },
    };
  }

  async getScenicDestinations() {
    this._assertMockMode();
    return {
      _dataMode: 'mock',
      _label: DATA_MODE_LABEL,
      data: MOCK_SCENIC,
      pagination: { page: 1, limit: 50, total: MOCK_SCENIC.length, totalPages: 1 },
    };
  }
}

const mockCultureFrameProvider = new MockCultureFrameProvider();
module.exports = { mockCultureFrameProvider };
