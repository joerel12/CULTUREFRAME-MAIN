'use strict';

/**
 * Authentication tests
 * Run with: npm test (from server/)
 * Uses in-memory test doubles — does NOT require a running database.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock environment before loading modules
process.env.JWT_SECRET = 'test-jwt-secret-for-tests-only';
process.env.JWT_EXPIRES_IN = '1h';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/culturemetrics_test';
process.env.NODE_ENV = 'test';

describe('Auth - Password Hashing', () => {
  it('should hash a password with bcrypt', async () => {
    const hash = await bcrypt.hash('TestPassword1', 10);
    expect(hash).not.toBe('TestPassword1');
    expect(hash).toMatch(/^\$2[ab]\$/);
  });

  it('should verify a correct password', async () => {
    const hash = await bcrypt.hash('TestPassword1', 10);
    const valid = await bcrypt.compare('TestPassword1', hash);
    expect(valid).toBe(true);
  });

  it('should reject an incorrect password', async () => {
    const hash = await bcrypt.hash('TestPassword1', 10);
    const valid = await bcrypt.compare('WrongPassword', hash);
    expect(valid).toBe(false);
  });
});

describe('Auth - JWT', () => {
  const secret = process.env.JWT_SECRET;

  it('should sign and verify a token', () => {
    const payload = { sub: 'admin-uuid-1', role: 'admin', username: 'testadmin' };
    const token = jwt.sign(payload, secret, { expiresIn: '1h' });
    const decoded = jwt.verify(token, secret);
    expect(decoded.sub).toBe('admin-uuid-1');
    expect(decoded.role).toBe('admin');
  });

  it('should reject an expired token', () => {
    const token = jwt.sign({ sub: '123' }, secret, { expiresIn: '-1s' });
    expect(() => jwt.verify(token, secret)).toThrow('jwt expired');
  });

  it('should reject a token with wrong secret', () => {
    const token = jwt.sign({ sub: '123' }, 'wrong-secret', { expiresIn: '1h' });
    expect(() => jwt.verify(token, secret)).toThrow();
  });
});
