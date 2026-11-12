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
  constructor(
    message: string,
    public status: number,
    public endpoint?: string,
    public method?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get statusText(): string {
    switch (this.status) {
      case 0:
        return "CONNECTION REFUSED / BACKEND OFFLINE";
      case 400:
        return "400 BAD REQUEST";
      case 401:
        return "401 UNAUTHORIZED";
      case 403:
        return "403 FORBIDDEN";
      case 404:
        return "404 NOT FOUND";
      case 409:
        return "409 CONFLICT";
      case 422:
        return "422 UNPROCESSABLE ENTITY";
      case 429:
        return "429 RATE LIMIT EXCEEDED";
      case 500:
        return "500 INTERNAL SERVER ERROR";
      case 502:
        return "502 BAD GATEWAY";
      case 503:
        return "503 SERVICE UNAVAILABLE";
      case 504:
        return "504 GATEWAY TIMEOUT";
      default:
        return `HTTP ${this.status}`;
    }
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
  } = {},
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
    path === "/api/auth/verify-otp" ||
    path === "/api/auth/resend-otp" ||
    path === "/api/auth/forgot-password" ||
    path === "/api/auth/reset-password" ||
    path === "/api/auth/github/login" ||
    path === "/api/auth/github/callback" ||
    path.startsWith("/api/health");

  const token = getStoredAuthToken();
  if (token && !headers["Authorization"] && !isPublicEndpoint) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const method = opts.method ?? "GET";
  const url = buildUrl(path, opts.params, opts.query);
  let res: Response;

  try {
    res = await fetch(url, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : null,
    });
  } catch (err: any) {
    // Network error: Spring Boot backend is down, connection refused, or DNS failure
    throw new ApiError(
      `Cannot connect to backend server at ${API_BASE_URL}. Ensure the Spring Boot backend is running on port 8000. (${err?.message || "Failed to fetch"})`,
      0,
      path,
      method,
    );
  }

  if (res.status === 404 || res.status === 501) throw new NotConnectedError(name);

  if (!res.ok) {
    let detail = res.statusText;
    let payload: any = null;
    try {
      payload = await res.json();
      detail =
        typeof payload?.message === "string"
          ? payload.message
          : typeof payload?.detail === "string"
            ? payload.detail
            : detail;
    } catch {
      /* ignore non-JSON error response */
    }

    if (res.status === 401) {
      // Clear expired or invalidated token to prevent poisoning future authentication attempts
      setStoredAuthToken(null);
    }

    throw new ApiError(
      detail || `Request failed (${res.status})`,
      res.status,
      path,
      method,
      payload,
    );
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
