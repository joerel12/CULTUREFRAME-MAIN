'use strict';

const { env } = require('../config/environment');

/**
 * Centralized error handler. Maps known error codes to safe HTTP responses.
 * Never exposes stack traces, credentials, or DB internals to clients.
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Log internally — redact sensitive fields
  const safeLog = {
    message: err.message,
    code: err.code,
    status: err.status || err.statusCode,
    path: req.path,
    method: req.method,
  };
  if (env.isDevelopment()) {
    safeLog.stack = err.stack;
  }
  console.error('[ErrorHandler]', JSON.stringify(safeLog));

  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.errors ? err.errors.map((e) => e.message).join(', ') : err.message,
      },
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Authentication token is invalid.' },
    });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: { code: 'TOKEN_EXPIRED', message: 'Authentication token has expired. Please log in again.' },
    });
  }

  const statusCode = err.status || err.statusCode || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message =
    statusCode < 500 || err.exposeMessage === true
      ? err.message || 'An error occurred.'
      : 'An internal server error occurred. Please try again later.';

  return res.status(statusCode).json({
    success: false,
    error: { code, message },
  });
}

/**
 * Creates a typed application error.
 */
function createError(message, status = 500, code = 'INTERNAL_SERVER_ERROR') {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

module.exports = { errorHandler, createError };
