import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { app, prisma } from "./app.js";

describe("visitor homepage destinations", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns only the GPS-ready destinations selected by the homepage query", async () => {
    vi.spyOn(prisma.homepageContent, "findMany").mockResolvedValue([]);
    vi.spyOn(prisma.contentRecord, "findMany").mockResolvedValue([]);
    const destinations = vi.spyOn(prisma.location, "findMany").mockResolvedValue([{
      id: "destination-1",
      name: "Casabangan Beach and Marine Protected Area",
      category: "Beach & Marine Sanctuary",
      address: "Barangay Don Pedro, Mansalay, Oriental Mindoro",
      description: "A protected coastal destination.",
      sourceUrl: "https://www.travelorientalmindoro.ph/place/casabangan-beach-marine-protected-areas",
      latitude: 12.50516334,
      longitude: 121.3207688,
      verified: true,
      feedbackRadiusMeters: 200,
      createdAt: new Date(),
      updatedAt: new Date()
    }]);

    const response = await request(app).get("/api/home");

    expect(response.status).toBe(200);
    expect(response.body.destinations[0]).toMatchObject({
      id: "destination-1",
      name: "Casabangan Beach and Marine Protected Area",
      category: "Beach & Marine Sanctuary",
      verified: true
    });
    expect(destinations).toHaveBeenCalledWith(expect.objectContaining({
      where: { verified: true, latitude: { not: null }, longitude: { not: null } },
      take: 6
    }));
  });
});
