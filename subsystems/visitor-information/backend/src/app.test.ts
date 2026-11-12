import { describe, expect, it } from "vitest";
import { app } from "./app.js";
import request from "supertest";

describe("API validation and access control", () => {
  it("does not provide public visitor registration", async () => {
    const response = await request(app).post("/api/auth/register").send({ email: "visitor@example.org" });
    expect(response.status).toBe(404);
  });

  it("rejects an invalid main-account handoff before querying customer data", async () => {
    const response = await request(app).post("/api/integrations/cultureframe/session").send({ token: "invalid-cultureframe-account-token" });
    expect(response.status).toBe(401);
    expect(response.body.error).toMatch(/invalid or expired/i);
  });

  it("protects administrator endpoints", async () => {
    const response = await request(app).get("/api/admin/dashboard");
    expect(response.status).toBe(401);
  });

  it("protects the administrator media library route", async () => {
    const response = await request(app).get("/api/admin/media");
    expect(response.status).toBe(401);
  });

  it("returns a normal anonymous session response without rate limiting public visitors", async () => {
    const responses = await Promise.all(
      Array.from({ length: 31 }, () => request(app).get("/api/auth/me"))
    );
    expect(responses.every((response) => response.status === 200)).toBe(true);
    expect(responses.every((response) => response.body.user === null)).toBe(true);
  });

  it("provides an API liveness check without requiring the database", async () => {
    const response = await request(app).get("/api/health/live");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("rejects malformed login input without querying the database", async () => {
    const response = await request(app).post("/api/auth/login").send({ email: "bad", password: "" });
    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/valid email/i);
  });

  it("requires authentication before validating visitor feedback", async () => {
    const response = await request(app).post("/api/visitor/feedback").send({ rating: 9 });
    expect(response.status).toBe(401);
    expect(response.body.error).toMatch(/authentication required/i);
  });

  it("requires authentication before validating a GPS reading", async () => {
    const response = await request(app).post("/api/visitor/location-verification").send({
      locationId: "site-1",
      latitude: "not-a-coordinate"
    });
    expect(response.status).toBe(401);
    expect(response.body.error).toMatch(/authentication required/i);
  });

  it("requires authentication before reading or changing saved destinations", async () => {
    const list = await request(app).get("/api/visitor/saved-locations");
    const save = await request(app).post("/api/visitor/saved-locations/site-1");
    const remove = await request(app).delete("/api/visitor/saved-locations/site-1");
    expect([list.status, save.status, remove.status]).toEqual([401, 401, 401]);
  });

  it("requires the shared main customer account before accepting feedback", async () => {
    const response = await request(app).post("/api/visitor/feedback").send({
      category: "On-site visit",
      subject: "Heritage visit",
      rating: 5,
      message: "A meaningful visit to this cultural location.",
      locationId: "site-1",
      verificationToken: "not-a-valid-geofence-token"
    });
    expect(response.status).toBe(401);
    expect(response.body.error).toMatch(/authentication required/i);
  });
});
