/**
 * Runtime configuration for the Issue Pilot API layer.
 * Only VITE_* values are readable in the browser. Never put secrets here.
 */
const rawMock = import.meta.env["VITE_USE_MOCK_API"] as string | undefined;

/** Mock mode is ON unless VITE_USE_MOCK_API is explicitly "false". */
export const USE_MOCK_API: boolean = rawMock === undefined || rawMock === "" ? true : rawMock !== "false";

/** FastAPI base URL, e.g. https://api.issuepilot.dev (no trailing slash). */
export const API_BASE_URL: string = ((import.meta.env["VITE_API_BASE_URL"] as string | undefined) ?? "").replace(/\/+$/, "");
