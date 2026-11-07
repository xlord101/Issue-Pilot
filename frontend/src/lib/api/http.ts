import { API_BASE_URL } from "./config";
import type { Endpoint } from "./endpoints";

/** Thrown when an endpoint isn't built/configured. UI shows "Not connected yet". */
export class NotConnectedError extends Error {
  constructor(public endpointName: string) {
    super(`Endpoint "${endpointName}" is not connected yet.`);
    this.name = "NotConnectedError";
  }
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "ApiError";
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

export function getStoredAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("issue_pilot_jwt");
}

export function setStoredAuthToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem("issue_pilot_jwt", token);
  } else {
    localStorage.removeItem("issue_pilot_jwt");
  }
}

export function buildUrl(path: string, params?: Record<string, string>, query?: Query) {
  let p = path;
  for (const [k, v] of Object.entries(params ?? {})) {
    p = p.replace(`:${k}`, encodeURIComponent(v));
  }
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== "") {
      qs.set(k, String(v));
    }
  }
  const s = qs.toString();
  return `${API_BASE_URL}${p}${s ? `?${s}` : ""}`;
}

/**
 * Executes an HTTP request to the Spring Boot backend with Bearer token authentication.
 */
export async function request<T>(
  name: string,
  path: Endpoint,
  opts: {
    method?: string;
    params?: Record<string, string>;
    query?: Query;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  if (!path || !API_BASE_URL) throw new NotConnectedError(name);

  const headers: Record<string, string> = {
    ...opts.headers,
  };

  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  // Do not send Bearer token on public authentication or health check endpoints
  const isPublicEndpoint =
    path === "/api/auth/exchange" ||
    path === "/api/auth/login" ||
    path === "/api/auth/register" ||
    path === "/api/auth/github/login" ||
    path === "/api/auth/github/callback" ||
    path.startsWith("/api/health");

  const token = getStoredAuthToken();
  if (token && !headers["Authorization"] && !isPublicEndpoint) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(buildUrl(path, opts.params, opts.query), {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : null,
  });

  if (res.status === 404 || res.status === 501) throw new NotConnectedError(name);

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const j = await res.json();
      detail = typeof j?.message === "string" ? j.message : typeof j?.detail === "string" ? j.detail : detail;
    } catch {
      /* ignore */
    }

    if (res.status === 401) {
      // Clear expired or invalidated token to prevent poisoning future authentication attempts
      setStoredAuthToken(null);
    }

    throw new ApiError(detail || `Request failed (${res.status})`, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
