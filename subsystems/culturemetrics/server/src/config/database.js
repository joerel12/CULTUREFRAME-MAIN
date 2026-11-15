require('dotenv').config();

const dbUrl = process.env.DATABASE_URL || '';

// Parse the DATABASE_URL for Sequelize config
const parseUrl = (url) => {
  try {
    const u = new URL(url);
    return {
      username: u.username,
      password: u.password,
      database: u.pathname.replace('/', ''),
      host: u.hostname,
      port: parseInt(u.port || '5432', 10),
    };
  } catch {
    return {};
  }
};

const parsed = parseUrl(dbUrl);

const base = {
  username: parsed.username || process.env.DB_USER || 'postgres',
  password: parsed.password || process.env.DB_PASS || 'postgres',
  database: parsed.database || process.env.DB_NAME || 'culturemetrics_dev',
  host: parsed.host || process.env.DB_HOST || '127.0.0.1',
  port: parsed.port || parseInt(process.env.DB_PORT || '5432', 10),
  dialect: 'postgres',
  logging: false,
};

module.exports = {
  development: {
    ...base,
    database: parsed.database || process.env.DB_NAME || 'culturemetrics_dev',
    logging: false,
  },
  test: {
    ...base,
    database: process.env.DB_NAME_TEST || 'culturemetrics_test',
    logging: false,
  },
  production: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  },
};
