'use strict';

/**
 * Simple logger utility.
 * In production, structured logs are preferred.
 * Sensitive values (tokens, passwords) must never be passed to any logger.
 */

const { env } = require('../config/environment');

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const CURRENT_LEVEL = env.isDevelopment() ? LEVELS.debug : LEVELS.info;

function log(level, ...args) {
  if (LEVELS[level] <= CURRENT_LEVEL) {
    const prefix = `[${new Date().toISOString()}] [${level.toUpperCase()}]`;
    if (level === 'error') {
      console.error(prefix, ...args);
    } else if (level === 'warn') {
      console.warn(prefix, ...args);
    } else {
      console.log(prefix, ...args);
    }
  }
}

const logger = {
  error: (...args) => log('error', ...args),
  warn: (...args) => log('warn', ...args),
  info: (...args) => log('info', ...args),
  debug: (...args) => log('debug', ...args),
};

module.exports = logger;
