'use strict';

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { Admin } = require('../models');
const { env } = require('../config/environment');
const { verifyCultureFrameAdminToken } = require('../services/cultureframeSso');

const COOKIE_NAME = 'cm_token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'strict',
  secure: env.isProduction(),
  maxAge: 8 * 60 * 60 * 1000, // 8 hours
};

function signToken(admin) {
  return jwt.sign(
    { sub: admin.id, role: admin.role, username: admin.username },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    const admin = await Admin.findOne({ where: { username } });

    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password.' },
      });
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password.' },
      });
    }

    await admin.update({ lastLoginAt: new Date() });

    const token = signToken(admin);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);

    return res.json({
      success: true,
      data: {
        admin: admin.toSafeJSON(),
        token, // also returned for clients that prefer header-based auth
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function cultureframeSession(req, res, next) {
  try {
    const identity = verifyCultureFrameAdminToken(req.body?.token);
    let admin = await Admin.findOne({ where: { email: identity.email } });

    if (!admin) {
      const passwordHash = await bcrypt.hash(crypto.randomBytes(48).toString('base64url'), 12);
      const usernameHash = crypto.createHash('sha256').update(`${identity.subject}:${identity.email}`).digest('hex').slice(0, 20);
      admin = await Admin.create({
        username: `cultureframe-${usernameHash}`,
        email: identity.email,
        passwordHash,
        role: 'admin',
        isActive: true,
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCOUNT_DISABLED', message: 'This CultureMetrics administrator account is disabled.' },
      });
    }

    await admin.update({ lastLoginAt: new Date() });
    const token = signToken(admin);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
    return res.json({
      success: true,
      data: { admin: admin.toSafeJSON(), token, redirect: '/dashboard' },
    });
  } catch (error) {
    if (/CultureFrame access token/.test(error.message)) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_SSO_TOKEN', message: 'CultureFrame administrator access is invalid or expired.' },
      });
    }
    return next(error);
  }
}

async function logout(req, res, next) {
  try {
    res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'strict', secure: env.isProduction() });
    return res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    return next(err);
  }
}

async function me(req, res) {
  return res.json({ success: true, data: req.admin.toSafeJSON() });
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const admin = await Admin.findByPk(req.admin.id);

    const valid = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!valid) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Current password is incorrect.' },
      });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await admin.update({ passwordHash: hash });

    // Invalidate current session by clearing cookie
    res.clearCookie(COOKIE_NAME);
    return res.json({ success: true, message: 'Password changed. Please log in again.' });
  } catch (err) {
    return next(err);
  }
}

module.exports = { login, cultureframeSession, logout, me, changePassword };
