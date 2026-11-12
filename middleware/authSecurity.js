/**
 * Enhanced Authentication Security Middleware
 * Provides additional security layers for session management
 */

import { LOGIN_SECURITY } from "../services/loginSecurity.js";

/**
 * Session Activity Tracking
 * Tracks user activity to detect suspicious behavior and enforce idle timeouts
 */
export const trackSessionActivity = (req, res, next) => {
  if (!req.session) return next();

  const now = Date.now();
  
  // Initialize session security metadata
  if (!req.session.security) {
    req.session.security = {
      createdAt: now,
      lastActivity: now,
      userAgent: req.get('user-agent'),
      ip: req.ip
    };
  }

  // Check for session hijacking indicators
  const currentUserAgent = req.get('user-agent');
  const currentIp = req.ip;

  // Strict mode: Different user agent = potential hijacking (disabled for mobile apps)
  if (req.session.security.userAgent && 
      currentUserAgent !== req.session.security.userAgent &&
      process.env.STRICT_SESSION_BINDING === 'true') {
    console.warn(`⚠️ Session hijacking attempt detected: User agent changed for session ${req.sessionID}`);
    req.session.destroy();
    return res.status(401).json({ 
      success: false, 
      message: 'Your session has expired for security reasons. Please sign in again.' 
    });
  }

  // Track IP changes (warn but don't block - users may switch networks)
  if (req.session.security.ip && currentIp !== req.session.security.ip) {
    console.warn(`⚠️ IP address changed for session: ${req.session.security.ip} → ${currentIp}`);
    req.session.security.ipChangeCount = (req.session.security.ipChangeCount || 0) + 1;
    req.session.security.ip = currentIp; // Update to new IP
    
    // Too many IP changes = suspicious
    if (req.session.security.ipChangeCount > 5) {
      console.warn(`🚨 Too many IP changes detected for session ${req.sessionID}`);
      req.session.destroy();
      return res.status(401).json({ 
        success: false, 
        message: 'Your session has expired for security reasons. Please sign in again.' 
      });
    }
  }

  // Check idle timeout for authenticated sessions
  if (req.session.isAuthenticated) {
    const idleTime = now - req.session.security.lastActivity;
    
    if (idleTime > LOGIN_SECURITY.sessionIdleTimeout) {
      console.log(`⏰ Session expired due to inactivity: ${req.session.userEmail}`);
      req.session.destroy();
      
      if (req.headers['x-requested-with'] === 'XMLHttpRequest' || 
          req.headers['accept']?.includes('application/json')) {
        return res.status(401).json({ 
          success: false, 
          message: 'Your session has expired due to inactivity. Please sign in again.',
          reason: 'IDLE_TIMEOUT'
        });
      }
      
      req.flash('error_msg', 'Your session has expired due to inactivity. Please sign in again.');
      return res.redirect('/login');
    }
  }

  // Update last activity timestamp
  req.session.security.lastActivity = now;
  next();
};

/**
 * Prevent Multiple Concurrent Sessions
 * Optional: Enforce single session per user (can be enabled via env var)
 */
const activeSessions = new Map(); // userId -> sessionId

export const enforceSingleSession = (req, res, next) => {
  if (!req.session?.isAuthenticated || !req.session.userId) {
    return next();
  }

  // Only enforce if enabled
  if (process.env.ENFORCE_SINGLE_SESSION !== 'true') {
    return next();
  }

  const userId = req.session.userId;
  const currentSessionId = req.sessionID;
  const existingSessionId = activeSessions.get(userId);

  // If user has an existing session, invalidate the old one
  if (existingSessionId && existingSessionId !== currentSessionId) {
    console.log(`⚠️ Multiple sessions detected for user ${userId}. Invalidating old session.`);
    // The old session will be invalid on next request
  }

  // Register current session
  activeSessions.set(userId, currentSessionId);
  
  next();
};

/**
 * Clear session from tracking on logout
 */
