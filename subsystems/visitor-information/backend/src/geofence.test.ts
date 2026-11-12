import { describe, expect, it } from "vitest";
import {
  createGeofenceToken,
  distanceInMeters,
  isFreshLocationReading,
  verifyGeofenceToken
} from "./geofence.js";

const secret = "test-geofence-secret-with-at-least-32-characters";

describe("visitor feedback geofencing", () => {
  it("calculates zero distance for the same GPS point", () => {
    expect(distanceInMeters(
      { latitude: 12.5201, longitude: 121.4381 },
      { latitude: 12.5201, longitude: 121.4381 }
    )).toBe(0);
  });

  it("calculates realistic short distances", () => {
    const distance = distanceInMeters(
      { latitude: 12.5201, longitude: 121.4381 },
      { latitude: 12.5210, longitude: 121.4381 }
    );
    expect(distance).toBeGreaterThan(95);
    expect(distance).toBeLessThan(105);
  });

  it("rejects stale GPS readings", () => {
    const now = 1_800_000_000_000;
    expect(isFreshLocationReading(now - 30_000, now)).toBe(true);
    expect(isFreshLocationReading(now - 3 * 60_000, now)).toBe(false);
  });

  it("accepts signed tokens and rejects tampered or expired tokens", () => {
    const now = 1_800_000_000_000;
    const token = createGeofenceToken({
      version: 1,
      locationId: "site-1",
      locationVersion: now - 1_000,
      distanceMeters: 24,
      accuracyMeters: 12,
      verifiedAt: now,
      expiresAt: now + 5 * 60_000
    }, secret);
    expect(verifyGeofenceToken(token, secret, now)?.locationId).toBe("site-1");
    expect(verifyGeofenceToken(`${token}x`, secret, now)).toBeNull();
    expect(verifyGeofenceToken(token, secret, now + 6 * 60_000)).toBeNull();
  });
});
