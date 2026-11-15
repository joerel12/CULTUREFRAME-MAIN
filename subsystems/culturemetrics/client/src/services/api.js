import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // send httpOnly cookies
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach stored token to every request (fallback for non-cookie environments)
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('cm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Centralized response error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear stored token and redirect to login
      sessionStorage.removeItem('cm_token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
