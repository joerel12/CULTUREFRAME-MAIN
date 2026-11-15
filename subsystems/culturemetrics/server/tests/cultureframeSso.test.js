'use strict';

const crypto = require('crypto');

process.env.NODE_ENV = 'test';
process.env.CULTUREFRAME_SSO_SECRET = 'cultureframe-sso-test-secret-at-least-32-characters';

const { verifyCultureFrameAdminToken } = require('../src/services/cultureframeSso');

function sign(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', process.env.CULTUREFRAME_SSO_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

function payload(overrides = {}) {
  return {
    iss: 'cultureframe-main',
    aud: 'culturemetrics',
    sub: '1',
    email: 'admin@cultureframe.com',
    name: 'System Administrator',
    role: 'admin',
    iat: 1700000000,
    exp: 1700000120,
    jti: 'test-jti',
    ...overrides,
  };
}

test('verifies a short-lived CultureFrame administrator handoff', () => {
  expect(verifyCultureFrameAdminToken(sign(payload()), { now: 1700000050000 })).toMatchObject({
    subject: '1',
    email: 'admin@cultureframe.com',
    role: 'admin',
  });
});

test('rejects customer, expired, and tampered handoffs', () => {
  expect(() => verifyCultureFrameAdminToken(sign(payload({ role: 'customer' })), { now: 1700000050000 })).toThrow();
  expect(() => verifyCultureFrameAdminToken(sign(payload()), { now: 1700000200000 })).toThrow();
  expect(() => verifyCultureFrameAdminToken(`${sign(payload())}x`, { now: 1700000050000 })).toThrow();
});
