import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "./api";

describe("API client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("includes cookies and surfaces server validation errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: "Please correct the form." })
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(api("/auth/register", { method: "POST", body: JSON.stringify({}) }))
      .rejects.toMatchObject({ name: "ApiError", message: "Please correct the form.", status: 400 } satisfies Partial<ApiError>);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/auth/register"),
      expect.objectContaining({ credentials: "include" })
    );
  });
});
