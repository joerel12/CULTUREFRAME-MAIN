import api from './api';

export const authService = {
  async login(username, password) {
    const res = await api.post('/auth/login', { username, password });
    if (res.data?.data?.token) {
      sessionStorage.setItem('cm_token', res.data.data.token);
    }
    return res.data.data;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      sessionStorage.removeItem('cm_token');
    }
  },

  async getMe() {
    const res = await api.get('/auth/me');
    return res.data.data;
  },

  async changePassword(currentPassword, newPassword) {
    const res = await api.post('/auth/change-password', { currentPassword, newPassword });
    return res.data;
  },
};
