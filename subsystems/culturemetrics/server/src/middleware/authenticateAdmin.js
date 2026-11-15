'use strict';

const jwt = require('jsonwebtoken');
const { env } = require('../config/environment');
const { Admin } = require('../models');

/**
 * Middleware: verifies the JWT from the Authorization header (Bearer token)
 * or the httpOnly cookie 'cm_token'.
 * Attaches req.admin on success.
 */
async function authenticateAdmin(req, res, next) {
  try {
    let token = null;

    // Prefer httpOnly cookie, fall back to Authorization header
    if (req.cookies && req.cookies.cm_token) {
      token = req.cookies.cm_token;
    } else {
      const authHeader = req.headers.authorization || '';
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
      });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);

    const admin = await Admin.findOne({
      where: { id: decoded.sub, isActive: true },
      attributes: ['id', 'username', 'email', 'role', 'isActive', 'lastLoginAt'],
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Administrator account not found or inactive.' },
      });
    }

    req.admin = admin;
    return next();
  } catch (err) {
    return next(err);
  }
}

/**
 * Middleware: requires admin or superadmin role.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
      });
    }
    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions.' },
      });
    }
    return next();
  };
}

module.exports = { authenticateAdmin, requireRole };
