/**
 * Issue Pilot API layer — the ONLY module components import for data.
 * Switches between mock fixtures and the live FastAPI backend via VITE_USE_MOCK_API.
 */
import { USE_MOCK_API } from "./config";
import type { AdminSection } from "./endpoints";
import type * as T from "./types";
import { mockApi } from "./mock";
import { liveApi } from "./live";

export interface IssuePilotApi {
  auth: {
    getSession(): Promise<T.Session | null>;
    startSignIn(): Promise<void>;
    completeCallback(search: {
      status?: string | undefined;
      error?: string | undefined;
      exchange_code?: string | undefined;
    }): Promise<T.Session>;
    signOut(): Promise<void>;
  };
  onboarding: {
    status(): Promise<T.ExtractionStatus>;
    retry(): Promise<T.ExtractionStatus>;
    submitStarterProfile(input: T.StarterProfile): Promise<T.ExtractionStatus>;
  };
  recommendations: {
    list(q: T.RecommendationQuery): Promise<T.Page<T.Recommendation>>;
    get(id: string): Promise<T.Recommendation>;
  };
  feedback: {
    list(): Promise<T.FeedbackEntry[]>;
    submit(recommendationId: string, decision: T.FeedbackDecision): Promise<T.FeedbackEntry>;
  };
  portfolio: { list(): Promise<T.PortfolioItem[]> };
  profile: { me(): Promise<T.TechProfile> };
  notifications: { status(): Promise<T.NotificationChannel[]> };
  maintainer: {
    repos(): Promise<T.MaintainedRepo[]>;
    registerRepo(source: T.Source, repoKey: string): Promise<{ repo: T.MaintainedRepo; upgraded_existing: boolean }>;
    triage(): Promise<T.TriageSuggestion[]>;
    decide(id: string, decision: "approved" | "rejected"): Promise<T.TriageSuggestion>;
    history(): Promise<{ decisions: T.TriageSuggestion[]; audit: T.AuditEntry[] }>;
  };
  admin: { fetch(section: AdminSection): Promise<unknown> };
}

export const api: IssuePilotApi = USE_MOCK_API ? mockApi : liveApi;
export { USE_MOCK_API } from "./config";
export { NotConnectedError, ApiError } from "./http";
export type * from "./types";
export { SOURCES, SIGNAL_META, SIGNAL_ORDER } from "./types";
