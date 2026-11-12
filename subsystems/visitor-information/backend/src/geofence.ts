import crypto from "node:crypto";

export const DEFAULT_FEEDBACK_RADIUS_METERS = 150;
export const MAX_FEEDBACK_RADIUS_METERS = 2_000;
export const MAX_LOCATION_ACCURACY_METERS = 100;
export const LOCATION_READING_MAX_AGE_MS = 2 * 60 * 1000;
export const GEOFENCE_TOKEN_TTL_MS = 5 * 60 * 1000;

const EARTH_RADIUS_METERS = 6_371_000;

export type GeofenceTokenPayload = {
  version: 1;
  locationId: string;
  locationVersion: number;
  distanceMeters: number;
  accuracyMeters: number;
  verifiedAt: number;
  expiresAt: number;
};

const toRadians = (degrees: number) => degrees * Math.PI / 180;

export function distanceInMeters(
  first: { latitude: number; longitude: number },
  second: { latitude: number; longitude: number }
): number {
  const latitudeDelta = toRadians(second.latitude - first.latitude);
  const longitudeDelta = toRadians(second.longitude - first.longitude);
  const firstLatitude = toRadians(first.latitude);
  const secondLatitude = toRadians(second.latitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(haversine));
}

export function isFreshLocationReading(capturedAt: number, now = Date.now()): boolean {
  return capturedAt <= now + 30_000 && capturedAt >= now - LOCATION_READING_MAX_AGE_MS;
}

export function createGeofenceToken(payload: GeofenceTokenPayload, secret: string): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
}

export function verifyGeofenceToken(token: string, secret: string, now = Date.now()): GeofenceTokenPayload | null {
  const [encodedPayload, encodedSignature, extra] = token.split(".");
  if (!encodedPayload || !encodedSignature || extra) return null;

  const suppliedSignature = Buffer.from(encodedSignature, "base64url");
  const expectedSignature = crypto.createHmac("sha256", secret).update(encodedPayload).digest();
  if (suppliedSignature.length !== expectedSignature.length
    || !crypto.timingSafeEqual(suppliedSignature, expectedSignature)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Partial<GeofenceTokenPayload>;
    if (parsed.version !== 1
      || typeof parsed.locationId !== "string"
      || typeof parsed.locationVersion !== "number"
      || typeof parsed.distanceMeters !== "number"
      || typeof parsed.accuracyMeters !== "number"
      || typeof parsed.verifiedAt !== "number"
      || typeof parsed.expiresAt !== "number"
      || parsed.expiresAt <= now
      || parsed.verifiedAt > now + 30_000) return null;
    return parsed as GeofenceTokenPayload;
  } catch {
    return null;
  }
}
