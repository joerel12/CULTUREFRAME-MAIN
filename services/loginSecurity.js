export const LOGIN_SECURITY = Object.freeze({
  accountMaxFailures: 5,
  ipMaxFailures: 20,
  windowMs: 15 * 60 * 1000, // 15 minutes tracking window
  lockMs: 15 * 60 * 1000,    // 15 minutes lock duration
  maxSessionAge: 8 * 60 * 60 * 1000, // 8 hours default session
  sessionIdleTimeout: 30 * 60 * 1000 // 30 minutes idle timeout
});

const accountFailures = new Map();
const ipFailures = new Map();

const normalizedEmail = email => String(email || "").trim().toLowerCase();
const normalizedIp = ip => String(ip || "unknown").trim() || "unknown";

const activeEntry = (store, key, now) => {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.lockedUntil > now) return entry;
  if (now - entry.firstFailureAt >= LOGIN_SECURITY.windowMs) {
    store.delete(key);
    return null;
  }
  return entry;
};

const recordFailure = (store, key, maximum, now) => {
  const existing = activeEntry(store, key, now);
  const entry = existing || { failures: 0, firstFailureAt: now, lockedUntil: 0 };
  entry.failures += 1;
  if (entry.failures >= maximum) entry.lockedUntil = now + LOGIN_SECURITY.lockMs;
  store.set(key, entry);
  return entry;
};

const retryAfterSeconds = (entry, now) => Math.max(1, Math.ceil((entry.lockedUntil - now) / 1000));

export const checkLoginAllowed = ({ email, ip, now = Date.now() }) => {
  const accountKey = normalizedEmail(email);
  const account = accountKey ? activeEntry(accountFailures, accountKey, now) : null;
  const network = activeEntry(ipFailures, normalizedIp(ip), now);
  const locked = [account, network].filter(entry => entry?.lockedUntil > now);
  if (!locked.length) return { allowed: true, attemptsRemaining: LOGIN_SECURITY.accountMaxFailures };
  return {
    allowed: false,
    attemptsRemaining: 0,
    retryAfterSeconds: Math.max(...locked.map(entry => retryAfterSeconds(entry, now)))
  };
};

export const recordLoginFailure = ({ email, ip, now = Date.now() }) => {
  const accountKey = normalizedEmail(email);
  const account = accountKey
    ? recordFailure(accountFailures, accountKey, LOGIN_SECURITY.accountMaxFailures, now)
    : null;
  const network = recordFailure(ipFailures, normalizedIp(ip), LOGIN_SECURITY.ipMaxFailures, now);
  const lockedEntries = [account, network].filter(entry => entry?.lockedUntil > now);
  return {
    locked: lockedEntries.length > 0,
    attemptsRemaining: account ? Math.max(0, LOGIN_SECURITY.accountMaxFailures - account.failures) : 0,
    retryAfterSeconds: lockedEntries.length
      ? Math.max(...lockedEntries.map(entry => retryAfterSeconds(entry, now)))
      : 0
  };
};

export const clearLoginFailures = ({ email, ip }) => {
  const accountKey = normalizedEmail(email);
  if (accountKey) accountFailures.delete(accountKey);
  if (ip) ipFailures.delete(normalizedIp(ip));
};

export const resetLoginSecurityForTests = () => {
  accountFailures.clear();
  ipFailures.clear();
};
