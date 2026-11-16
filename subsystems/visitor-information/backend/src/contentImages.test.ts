import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { UserRole } from "@prisma/client";
import { app, prisma } from "./app.js";

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==", "base64");

function mockAdminSession() {
  vi.spyOn(prisma.authSession, "findUnique").mockResolvedValue({
    id: "admin-session", expiresAt: new Date(Date.now() + 60_000),
    user: { id: "admin-1", email: "admin@example.test", firstName: "Admin", lastName: "User", role: UserRole.ADMIN, status: "ACTIVE" }
  } as never);
}

function mockTransaction() {
  const transaction = {
    storedUpload: { create: vi.fn(async () => ({})) },
    mediaAsset: { create: vi.fn(async () => ({})) },
    contentRecord: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: "record-1", ...data })),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: "record-1", ...data }))
    },
    auditLog: { create: vi.fn(async () => ({})) }
  };
  const transactionSpy = vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => callback(transaction) as any);
  return { transaction, transactionSpy };
}

afterEach(() => vi.restoreAllMocks());

describe("content cover images", () => {
  it("saves an approved upload and its content record together", async () => {
    mockAdminSession();
    const { transaction } = mockTransaction();
    const response = await request(app).post("/api/admin/content")
      .set("Cookie", "cultureframe_session=test-token")
      .field("kind", "HERITAGE").field("title", "New heritage story").field("slug", "new-heritage-story")
      .field("publicationStatus", "PUBLISHED")
      .field("imageAltText", "A cultural heritage display").field("imageCredit", "Community archive")
      .field("imagePermissionConfirmed", "on")
      .attach("image", png, { filename: "heritage.png", contentType: "image/png" });

    expect(response.status).toBe(201);
    expect(response.body.item.payload.imageUrl).toMatch(/^\/uploads\/[0-9a-f-]{36}\.png$/);
    expect(response.body.item.payload.imageAlt).toBe("A cultural heritage display");
    expect(transaction.storedUpload.create).toHaveBeenCalledOnce();
    expect(transaction.mediaAsset.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ permissionStatus: "APPROVED", caption: "Content record cover", altText: "A cultural heritage display" }) }));
    expect(transaction.contentRecord.create).toHaveBeenCalledOnce();
  });

  it("rejects an upload without publication permission", async () => {
    mockAdminSession();
    const { transactionSpy } = mockTransaction();
    const response = await request(app).post("/api/admin/content")
      .set("Cookie", "cultureframe_session=test-token")
      .field("kind", "EVENT").field("title", "Community event").field("slug", "community-event")
      .field("imageAltText", "People at a community event")
      .attach("image", png, { filename: "event.png", contentType: "image/png" });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/confirm/i);
    expect(transactionSpy).not.toHaveBeenCalled();
  });

  it("rejects a file whose contents are not an image", async () => {
    mockAdminSession();
    const { transactionSpy } = mockTransaction();
    const response = await request(app).post("/api/admin/content")
      .set("Cookie", "cultureframe_session=test-token")
      .field("kind", "TRADITION").field("title", "Community practice").field("slug", "community-practice")
      .field("imageAltText", "A community practice").field("imagePermissionConfirmed", "on")
      .attach("image", Buffer.from("not a PNG"), { filename: "fake.png", contentType: "image/png" });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/valid JPG, PNG, or WebP/i);
    expect(transactionSpy).not.toHaveBeenCalled();
  });

  it("replaces a cover without removing other record details", async () => {
    mockAdminSession();
    vi.spyOn(prisma.contentRecord, "findUnique").mockResolvedValue({
      id: "record-1", payload: { location: "Mansalay", imageUrl: "/uploads/old-image.png" }
    } as never);
    const { transaction } = mockTransaction();
    const response = await request(app).patch("/api/admin/content/record-1")
      .set("Cookie", "cultureframe_session=test-token")
      .field("title", "Updated festival").field("imageAltText", "Festival performers")
      .field("imagePermissionConfirmed", "on")
      .attach("image", png, { filename: "festival.png", contentType: "image/png" });

    expect(response.status).toBe(200);
    expect(response.body.item.payload.location).toBe("Mansalay");
    expect(response.body.item.payload.imageUrl).toMatch(/^\/uploads\/[0-9a-f-]{36}\.png$/);
    expect(transaction.contentRecord.update).toHaveBeenCalledOnce();
  });

  it("shows content cover images in the gallery only after publication", async () => {
    vi.spyOn(prisma.mediaAsset, "findMany").mockResolvedValue([
      { id: "standalone", caption: "Community photo", filePath: "/uploads/standalone.png" },
      { id: "published", caption: "Content record cover", filePath: "/uploads/published.png" },
      { id: "draft", caption: "Content record cover", filePath: "/uploads/draft.png" }
    ] as never);
    vi.spyOn(prisma.contentRecord, "findMany").mockResolvedValue([
      { payload: { imageUrl: "/uploads/published.png" } }
    ] as never);

    const response = await request(app).get("/api/gallery");
    expect(response.status).toBe(200);
    expect(response.body.items.map((item: { id: string }) => item.id)).toEqual(["standalone", "published"]);
  });
});
