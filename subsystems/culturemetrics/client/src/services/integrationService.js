import api from './api';

export const integrationService = {
  async getStatus() {
    const res = await api.get('/integration/status');
    return res.data.data;
  },

  async testConnection() {
    const res = await api.post('/integration/test-connection');
    return res.data;
  },

  async syncNow() {
    const res = await api.post('/integration/sync');
    return res.data;
  },

  async getSyncHistory(limit = 20) {
    const res = await api.get('/integration/sync-history', { params: { limit } });
    return res.data.data;
  },

  async getConfigurationStatus() {
    const res = await api.get('/integration/configuration-status');
    return res.data.data;
  },
};
