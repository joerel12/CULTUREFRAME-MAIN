import test from "node:test";
import assert from "node:assert/strict";
import {
  checkLoginAllowed,
  clearLoginFailures,
  LOGIN_SECURITY,
  recordLoginFailure,
  resetLoginSecurityForTests
} from "../services/loginSecurity.js";

test.beforeEach(() => resetLoginSecurityForTests());

test("locks an account after five failed sign-in attempts", () => {
  const identity = { email: "person@example.org", ip: "127.0.0.1", now: 1_000 };
  for (let attempt = 1; attempt <= LOGIN_SECURITY.accountMaxFailures; attempt += 1) {
    const result = recordLoginFailure(identity);
    assert.equal(result.attemptsRemaining, Math.max(0, LOGIN_SECURITY.accountMaxFailures - attempt));
  }
  const status = checkLoginAllowed(identity);
  assert.equal(status.allowed, false);
  assert.equal(status.retryAfterSeconds, LOGIN_SECURITY.lockMs / 1000);
});

test("clears account failures after a successful sign-in", () => {
  const identity = { email: "person@example.org", ip: "127.0.0.1", now: 2_000 };
  recordLoginFailure(identity);
  clearLoginFailures(identity);
  assert.equal(checkLoginAllowed(identity).allowed, true);
});

test("allows sign-in again after the lock expires", () => {
  const identity = { email: "person@example.org", ip: "127.0.0.2", now: 3_000 };
  for (let attempt = 0; attempt < LOGIN_SECURITY.accountMaxFailures; attempt += 1) recordLoginFailure(identity);
  const later = { ...identity, now: identity.now + LOGIN_SECURITY.lockMs + 1 };
  assert.equal(checkLoginAllowed(later).allowed, true);
});
