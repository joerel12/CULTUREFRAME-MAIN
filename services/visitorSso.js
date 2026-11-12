import crypto from "node:crypto";

const LOCAL_SSO_SECRET = "cultureframe-local-sso-secret-change-before-production-2026";

export function resolveVisitorSsoSecret(environment = process.env) {
  const configured = environment.CULTUREFRAME_SSO_SECRET || "";
  const secret = configured || (environment.NODE_ENV === "production" ? "" : LOCAL_SSO_SECRET);
  if (secret.length < 32) {
    throw new Error("CULTUREFRAME_SSO_SECRET must contain at least 32 characters.");
  }
  return secret;
}

export function safeVisitorReturnPath(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  try {
    const url = new URL(value, "http://cultureframe.local");
    if (url.origin !== "http://cultureframe.local") return "/";
    return `${url.pathname}${url.search}${url.hash}`.slice(0, 1000);
  } catch {
    return "/";
  }
}

function createAccessToken(user, audience, options = {}) {
  if (!user?.id || !user?.email || !user?.name) throw new Error("A complete CultureFrame identity is required.");
  const role = user.role === "admin" ? "admin" : "customer";
  const now = Math.floor((options.now ?? Date.now()) / 1000);
  const payload = {
    iss: "cultureframe-main",
    aud: audience,
    sub: String(user.id),
    email: String(user.email).trim().toLowerCase(),
    name: String(user.name).trim(),
    role,
    iat: now,
    exp: now + 120,
    jti: crypto.randomUUID()
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", options.secret ?? resolveVisitorSsoSecret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function createVisitorAccessToken(user, options = {}) {
  return createAccessToken(user, "visitor-information", options);
}

export function createCultureMetricsAccessToken(user, options = {}) {
  if (user?.role !== "admin") throw new Error("CultureMetrics access requires a CultureFrame administrator.");
  return createAccessToken(user, "culturemetrics", options);
}

export function createVisitorConnectUrl(baseUrl, token, returnTo = "/") {
  const destination = new URL("/account/connect", baseUrl);
  destination.searchParams.set("token", token);
  destination.searchParams.set("returnTo", safeVisitorReturnPath(returnTo));
  return destination.toString();
}

export function createCultureMetricsConnectUrl(baseUrl, token, returnTo = "/dashboard") {
  const destination = new URL("/account/connect", baseUrl);
  destination.searchParams.set("token", token);
  destination.searchParams.set("returnTo", safeVisitorReturnPath(returnTo));
  return destination.toString();
}
