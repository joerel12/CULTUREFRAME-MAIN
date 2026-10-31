'use strict';

jest.mock('../src/services/cultureframe/cultureframeAdapter', () => ({
  cultureFrameAdapter: { getOrders: jest.fn() },
}));

const { env } = require('../src/config/environment');
const { cultureFrameAdapter } = require('../src/services/cultureframe/cultureframeAdapter');
const { fetchOrders } = require('../src/services/analytics/dataProvider');

describe('analytics data mode isolation', () => {
  const originalMode = env.DATA_MODE;
  const originalIntegrationEnabled = env.CULTUREFRAME_INTEGRATION_ENABLED;

  beforeEach(() => cultureFrameAdapter.getOrders.mockReset());
  afterAll(() => {
    env.DATA_MODE = originalMode;
    env.CULTUREFRAME_INTEGRATION_ENABLED = originalIntegrationEnabled;
  });

  it('keeps demo requests on the mock provider when live integration is disabled', async () => {
    env.DATA_MODE = 'mock';
    env.CULTUREFRAME_INTEGRATION_ENABLED = false;

    const result = await fetchOrders();

    expect(result._dataMode).toBe('mock');
    expect(result.orders.length).toBeGreaterThan(0);
    expect(cultureFrameAdapter.getOrders).not.toHaveBeenCalled();
  });

  it('fails clearly without calling CultureFrame when live integration is disabled', async () => {
    env.DATA_MODE = 'live';
    env.CULTUREFRAME_INTEGRATION_ENABLED = false;

    await expect(fetchOrders()).rejects.toMatchObject({
      code: 'INTEGRATION_DISABLED',
      status: 503,
    });
    expect(cultureFrameAdapter.getOrders).not.toHaveBeenCalled();
  });
});
