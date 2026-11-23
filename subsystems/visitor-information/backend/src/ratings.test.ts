import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { app, prisma } from "./app.js";

afterEach(() => vi.restoreAllMocks());

describe("public tourist rating summaries", () => {
  it("returns verified feedback averages and an explicit zero for unrated places", async () => {
    vi.spyOn(prisma.location, "findMany").mockResolvedValue([
      { id: "beach", name: "Buktot Beach" },
      { id: "trail", name: "Mt. Abenlay Eco Tour Monkey Trail" }
    ] as never);
    const groups = vi.spyOn(prisma.visitorFeedback, "groupBy").mockResolvedValue([
      { locationId: "beach", _avg: { rating: 4.5 }, _count: { _all: 2 } }
    ] as never);

    const response = await request(app).get("/api/locations");

    expect(response.status).toBe(200);
    expect(response.body.items.map((item: { ratingSummary: unknown }) => item.ratingSummary)).toEqual([
      { average: 4.5, count: 2 }, { average: 0, count: 0 }
    ]);
    expect(groups).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ locationVerifiedAt: { not: null } })
    }));
  });

  it("matches attractions to locations by explicit link or existing seeded name", async () => {
    vi.spyOn(prisma.contentRecord, "findMany").mockResolvedValue([
      { id: "one", kind: "ATTRACTION", title: "Buktot Beach", payload: {} },
      { id: "two", kind: "ATTRACTION", title: "A new coastal stop", payload: { locationId: "trail" } },
      { id: "three", kind: "ATTRACTION", title: "Unlinked place", payload: {} }
    ] as never);
    vi.spyOn(prisma.contentRecord, "count").mockResolvedValue(3);
    vi.spyOn(prisma.location, "findMany").mockResolvedValue([
      { id: "beach", name: "Buktot Beach" }, { id: "trail", name: "Mt. Abenlay Eco Tour Monkey Trail" }
    ] as never);
    vi.spyOn(prisma.visitorFeedback, "groupBy").mockResolvedValue([
      { locationId: "beach", _avg: { rating: 5 }, _count: { _all: 1 } },
      { locationId: "trail", _avg: { rating: 3.25 }, _count: { _all: 4 } }
    ] as never);

    const response = await request(app).get("/api/attractions");

    expect(response.status).toBe(200);
    expect(response.body.items.map((item: { ratingSummary: unknown }) => item.ratingSummary)).toEqual([
      { average: 5, count: 1 }, { average: 3.3, count: 4 }, { average: 0, count: 0 }
    ]);
  });
});
