'use strict';

const { createMemoryStore } = require('../src/models/memoryStore');

describe('ephemeral memory store', () => {
  let store;

  beforeEach(() => {
    store = createMemoryStore();
  });

  it('creates, finds, and updates records only in the current store instance', async () => {
    const admin = await store.models.Admin.create({
      username: 'demo-admin',
      email: 'demo-admin@culturemetrics.local',
      passwordHash: 'hash',
    });

    expect(await store.models.Admin.findOne({ where: { username: 'demo-admin' } })).toBe(admin);
    await admin.update({ lastLoginAt: new Date('2026-10-30T00:00:00Z') });
    expect((await store.models.Admin.findByPk(admin.id)).lastLoginAt).toEqual(new Date('2026-10-30T00:00:00Z'));
    expect(admin.toSafeJSON()).not.toHaveProperty('passwordHash');

    store.reset();
    expect(await store.models.Admin.findByPk(admin.id)).toBeNull();
  });

  it('supports ordered run history, projections, and find-or-create', async () => {
    await store.models.IntegrationSyncRun.create({
      startedAt: new Date('2026-10-29T00:00:00Z'),
      status: 'completed',
      dataMode: 'mock',
    });
    await store.models.IntegrationSyncRun.create({
      startedAt: new Date('2026-10-30T00:00:00Z'),
      status: 'failed',
      dataMode: 'mock',
    });

    const [latest] = await store.models.IntegrationSyncRun.findAll({
      order: [['startedAt', 'DESC']],
      limit: 1,
      attributes: ['id', 'status', 'startedAt'],
    });
    expect(latest.status).toBe('failed');
    expect(latest).not.toHaveProperty('errorSummary');

    const [first, created] = await store.models.IntegrationConfig.findOrCreate({
      where: { providerName: 'cultureframe' },
      defaults: { enabled: false },
    });
    const [second, createdAgain] = await store.models.IntegrationConfig.findOrCreate({
      where: { providerName: 'cultureframe' },
      defaults: { enabled: true },
    });
    expect(created).toBe(true);
    expect(createdAgain).toBe(false);
    expect(second).toBe(first);
    expect(second.enabled).toBe(false);
  });
});
