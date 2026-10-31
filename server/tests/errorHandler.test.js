'use strict';

const { errorHandler } = require('../src/middleware/errorHandler');

describe('errorHandler safe external service errors', () => {
  let consoleError;

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => consoleError.mockRestore());

  function invoke(error) {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    errorHandler(error, { path: '/api/v1/analytics/overview', method: 'GET' }, res, jest.fn());
    return res;
  }

  it('returns explicitly safe and actionable upstream messages for 5xx errors', () => {
    const res = invoke(Object.assign(new Error('The required CultureFrame endpoint was not found.'), {
      status: 502,
      code: 'CULTUREFRAME_ENDPOINT_NOT_FOUND',
      exposeMessage: true,
    }));

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'CULTUREFRAME_ENDPOINT_NOT_FOUND',
        message: 'The required CultureFrame endpoint was not found.',
      },
    });
  });

  it('continues hiding unexpected internal 5xx error messages', () => {
    const res = invoke(Object.assign(new Error('database connection detail'), {
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
    }));

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An internal server error occurred. Please try again later.',
      },
    });
  });
});