export const clearSessionTracking = (userId) => {
  if (userId) {
    activeSessions.delete(userId);
  }
};

/**
 * Require Authenticated Session with Enhanced Checks
 * Drop-in replacement for requireAuth with additional security
 */
export const requireSecureAuth = async (req, res, next) => {
  if (!req.session?.isAuthenticated) {
    if (req.headers['x-requested-with'] === 'XMLHttpRequest' || 
        req.headers['accept']?.includes('application/json')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required. Please sign in.' 
      });
    }
    req.flash('error_msg', 'Please sign in to access this page.');
    return res.redirect('/login');
  }

  // Check if session has been active too long (force re-auth)
  const sessionAge = Date.now() - (req.session.security?.createdAt || Date.now());
  if (sessionAge > LOGIN_SECURITY.maxSessionAge && !req.session.rememberMe) {
    console.log(`⏰ Session exceeded maximum age: ${req.session.userEmail}`);
    req.session.destroy();
    
    if (req.headers['x-requested-with'] === 'XMLHttpRequest' || 
        req.headers['accept']?.includes('application/json')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Your session has expired. Please sign in again.',
        reason: 'MAX_AGE'
      });
    }
    
    req.flash('error_msg', 'Your session has expired. Please sign in again for security.');
    return res.redirect('/login');
  }

  next();
};

/**
 * Password Change Detection
 * Forces re-authentication if password was recently changed
 */
export const checkPasswordChanged = async (req, res, next) => {
  if (!req.session?.isAuthenticated || !req.session.userId) {
    return next();
  }

  try {
    const { User } = await import('../models/userModel.js');
    const user = await User.findByPk(req.session.userId, {
      attributes: ['id', 'updatedAt']
    });

    if (!user) {
      req.session.destroy();
      return res.redirect('/login');
    }

    // Check if user was updated after session was created
    const sessionCreated = req.session.security?.createdAt || Date.now();
    const userUpdated = new Date(user.updatedAt).getTime();

    if (userUpdated > sessionCreated) {
      console.log(`🔐 User account was updated, requiring re-authentication: ${req.session.userEmail}`);
      req.session.destroy();
      req.flash('error_msg', 'Your account was updated. Please sign in again.');
      return res.redirect('/login');
    }

    next();
  } catch (error) {
    console.error('Error checking password change:', error);
    next();
  }
};

/**
 * Rate Limiting for Sensitive Actions
 * Prevents brute force attacks on specific endpoints
 */
const actionLimits = new Map(); // key -> { count, resetAt }

export const rateLimitSensitiveAction = (options = {}) => {
  const { 
    maxAttempts = 3, 
    windowMs = 15 * 60 * 1000, // 15 minutes
    keyFn = (req) => req.ip,
    message = 'Too many attempts. Please try again later.'
  } = options;

  return (req, res, next) => {
    const key = keyFn(req);
    const now = Date.now();
    const existing = actionLimits.get(key);

    let entry = existing;
    if (!existing || now >= existing.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
    }

    entry.count += 1;
    actionLimits.set(key, entry);

    if (entry.count > maxAttempts) {
      const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSeconds));
      
      if (req.headers['x-requested-with'] === 'XMLHttpRequest' || 
          req.headers['accept']?.includes('application/json')) {
        return res.status(429).json({ 
          success: false, 
          message, 
          retryAfterSeconds 
        });
      }
      
      req.flash('error_msg', message);
      return res.redirect('back');
    }

    next();
  };
};

/**
 * Security Headers Enhancement
 * Additional security headers for sensitive pages
 */
export const enhancedSecurityHeaders = (req, res, next) => {
  // Prevent caching of sensitive pages
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  next();
};

/**
 * Log Security Events
 * Logs important security events for audit trail
 */
export const logSecurityEvent = (event, details = {}) => {
  const timestamp = new Date().toISOString();
  console.log(`🔒 [SECURITY] ${timestamp} - ${event}`, details);
  
  // In production, you might want to send this to a security monitoring service
  // or write to a dedicated security log file
};
