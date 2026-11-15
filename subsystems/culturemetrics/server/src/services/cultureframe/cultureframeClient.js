'use strict';

/**
 * cultureframeClient.js
 *
 * Low-level HTTP client for the CultureFrame backend.
 * Handles authentication, timeouts, retries, error normalization.
 * Credentials are NEVER logged or included in error responses to clients.
 */

const axios = require('axios');
const { env } = require('../../config/environment');

// Retry-safe HTTP methods
const SAFE_METHODS = new Set(['get', 'head', 'options']);
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(error) {
  if (!error.response) return true; // network error / timeout
  const status = error.response.status;
  return status === 429 || status === 503 || status === 502 || status === 504;
}

/**
 * Build an axios instance configured for CultureFrame.
 */
function buildAxiosInstance(baseUrl, token, timeoutMs) {
  const instance = axios.create({
    baseURL: baseUrl,
    timeout: timeoutMs,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      // Token is set per-request to allow rotation without rebuilding the instance
    },
  });

  // Add auth token on each request without exposing it in logs
  instance.interceptors.request.use((config) => {
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  });

  return instance;
}

class CultureFrameClient {
  constructor() {
    this._instance = null;
  }

  _getInstance() {
    if (!this._instance) {
      const baseUrl = env.CULTUREFRAME_API_URL;
      const token = env.CULTUREFRAME_API_TOKEN;
      const timeout = env.CULTUREFRAME_API_TIMEOUT_MS;

      if (!baseUrl) {
        throw Object.assign(new Error('CULTUREFRAME_API_URL is not configured.'), {
          code: 'INTEGRATION_NOT_CONFIGURED',
          status: 503,
        });
      }
      if (!token) {
        throw Object.assign(new Error('CULTUREFRAME_API_TOKEN is not configured on the server.'), {
          code: 'INTEGRATION_TOKEN_MISSING',
          status: 503,
        });
      }

      this._instance = buildAxiosInstance(baseUrl, token, timeout);
    }
    return this._instance;
  }

  /**
   * Make a GET request with retry logic.
   */
  async get(path, params = {}) {
    return this._request('get', path, { params });
  }

  async _request(method, path, config = {}, attempt = 1) {
    try {
      const instance = this._getInstance();
      const response = await instance[method](path, config);
      return response.data;
    } catch (error) {
      // Never include the token in the thrown error
      const safeMessage = this._safeErrorMessage(error);

      if (SAFE_METHODS.has(method) && isRetryable(error) && attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * attempt;
        console.warn(`[CultureFrameClient] Retrying ${method.toUpperCase()} ${path} (attempt ${attempt + 1}) after ${delay}ms`);
        await sleep(delay);
        return this._request(method, path, config, attempt + 1);
      }

      const err = new Error(safeMessage);
      err.code = this._errorCode(error);
      err.status = 502;
      err.exposeMessage = true;
      throw err;
    }
  }

  _safeErrorMessage(error) {
    if (error.code === 'INTEGRATION_TOKEN_MISSING') {
      return 'CULTUREFRAME_API_TOKEN is not configured on the server.';
    }
    if (!error.response) {
      return 'CultureFrame API is unreachable. Check the API URL and network connectivity.';
    }
    const status = error.response.status;
    if (status === 401 || status === 403) {
      return 'CultureFrame API authentication failed. Check the integration token configuration.';
    }
    if (status === 404) {
      return `CultureFrame endpoint not found. The required analytics endpoints may not be implemented yet.`;
    }
    if (status === 429) {
      return 'CultureFrame API rate limit reached.';
    }
    if (status >= 500) {
      return `CultureFrame API returned a server error (${status}).`;
    }
    return `CultureFrame API returned an unexpected response (${status}).`;
  }

  _errorCode(error) {
    if (error.code === 'INTEGRATION_TOKEN_MISSING') return 'INTEGRATION_TOKEN_MISSING';
    if (!error.response) return 'CULTUREFRAME_UNAVAILABLE';
    const status = error.response.status;
    if (status === 401 || status === 403) return 'CULTUREFRAME_AUTH_FAILED';
    if (status === 404) return 'CULTUREFRAME_ENDPOINT_NOT_FOUND';
    if (status === 429) return 'CULTUREFRAME_RATE_LIMITED';
    if (status >= 500) return 'CULTUREFRAME_SERVER_ERROR';
    return 'CULTUREFRAME_REQUEST_FAILED';
  }

  /** Reset the cached instance (e.g. after config change) */
  resetInstance() {
    this._instance = null;
  }
}

// Singleton
const cultureFrameClient = new CultureFrameClient();
module.exports = { cultureFrameClient };
