import { describe, expect, it } from "vitest";
import { app } from "./app.js";
import request from "supertest";

describe("API validation and access control", () => {
  it("does not provide public visitor registration", async () => {
    const response = await request(app).post("/api/auth/register").send({ email: "visitor@example.org" });
    expect(response.status).toBe(404);
  });

  it("protects administrator endpoints", async () => {
    const response = await request(app).get("/api/admin/dashboard");
    expect(response.status).toBe(401);
  });

  it("protects the administrator media library route", async () => {
    const response = await request(app).get("/api/admin/media");
    expect(response.status).toBe(401);
  });

  it("does not rate-limit session checks with the login action limiter", async () => {
    const responses = await Promise.all(
      Array.from({ length: 31 }, () => request(app).get("/api/auth/me"))
    );
    expect(responses.every((response) => response.status === 401)).toBe(true);
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

  it("validates public feedback before requiring database access", async () => {
    const response = await request(app).post("/api/visitor/feedback").send({ rating: 9 });
    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/feedback form/i);
  });
});
