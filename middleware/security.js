const writeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const securityHeaders = (req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(self), geolocation=(self), microphone=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  if (/^\/(login|register|forgot-password|admin|seller|customer|cart|wishlist|checkout|api\/customer)/.test(req.path)) {
    res.setHeader("Cache-Control", "no-store");
  }
  next();
};

export const sameOriginWriteProtection = (req, res, next) => {
  if (!writeMethods.has(req.method) || req.path.startsWith("/api/integrations/")) return next();
  const suppliedOrigin = req.get("origin");
  const suppliedReferer = req.get("referer");
  if (!suppliedOrigin && !suppliedReferer) return next();

  const expectedOrigin = `${req.protocol}://${req.get("host")}`;
  try {
    const requestOrigin = suppliedOrigin || new URL(suppliedReferer).origin;
    if (requestOrigin === expectedOrigin) return next();
  } catch {
    // Invalid Origin/Referer values are rejected below.
  }
  return res.status(403).json({ success: false, message: "Cross-site form submission was blocked." });
};

export const createFixedWindowRateLimit = ({ maximum, windowMs, message }) => {
  const clients = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = String(req.ip || req.socket?.remoteAddress || "unknown");
    const previous = clients.get(key);
    const entry = !previous || now >= previous.resetAt
      ? { count: 0, resetAt: now + windowMs }
      : previous;
    entry.count += 1;
    clients.set(key, entry);
    res.setHeader("RateLimit-Limit", String(maximum));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, maximum - entry.count)));
    res.setHeader("RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));
    if (entry.count <= maximum) return next();
    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    res.setHeader("Retry-After", String(retryAfter));
    if ((req.get("accept") || "").includes("application/json")) {
      return res.status(429).json({ success: false, message, retryAfterSeconds: retryAfter });
    }
    req.session.error_msg = message;
    return res.redirect(req.path);
  };
};
