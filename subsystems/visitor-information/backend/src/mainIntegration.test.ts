import { afterEach, describe, expect, it, vi } from "vitest";
import { app, prisma } from "./app.js";
import type { Server } from "node:http";

// Exercise the main application's real client against the included API while
// replacing only database reads, so this contract check needs no live database.
const mainClientUrl = new URL("../../../../services/visitorInformationClient.js", import.meta.url).href;
const { visitorInformationClient } = await import(mainClientUrl);

describe("CultureFrame main / Visitor Information contract", () => {
  let server: Server | undefined;

  afterEach(async () => {
    vi.restoreAllMocks();
    if (server) {
      await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve()));
      server = undefined;
    }
  });

  it("serves published homepage, category, search, and detail records to the main client", async () => {
    const record = {
      id: "contract-record", kind: "HERITAGE", title: "Published Heritage",
      slug: "published-heritage", summary: "A published community record.",
      description: "Contract fixture", featured: true, payload: { location: "Mansalay" }
    };
    const homepage = vi.spyOn(prisma.homepageContent, "findMany").mockResolvedValue([
      { id: "hero", key: "heroTitle", value: "Connected Visitor Information", updatedAt: new Date() }
    ]);
    const records = vi.spyOn(prisma.contentRecord, "findMany").mockResolvedValue([record] as never);
    vi.spyOn(prisma.location, "findMany").mockResolvedValue([]);
    const detail = vi.spyOn(prisma.contentRecord, "findFirst").mockResolvedValue(record as never);
    vi.spyOn(prisma.contentRecord, "count").mockResolvedValue(1);
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>(resolve => server!.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing API address");
    const options = { baseUrl: `http://127.0.0.1:${address.port}` };

    const home = await visitorInformationClient.getHome(options);
    expect(home.content.heroTitle).toBe("Connected Visitor Information");
    expect(home.featured[0].url).toBe("/discover/heritage/published-heritage");
    expect(homepage).toHaveBeenCalledOnce();
    const list = await visitorInformationClient.getList("heritage", options);
    expect(list.total).toBe(1);
    expect(list.items[0].location).toBe("Mansalay");
    const search = await visitorInformationClient.search({ ...options, q: "Published", category: "heritage" });
    expect(search.items[0].slug).toBe(record.slug);
    const result = await visitorInformationClient.getDetail("heritage", record.slug, options);
    expect(result.item.title).toBe(record.title);
    for (const [query] of records.mock.calls) {
      expect(query?.where).toMatchObject({ publicationStatus: "PUBLISHED" });
    }
    expect(detail).toHaveBeenCalledWith({
      where: { slug: record.slug, kind: "HERITAGE", publicationStatus: "PUBLISHED" }
    });
  });
});
