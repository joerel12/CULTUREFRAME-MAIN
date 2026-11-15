import api from './api';

function buildParams(filters = {}) {
  const params = {};
  if (filters.startDate) params.startDate = filters.startDate;
  if (filters.endDate) params.endDate = filters.endDate;
  if (filters.page) params.page = filters.page;
  if (filters.limit) params.limit = filters.limit;
  if (filters.granularity) params.granularity = filters.granularity;
  return params;
}

export const analyticsService = {
  async getOverview() {
    const res = await api.get('/analytics/overview');
    return res.data.data;
  },

  async getTrends(filters = {}) {
    const res = await api.get('/analytics/trends', { params: buildParams(filters) });
    return res.data.data;
  },

  async getSales(filters = {}) {
    const res = await api.get('/analytics/sales', { params: buildParams(filters) });
    return res.data.data;
  },

  async getSalesCategories(filters = {}) {
    const res = await api.get('/analytics/sales/categories', { params: buildParams(filters) });
    return res.data.data;
  },

  async getSalesTopProducts(filters = {}) {
    const res = await api.get('/analytics/sales/top-products', { params: buildParams(filters) });
    return res.data.data;
  },

  async getProducts(filters = {}) {
    const res = await api.get('/analytics/products', { params: buildParams(filters) });
    return res.data.data;
  },

  async getOrders(filters = {}) {
    const res = await api.get('/analytics/orders', { params: buildParams(filters) });
    return res.data.data;
  },

  async getOrderStatuses(filters = {}) {
    const res = await api.get('/analytics/orders/statuses', { params: buildParams(filters) });
    return res.data.data;
  },

  async getCustomers(filters = {}) {
    const res = await api.get('/analytics/customers', { params: buildParams(filters) });
    return res.data.data;
  },

  async getCustomerTrends(filters = {}) {
    const res = await api.get('/analytics/customers/trends', { params: buildParams(filters) });
    return res.data.data;
  },

  async getEvents(filters = {}) {
    const res = await api.get('/analytics/events', { params: buildParams(filters) });
    return res.data.data;
  },

  async getDestinations(filters = {}) {
    const res = await api.get('/analytics/destinations', { params: buildParams(filters) });
    return res.data.data;
  },

  async getHeritage(filters = {}) {
    const res = await api.get('/analytics/destinations/heritage', { params: buildParams(filters) });
    return res.data.data;
  },

  async getScenic(filters = {}) {
    const res = await api.get('/analytics/destinations/scenic', { params: buildParams(filters) });
    return res.data.data;
  },
};
