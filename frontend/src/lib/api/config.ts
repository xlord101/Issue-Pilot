/**
 * Runtime configuration for the Issue Pilot API layer.
 * Only VITE_* values are readable in the browser. Never put secrets here.
 */
const rawMock = import.meta.env["VITE_USE_MOCK_API"] as string | undefined;

/**
 * If explicitly set to "true", runs in offline fixture mode.
 * Otherwise, attempts live backend communication at API_BASE_URL with seamless fallback.
 */
export const USE_MOCK_API: boolean = rawMock === "true";

/** Spring Boot base URL (defaults to local port 8000, no trailing slash). */
export const API_BASE_URL: string = (
  (import.meta.env["VITE_API_BASE_URL"] as string | undefined) || "http://localhost:8000"
).replace(/\/+$/, "");
