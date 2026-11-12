import test from "node:test";
import assert from "node:assert/strict";
import {
  createCultureMetricsAccessToken,
  createVisitorAccessToken,
  createVisitorConnectUrl,
  safeVisitorReturnPath
} from "../services/visitorSso.js";

const secret = "test-cultureframe-sso-secret-with-more-than-32-characters";

test("creates a short-lived visitor handoff for the main customer identity", () => {
  const token = createVisitorAccessToken({ id: 42, email: "Customer@Example.test", name: "Mina Visitor" }, { secret, now: 1_700_000_000_000 });
  const [encoded, signature] = token.split(".");
  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  assert.ok(signature);
  assert.equal(payload.iss, "cultureframe-main");
  assert.equal(payload.aud, "visitor-information");
  assert.equal(payload.sub, "42");
  assert.equal(payload.email, "customer@example.test");
  assert.equal(payload.role, "customer");
  assert.equal(payload.exp - payload.iat, 120);
});

test("creates an administrator handoff for visitor content management", () => {
  const token = createVisitorAccessToken({ id: 1, email: "admin@example.test", name: "Main Admin", role: "admin" }, { secret, now: 1_700_000_000_000 });
  const payload = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString("utf8"));
  assert.equal(payload.role, "admin");
  assert.equal(payload.aud, "visitor-information");
});

test("creates an administrator-only CultureMetrics handoff", () => {
  const token = createCultureMetricsAccessToken({ id: 1, email: "admin@example.test", name: "Main Admin", role: "admin" }, { secret, now: 1_700_000_000_000 });
  const [encoded] = token.split(".");
  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  assert.equal(payload.aud, "culturemetrics");
  assert.equal(payload.role, "admin");
  assert.throws(() => createCultureMetricsAccessToken({ id: 2, email: "customer@example.test", name: "Customer", role: "customer" }, { secret }));
});

test("keeps visitor return paths local to the visitor application", () => {
  assert.equal(safeVisitorReturnPath("/visitor/feedback?location=site-1"), "/visitor/feedback?location=site-1");
  assert.equal(safeVisitorReturnPath("//malicious.example/path"), "/");
  assert.equal(safeVisitorReturnPath("https://malicious.example/path"), "/");
  const url = new URL(createVisitorConnectUrl("http://localhost:5173", "signed-token", "/locations"));
  assert.equal(url.origin, "http://localhost:5173");
  assert.equal(url.pathname, "/account/connect");
  assert.equal(url.searchParams.get("returnTo"), "/locations");
});
