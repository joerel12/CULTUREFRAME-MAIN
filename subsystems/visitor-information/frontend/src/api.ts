const API_URL = import.meta.env.VITE_API_URL ?? "/api";
const API_BASE = new URL(API_URL, window.location.origin);

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

export function apiAssetUrl(path: string): string {
  return new URL(path, API_BASE).toString();
}

function apiPath(path: string): string {
  return `${API_URL.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(apiPath(path), { ...init, headers, credentials: "include" });
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(body.error ?? `Request failed (${response.status}).`, response.status);
  return body as T;
}
