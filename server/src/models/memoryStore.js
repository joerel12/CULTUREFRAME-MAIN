'use strict';

const crypto = require('crypto');

const definitions = {
  Admin: {
    timestamps: true,
    defaults: { role: 'admin', isActive: true, lastLoginAt: null },
  },
  IntegrationConfig: {
    timestamps: true,
    defaults: {
      providerName: 'cultureframe',
      apiBaseUrl: null,
      enabled: false,
      lastConnectionTestAt: null,
      lastConnectionTestResult: null,
      lastSuccessfulSyncAt: null,
    },
  },
  IntegrationSyncRun: {
    timestamps: true,
    updatedAt: false,
    defaults: {
      providerName: 'cultureframe',
      startedAt: () => new Date(),
      finishedAt: null,
      status: 'running',
      recordsFetched: 0,
      recordsProcessed: 0,
      recordsRejected: 0,
      errorSummary: null,
      dataMode: 'mock',
    },
  },
  AnalyticsSnapshot: {
    timestamps: true,
    defaults: {
      periodStart: null,
      periodEnd: null,
      metricPayload: {},
      sourceSystem: 'cultureframe',
      dataMode: 'mock',
      generatedAt: () => new Date(),
    },
  },
};

function matchesWhere(record, where = {}) {
  return Object.entries(where).every(([key, value]) => record[key] === value);
}

function project(values, attributes) {
  if (!attributes) return { ...values };
  return Object.fromEntries(attributes.filter((key) => key in values).map((key) => [key, values[key]]));
}

function createMemoryStore() {
  const rows = Object.fromEntries(Object.keys(definitions).map((name) => [name, []]));

  class MemoryRecord {
    constructor(modelName, values) {
      Object.assign(this, values);
      Object.defineProperty(this, '_modelName', { value: modelName, enumerable: false });
    }

    get() {
      return Object.fromEntries(Object.keys(this).map((key) => [key, this[key]]));
    }

    toSafeJSON() {
      const values = this.get();
      delete values.passwordHash;
      return values;
    }

    async update(values) {
      Object.assign(this, values);
      const definition = definitions[this._modelName];
      if (definition.timestamps && definition.updatedAt !== false) this.updatedAt = new Date();
      return this;
    }
  }

  const models = {};
  for (const [modelName, definition] of Object.entries(definitions)) {
    const records = rows[modelName];
    models[modelName] = {
      async create(values = {}) {
        const defaults = Object.fromEntries(
          Object.entries(definition.defaults).map(([key, value]) => [key, typeof value === 'function' ? value() : value])
        );
        const record = new MemoryRecord(modelName, {
          id: crypto.randomUUID(),
          ...defaults,
          ...values,
          ...(definition.timestamps
            ? {
                createdAt: new Date(),
                ...(definition.updatedAt === false ? {} : { updatedAt: new Date() }),
              }
            : {}),
        });
        records.push(record);
        return record;
      },
      async findOne(options = {}) {
        const found = records.find((record) => matchesWhere(record, options.where));
        if (!found) return null;
        if (!options.attributes) return found;
        return new MemoryRecord(modelName, project(found.get(), options.attributes));
      },
      async findByPk(id, options = {}) {
        const found = records.find((record) => record.id === id);
        if (!found) return null;
        if (!options.attributes) return found;
        return new MemoryRecord(modelName, project(found.get(), options.attributes));
      },
      async findAll(options = {}) {
        let found = records.filter((record) => matchesWhere(record, options.where));
        if (options.order?.length) {
          const [field, direction] = options.order[0];
          const multiplier = String(direction).toUpperCase() === 'DESC' ? -1 : 1;
          found = [...found].sort((a, b) => {
            const left = a[field] instanceof Date ? a[field].getTime() : a[field];
            const right = b[field] instanceof Date ? b[field].getTime() : b[field];
            return (left < right ? -1 : left > right ? 1 : 0) * multiplier;
          });
        }
        if (Number.isInteger(options.limit)) found = found.slice(0, options.limit);
        if (!options.attributes) return found;
        return found.map((record) => new MemoryRecord(modelName, project(record.get(), options.attributes)));
      },
      async findOrCreate({ where = {}, defaults = {} }) {
        const found = records.find((record) => matchesWhere(record, where));
        return found ? [found, false] : [await models[modelName].create({ ...defaults, ...where }), true];
      },
    };
  }

  return {
    models,
    reset() {
      for (const name of Object.keys(rows)) rows[name].length = 0;
    },
  };
}

module.exports = { createMemoryStore };
