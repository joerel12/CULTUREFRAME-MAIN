import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyCultureFrameAccessToken } from "./cultureframeSso.js";

const secret = "test-cultureframe-sso-secret-with-more-than-32-characters";
const now = 1_700_000_000_000;

function token(overrides: Record<string, unknown> = {}) {
  const timestamp = Math.floor(now / 1000);
  const payload = Buffer.from(JSON.stringify({
    iss: "cultureframe-main", aud: "visitor-information", sub: "42",
    email: "customer@example.test", name: "Mina Visitor", role: "customer",
    iat: timestamp, exp: timestamp + 120, jti: "test-id", ...overrides
  })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

describe("CultureFrame customer handoff", () => {
  it("accepts a valid short-lived customer identity", () => {
    expect(verifyCultureFrameAccessToken(token(), secret, now)).toEqual({ id: "42", email: "customer@example.test", name: "Mina Visitor", role: "customer" });
  });

  it("accepts a main administrator for the unified content workspace", () => {
    expect(verifyCultureFrameAccessToken(token({ role: "admin" }), secret, now)?.role).toBe("admin");
  });

  it("rejects expired, tampered, or wrong-audience tokens", () => {
    expect(verifyCultureFrameAccessToken(token({ exp: Math.floor(now / 1000) - 1 }), secret, now)).toBeNull();
    expect(verifyCultureFrameAccessToken(`${token()}tampered`, secret, now)).toBeNull();
    expect(verifyCultureFrameAccessToken(token({ aud: "another-system" }), secret, now)).toBeNull();
  });
});
