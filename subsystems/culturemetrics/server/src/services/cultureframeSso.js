'use strict';

const crypto = require('crypto');

const LOCAL_SSO_SECRET = 'cultureframe-local-sso-secret-change-before-production-2026';

function resolveSsoSecret(environment = process.env) {
  const secret = environment.CULTUREFRAME_SSO_SECRET || (environment.NODE_ENV === 'production' ? '' : LOCAL_SSO_SECRET);
  if (secret.length < 32) throw new Error('CULTUREFRAME_SSO_SECRET must contain at least 32 characters.');
  return secret;
}

function verifyCultureFrameAdminToken(token, options = {}) {
  if (typeof token !== 'string') throw new Error('The CultureFrame access token is required.');
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw new Error('The CultureFrame access token is malformed.');

  const [encoded, suppliedSignature] = parts;
  const expectedSignature = crypto.createHmac('sha256', options.secret || resolveSsoSecret()).update(encoded).digest('base64url');
  const expected = Buffer.from(expectedSignature);
  const supplied = Buffer.from(suppliedSignature);
  if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) {
    throw new Error('The CultureFrame access token signature is invalid.');
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    throw new Error('The CultureFrame access token payload is invalid.');
  }

  const now = Math.floor((options.now || Date.now()) / 1000);
  if (payload.iss !== 'cultureframe-main' || payload.aud !== 'culturemetrics') throw new Error('The CultureFrame access token has an invalid issuer or audience.');
  if (!Number.isInteger(payload.iat) || !Number.isInteger(payload.exp) || payload.iat > now + 30 || payload.exp <= now || payload.exp - payload.iat > 180) {
    throw new Error('The CultureFrame access token is expired or outside its allowed lifetime.');
  }
  if (payload.role !== 'admin' || !payload.sub || !payload.email || !payload.name || !payload.jti) {
    throw new Error('The CultureFrame access token does not contain an administrator identity.');
  }

  return {
    subject: String(payload.sub),
    email: String(payload.email).trim().toLowerCase(),
    name: String(payload.name).trim(),
    role: payload.role,
  };
}

module.exports = { resolveSsoSecret, verifyCultureFrameAdminToken };
