'use strict';

describe('ephemeral storage startup policy', () => {
  const keys = [
    'NODE_ENV',
    'CULTUREMETRICS_DATA_MODE',
    'DATABASE_URL',
    'JWT_SECRET',
    'SESSION_SECRET',
    'ADMIN_BOOTSTRAP_USERNAME',
    'ADMIN_BOOTSTRAP_EMAIL',
    'ADMIN_BOOTSTRAP_PASSWORD',
  ];
  let original;

  beforeEach(() => {
    original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  });

  afterEach(() => {
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  });

  function loadEnvironment(values) {
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(values, key)) process.env[key] = values[key];
      else delete process.env[key];
    }
    let result;
    jest.isolateModules(() => {
      result = require('../src/config/environment');
    });
    return result;
  }

  it('allows missing DB credentials only in development mock mode', () => {
    const { env, validateEnv } = loadEnvironment({
      NODE_ENV: 'development',
      CULTUREMETRICS_DATA_MODE: 'mock',
      DATABASE_URL: '',
      JWT_SECRET: '',
      SESSION_SECRET: '',
      ADMIN_BOOTSTRAP_USERNAME: '',
      ADMIN_BOOTSTRAP_EMAIL: '',
      ADMIN_BOOTSTRAP_PASSWORD: '',
    });

    expect(env.canUseEphemeralStorage()).toBe(true);
    expect(() => validateEnv()).not.toThrow();
    expect(env.ADMIN_BOOTSTRAP_USERNAME).toBe('demo-admin');
  });

  it.each([
    ['development', 'live'],
    ['production', 'mock'],
    ['production', 'live'],
    ['test', 'mock'],
  ])('does not permit fallback for NODE_ENV=%s and DATA_MODE=%s', (nodeEnv, dataMode) => {
    const { env, validateEnv } = loadEnvironment({
      NODE_ENV: nodeEnv,
      CULTUREMETRICS_DATA_MODE: dataMode,
      DATABASE_URL: '',
      JWT_SECRET: 'test-secret',
      SESSION_SECRET: 'test-session',
    });

    expect(env.canUseEphemeralStorage()).toBe(false);
    expect(() => validateEnv()).toThrow(/DATABASE_URL/);
  });
});
