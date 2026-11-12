import crypto from "node:crypto";

const LOCAL_SSO_SECRET = "cultureframe-local-sso-secret-change-before-production-2026";

export type CultureFrameCustomerIdentity = {
  id: string;
  email: string;
  name: string;
  role: "customer" | "admin";
};

export function resolveCultureFrameSsoSecret(environment: NodeJS.ProcessEnv = process.env) {
  const configured = environment.CULTUREFRAME_SSO_SECRET ?? "";
  const secret = configured || (environment.NODE_ENV === "production" ? "" : LOCAL_SSO_SECRET);
  return secret.length >= 32 ? secret : null;
}

export function verifyCultureFrameAccessToken(token: string, secret: string, now = Date.now()): CultureFrameCustomerIdentity | null {
  try {
    const [encoded, suppliedSignature, extra] = token.split(".");
    if (!encoded || !suppliedSignature || extra) return null;
    const expectedSignature = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
    const supplied = Buffer.from(suppliedSignature);
    const expected = Buffer.from(expectedSignature);
    if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return null;

    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Record<string, unknown>;
    const timestamp = Math.floor(now / 1000);
    if (payload.iss !== "cultureframe-main" || payload.aud !== "visitor-information" || !["customer", "admin"].includes(String(payload.role))) return null;
    if (typeof payload.iat !== "number" || typeof payload.exp !== "number" || payload.iat > timestamp + 30 || payload.exp <= timestamp || payload.exp - payload.iat > 180) return null;
    if (typeof payload.sub !== "string" || !payload.sub || typeof payload.email !== "string" || typeof payload.name !== "string") return null;
    const email = payload.email.trim().toLowerCase();
    const name = payload.name.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name || name.length > 160) return null;
    return { id: payload.sub, email, name, role: payload.role as "customer" | "admin" };
  } catch {
    return null;
  }
}
