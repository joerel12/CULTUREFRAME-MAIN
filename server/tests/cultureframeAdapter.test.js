'use strict';

jest.mock('../src/services/cultureframe/cultureframeClient', () => ({
  cultureFrameClient: { get: jest.fn() },
}));

const { cultureFrameClient } = require('../src/services/cultureframe/cultureframeClient');
const { getAllPages } = require('../src/services/cultureframe/cultureframeAdapter');

describe('CultureFrame pagination', () => {
  beforeEach(() => cultureFrameClient.get.mockReset());

  it('fetches and combines every advertised page using the contract limit', async () => {
    cultureFrameClient.get
      .mockResolvedValueOnce({ data: [{ id: 'a' }], pagination: { page: 1, total: 3, totalPages: 3 } })
      .mockResolvedValueOnce({ data: [{ id: 'b' }], pagination: { page: 2, total: 3, totalPages: 3 } })
      .mockResolvedValueOnce({ data: [{ id: 'c' }], pagination: { page: 3, total: 3, totalPages: 3 } });

    const result = await getAllPages('/orders', { startDate: '2026-10-01' });

    expect(result.data.map((record) => record.id)).toEqual(['a', 'b', 'c']);
    expect(result.pagination.total).toBe(3);
    expect(cultureFrameClient.get).toHaveBeenNthCalledWith(1, '/orders', {
      startDate: '2026-10-01',
      page: 1,
      limit: 200,
    });
    expect(cultureFrameClient.get).toHaveBeenNthCalledWith(3, '/orders', {
      startDate: '2026-10-01',
      page: 3,
      limit: 200,
    });
  });

  it('fails clearly when the upstream page count exceeds the supported bound', async () => {
    cultureFrameClient.get.mockResolvedValueOnce({
      data: [],
      pagination: { page: 1, totalPages: 101 },
    });

    await expect(getAllPages('/orders')).rejects.toMatchObject({
      code: 'CULTUREFRAME_PAGINATION_LIMIT',
    });
    expect(cultureFrameClient.get).toHaveBeenCalledTimes(1);
  });

  it('fails rather than silently truncating a full page with no pagination metadata', async () => {
    cultureFrameClient.get.mockResolvedValueOnce({
      data: Array.from({ length: 200 }, (_, index) => ({ id: String(index) })),
    });

    await expect(getAllPages('/orders')).rejects.toMatchObject({
      code: 'CULTUREFRAME_INVALID_RESPONSE',
    });
    expect(cultureFrameClient.get).toHaveBeenCalledTimes(1);
  });

  it('passes through non-list responses such as an overview summary', async () => {
    const response = { data: { totalOrders: 42 } };
    cultureFrameClient.get.mockResolvedValueOnce(response);

    await expect(getAllPages('/overview')).resolves.toBe(response);
  });
});
