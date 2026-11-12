/**
 * Issue Pilot API layer — the ONLY module components import for data.
 * Communicates directly with the live Spring Boot backend.
 */
import type * as T from "./types";
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
    register(payload: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
    }): Promise<T.OtpChallenge>;
    verifyOtp(payload: { email: string; otp: string }): Promise<T.Session>;
    resendOtp(payload: { email: string }): Promise<T.OtpChallenge>;
    signInWithPassword(payload: { email: string; password: string }): Promise<T.Session>;
    forgotPassword(payload: {
      email: string;
    }): Promise<{ message: string; expires_in_seconds?: number; resend_cooldown_seconds?: number }>;
    resetPassword(payload: {
      email: string;
      otp: string;
      newPassword: string;
    }): Promise<{ message: string }>;
    signOut(): Promise<void>;
  };
  onboarding: {
    status(): Promise<T.ExtractionStatus>;
    retry(): Promise<T.ExtractionStatus>;
    analyze(): Promise<T.GitHubAnalysisResult>;
    submitStarterProfile(input: T.StarterProfile): Promise<T.ExtractionStatus>;
    confirmCalibration(input: {
      confirmed_skills: { technology: string; score: number; level: string; category?: string }[];
      dismissed_skills: string[];
      capability: number;
      capability_confidence: number;
      open_source_experience: string;
      codebase_navigation_comfort: string;
      target_challenge_goal: string;
    }): Promise<unknown>;
  };
  recommendations: {
    list(q: T.RecommendationQuery): Promise<T.Page<T.Recommendation>>;
    get(id: string): Promise<T.Recommendation>;
  };
  feedback: {
    list(): Promise<T.FeedbackEntry[]>;
    submit(
      recommendationId: string,
      decision: T.FeedbackDecision,
      reason?: string,
    ): Promise<T.FeedbackEntry>;
  };
  votes: {
    record(payload: {
      source: T.Source;
      platform_issue_id: string;
      vote: 1 | -1;
      reason?: string;
      recommendation_run_id?: string;
    }): Promise<unknown>;
    remove(payload: { source: T.Source; platform_issue_id: string }): Promise<unknown>;
  };
  profile: { me(): Promise<T.TechProfile> };
}

export const api: IssuePilotApi = liveApi;
export { NotConnectedError, ApiError } from "./http";
export type * from "./types";
export { SOURCES, SIGNAL_META, SIGNAL_ORDER } from "./types";
