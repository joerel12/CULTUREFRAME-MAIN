import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { app, prisma } from "./app.js";

const now = new Date();
const location = {
  id: "mansalay-site-1",
  name: "Verified Mansalay Site",
  category: "Sightseeing",
  address: "Mansalay, Oriental Mindoro",
  description: "A verified test location.",
  sourceUrl: null,
  latitude: 12.5201,
  longitude: 121.4381,
  verified: true,
  feedbackRadiusMeters: 150,
  createdAt: now,
  updatedAt: now
};

describe("GPS-gated visitor feedback routes", () => {
  afterEach(() => vi.restoreAllMocks());

  it("issues a signed verification only when the reading is inside the site radius", async () => {
    vi.spyOn(prisma.location, "findUnique").mockResolvedValue(location);
    const response = await request(app).post("/api/visitor/location-verification").send({
      locationId: location.id,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracyMeters: 12,
      capturedAt: Date.now()
    });
    expect(response.status).toBe(200);
    expect(response.body.allowed).toBe(true);
    expect(response.body.verificationToken).toEqual(expect.any(String));
    expect(response.body.distanceMeters).toBe(0);
  });

  it("does not issue a verification when the visitor is outside the site radius", async () => {
    vi.spyOn(prisma.location, "findUnique").mockResolvedValue(location);
    const response = await request(app).post("/api/visitor/location-verification").send({
      locationId: location.id,
      latitude: location.latitude + 0.01,
      longitude: location.longitude,
      accuracyMeters: 12,
      capturedAt: Date.now()
    });
    expect(response.status).toBe(200);
    expect(response.body.allowed).toBe(false);
    expect(response.body.reason).toBe("OUTSIDE_GEOFENCE");
    expect(response.body.verificationToken).toBeUndefined();
  });

  it("stores verification evidence without storing the visitor's exact coordinates", async () => {
    vi.spyOn(prisma.location, "findUnique").mockResolvedValue(location);
    const verification = await request(app).post("/api/visitor/location-verification").send({
      locationId: location.id,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracyMeters: 18,
      capturedAt: Date.now()
    });
    const create = vi.spyOn(prisma.visitorFeedback, "create").mockResolvedValue({
      id: "feedback-1",
      userId: null,
      category: "On-site visit",
      subject: "A real site visit",
      rating: 5,
      message: "The place was meaningful and well maintained.",
      relatedHeritageId: null,
      locationId: location.id,
      geofenceDistanceMeters: 0,
      geofenceAccuracyMeters: 18,
      locationVerifiedAt: new Date(),
      status: "NEW",
      createdAt: new Date()
    });
    const response = await request(app).post("/api/visitor/feedback").send({
      category: "On-site visit",
      subject: "A real site visit",
      rating: 5,
      message: "The place was meaningful and well maintained.",
      locationId: location.id,
      verificationToken: verification.body.verificationToken
    });
    expect(response.status).toBe(201);
    const storedData = create.mock.calls[0][0].data;
    expect(storedData).toMatchObject({
      locationId: location.id,
      geofenceDistanceMeters: 0,
      geofenceAccuracyMeters: 18
    });
    expect(storedData).not.toHaveProperty("latitude");
    expect(storedData).not.toHaveProperty("longitude");
  });
});
