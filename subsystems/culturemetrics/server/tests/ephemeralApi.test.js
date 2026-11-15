'use strict';

process.env.NODE_ENV = 'development';
process.env.CULTUREMETRICS_DATA_MODE = 'mock';
process.env.JWT_SECRET = 'ephemeral-api-test-secret';
process.env.SESSION_SECRET = 'ephemeral-api-test-session-secret';
process.env.DATABASE_URL = '';
process.env.CULTUREFRAME_INTEGRATION_ENABLED = 'false';
process.env.CULTUREFRAME_SSO_SECRET = 'cultureframe-ephemeral-sso-test-secret-at-least-32';

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const models = require('../src/models');
const authController = require('../src/controllers/auth.controller');
const integrationController = require('../src/controllers/integration.controller');
const analyticsController = require('../src/controllers/analytics.controller');
const { authenticateAdmin } = require('../src/middleware/authenticateAdmin');

function responseDouble() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    cookie() {
      return this;
    },
    clearCookie() {
      return this;
    },
  };
}

async function invoke(handler, req, res = responseDouble()) {
  let nextError;
  await handler(req, res, (error) => { nextError = error; });
  if (nextError) throw nextError;
  return res;
}

async function authenticate(token) {
  const req = {
    headers: token ? { authorization: `Bearer ${token}` } : {},
    cookies: {},
  };
  const res = responseDouble();
  let nextCalled = false;
  let nextError;
  await authenticateAdmin(req, res, (error) => {
    nextError = error;
    nextCalled = true;
  });
  if (nextError) throw nextError;
  return { req, res, nextCalled };
}

describe('ephemeral demo controller paths', () => {
  let token;

  beforeEach(async () => {
    models.resetEphemeralStorage();
    models.activateEphemeralStorage();
    await models.Admin.create({
      username: 'demo-admin',
      email: 'demo-admin@culturemetrics.local',
      passwordHash: await bcrypt.hash('DemoPassword123!', 4),
      role: 'superadmin',
      isActive: true,
    });
    const login = await invoke(authController.login, {
      body: { username: 'demo-admin', password: 'DemoPassword123!' },
    });
    expect(login.statusCode).toBe(200);
    token = login.body.data.token;
  });

  afterEach(() => {
    models.resetEphemeralStorage();
  });

  it('supports login, me, logout, and changing the current process password', async () => {
    const authenticated = await authenticate(token);
    expect(authenticated.nextCalled).toBe(true);

    const me = await invoke(authController.me, authenticated.req);
    expect(me.body.data.username).toBe('demo-admin');
    expect(me.body.data).not.toHaveProperty('passwordHash');

    const changed = await invoke(authController.changePassword, {
      ...authenticated.req,
      body: { currentPassword: 'DemoPassword123!', newPassword: 'ChangedPassword123!' },
    });
    expect(changed.statusCode).toBe(200);

    const oldLogin = await invoke(authController.login, {
      body: { username: 'demo-admin', password: 'DemoPassword123!' },
    });
    expect(oldLogin.statusCode).toBe(401);
    const newLogin = await invoke(authController.login, {
      body: { username: 'demo-admin', password: 'ChangedPassword123!' },
    });
    expect(newLogin.statusCode).toBe(200);

    const newSession = await authenticate(newLogin.body.data.token);
    const logout = await invoke(authController.logout, newSession.req);
    expect(logout.statusCode).toBe(200);

    models.resetEphemeralStorage();
    models.activateEphemeralStorage();
    const staleSession = await authenticate(token);
    expect(staleSession.res.statusCode).toBe(401);
  });

  it('accepts the main CultureFrame administrator handoff without a second password', async () => {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: 'cultureframe-main', aud: 'culturemetrics', sub: 'main-admin-1',
      email: 'admin@cultureframe.com', name: 'System Administrator', role: 'admin',
      iat: now, exp: now + 120, jti: 'ephemeral-sso-test',
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto.createHmac('sha256', process.env.CULTUREFRAME_SSO_SECRET).update(encoded).digest('base64url');
    const connected = await invoke(authController.cultureframeSession, { body: { token: `${encoded}.${signature}` } });

    expect(connected.statusCode).toBe(200);
    expect(connected.body.data.admin.email).toBe('admin@cultureframe.com');
    const authenticated = await authenticate(connected.body.data.token);
    expect(authenticated.nextCalled).toBe(true);
  });

  it('serves integration status, skipped connection-test state, sync diagnostics, and overview lastSync', async () => {
    const authenticated = await authenticate(token);
    const req = authenticated.req;
    const initialStatus = await invoke(integrationController.getStatus, req);
    expect(initialStatus.body.data).toMatchObject({
      dataMode: 'mock',
      storageMode: 'ephemeral',
      ephemeralStorage: true,
    });

    const connectionTest = await invoke(integrationController.testConnection, req);
    expect(connectionTest.body.data.result).toBe('skipped');
    const updatedStatus = await invoke(integrationController.getStatus, req);
    expect(updatedStatus.body.data.lastConnectionTestResult).toBe('skipped');
    expect(updatedStatus.body.data.lastConnectionTestAt).toBeTruthy();

    const sync = await invoke(integrationController.syncNow, req);
    expect(sync.statusCode).toBe(200);
    expect(sync.body.data.status).toBe('completed');
    expect((await models.AnalyticsSnapshot.findAll()).length).toBeGreaterThan(0);

    const history = await invoke(integrationController.getSyncHistory, { query: {} });
    expect(history.body.data).toHaveLength(1);
    expect(history.body.data[0].status).toBe('completed');
    expect(history.body.data[0].dataMode).toBe('mock');

    const overview = await invoke(analyticsController.getOverview, req);
    expect(overview.body.data.lastSyncAt).toBeTruthy();
    expect(overview.body.data._ephemeralStorage).toBe(true);

    const readiness = await invoke(integrationController.getConfigurationStatus, req);
    expect(readiness.body.data.storageMode).toBe('ephemeral');
  });
});
