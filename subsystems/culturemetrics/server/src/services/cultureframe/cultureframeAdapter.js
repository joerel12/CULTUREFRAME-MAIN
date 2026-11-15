'use strict';

/**
 * cultureframeAdapter.js
 *
 * Maps CultureMetrics data-access calls to actual CultureFrame API endpoints.
 * All endpoint paths are configurable. If CultureFrame uses different routes,
 * update the ENDPOINTS map — do not change analytics services.
 *
 * NOTE: These endpoints do not currently exist on CultureFrame.
 * See docs/CULTUREFRAME_API_CONTRACT.md for the required integration.
 */

const { cultureFrameClient } = require('./cultureframeClient');
const PAGE_SIZE = 200;
const MAX_PAGES = 100;

async function getAllPages(path, params = {}) {
  const firstPage = await cultureFrameClient.get(path, { ...params, page: 1, limit: PAGE_SIZE });
  if (!Array.isArray(firstPage?.data)) return firstPage;

  const rawTotalPages = firstPage.pagination?.totalPages;
  if ((rawTotalPages === undefined || rawTotalPages === null) && firstPage.data.length >= PAGE_SIZE) {
    throw Object.assign(new Error(`CultureFrame returned a full page without pagination metadata for ${path}.`), {
      code: 'CULTUREFRAME_INVALID_RESPONSE',
      status: 502,
      exposeMessage: true,
    });
  }
  const totalPages = rawTotalPages === undefined || rawTotalPages === null ? 1 : Number(rawTotalPages);
  if (!Number.isInteger(totalPages) || totalPages < 1 || totalPages > MAX_PAGES) {
    throw Object.assign(new Error(`CultureFrame pagination exceeded the supported ${MAX_PAGES}-page limit for ${path}.`), {
      code: 'CULTUREFRAME_PAGINATION_LIMIT',
      status: 502,
      exposeMessage: true,
    });
  }

  const records = [...firstPage.data];
  // Keep the upstream request fan-out bounded while retrieving all advertised pages.
  for (let first = 2; first <= totalPages; first += 5) {
    const last = Math.min(first + 4, totalPages);
    const pages = await Promise.all(
      Array.from({ length: last - first + 1 }, (_, index) =>
        cultureFrameClient.get(path, { ...params, page: first + index, limit: PAGE_SIZE })
      )
    );
    for (const page of pages) {
      if (!Array.isArray(page?.data)) {
        throw Object.assign(new Error(`CultureFrame returned an invalid paginated response for ${path}.`), {
          code: 'CULTUREFRAME_INVALID_RESPONSE',
          status: 502,
          exposeMessage: true,
        });
      }
      records.push(...page.data);
    }
  }

  return {
    ...firstPage,
    data: records,
    pagination: { ...firstPage.pagination, page: 1, limit: PAGE_SIZE, totalPages },
  };
}

// Configurable endpoint paths — update these to match the real CultureFrame routes
const ENDPOINTS = {
  overview: '/api/integrations/analytics/overview',
  orders: '/api/integrations/analytics/orders',
  products: '/api/integrations/analytics/products',
  customersSummary: '/api/integrations/analytics/customers/summary',
  events: '/api/integrations/analytics/events',
  heritage: '/api/integrations/analytics/heritage',
  scenic: '/api/integrations/analytics/scenic',
};

class CultureFrameAdapter {
  /**
   * Fetch high-level overview metrics from CultureFrame.
   */
  async getOverview(params = {}) {
    return cultureFrameClient.get(ENDPOINTS.overview, params);
  }

  /**
   * Fetch paginated orders. Supports startDate, endDate, page, limit.
   */
  async getOrders(params = {}) {
    return getAllPages(ENDPOINTS.orders, params);
  }

  /**
   * Fetch paginated products.
   */
  async getProducts(params = {}) {
    return getAllPages(ENDPOINTS.products, params);
  }

  /**
   * Fetch customer summary aggregates (no personal data).
   */
  async getCustomers(params = {}) {
    return cultureFrameClient.get(ENDPOINTS.customersSummary, params);
  }

  /**
   * Fetch events and registration counts.
   */
  async getEvents(params = {}) {
    return getAllPages(ENDPOINTS.events, params);
  }

  /**
   * Fetch cultural heritage records.
   */
  async getHeritage(params = {}) {
    return getAllPages(ENDPOINTS.heritage, params);
  }

  /**
   * Fetch scenic destination records.
   */
  async getScenicDestinations(params = {}) {
    return getAllPages(ENDPOINTS.scenic, params);
  }

  /** Return the configured endpoint map (for documentation/status display) */
  getEndpoints() {
    return { ...ENDPOINTS };
  }
}

const cultureFrameAdapter = new CultureFrameAdapter();
module.exports = { cultureFrameAdapter, getAllPages };
