/**
 * Runtime configuration for the Issue Pilot API layer.
 * Only VITE_* values are readable in the browser. Never put secrets here.
 */

/** Spring Boot base URL (defaults to local port 8000, no trailing slash). */
export const API_BASE_URL: string = (
  (import.meta.env["VITE_API_BASE_URL"] as string | undefined) || "http://localhost:8000"
).replace(/\/+$/, "");
