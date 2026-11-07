/**
 * Data contracts mirroring the FastAPI backend. Every field that the backend may omit
 * is typed nullable — UI code must handle null explicitly.
 */

export type Source = "github" | "gitlab" | "gitea" | "bugzilla";
export const SOURCES: Source[] = ["github", "gitlab", "gitea", "bugzilla"];

export type SignalKey = "skill_match" | "difficulty_match" | "responsiveness" | "repo_health" | "feedback" | "freshness";

/**
 * Display metadata only (final SRS model). Each signal is normalised to 0–100 by the backend and
 * Score(u,i) = 0.35S + 0.25D + 0.15R + 0.10H + 0.10F + 0.05N. The UI never computes scores.
 */
export const SIGNAL_META: Record<SignalKey, { label: string; weight: number; description: string }> = {
  skill_match: { label: "Skill Match", weight: 0.35, description: "Overlap between the issue's technologies and your demonstrated (or starter) skills." },
  difficulty_match: { label: "Difficulty Match", weight: 0.25, description: "Difficulty is evaluated relative to repository evidence and contributor capability." },
  responsiveness: { label: "Responsiveness", weight: 0.15, description: "How quickly maintainers of this repository respond to issues and pull requests." },
  repo_health: { label: "Repo Health", weight: 0.1, description: "Recent commits, CI status, contributing docs and release activity." },
  feedback: { label: "Feedback", weight: 0.1, description: "Adjusted from your past accept / reject / complete decisions." },
  freshness: { label: "Freshness", weight: 0.05, description: "Recent activity on the issue itself." },
};
export const SIGNAL_ORDER: SignalKey[] = ["skill_match", "difficulty_match", "responsiveness", "repo_health", "feedback", "freshness"];

export interface Evidence {
  signal: SignalKey | null;
  description: string;
  url: string | null;
}

/** Mirrors backend NormalizedIssue. */
export interface NormalizedIssue {
  source: Source;
  native_id: string;
  title: string;
  body: string | null;
  /** Real issue URL on the source platform. */
  url: string;
  repo_key: string;
  is_open: boolean | null;
  is_unassigned: boolean | null;
  /**
   * null  → source has NO label concept (e.g. Bugzilla).
   * []    → labels exist on this source, none are set.
   * Never coerce one into the other.
   */
  labels: string[] | null;
  evidence: Evidence[] | null;
  technologies: string[] | null;
  verified_at: string | null;
}

export interface SignalScore {
  signal: SignalKey;
  /** Normalised 0–100. */
  score: number | null;
  /** Always 100 in the final model. */
  max: number;
  /** Confidence (0–1) for this (source, signal) pair; null if unknown. */
  confidence: number | null;
  summary: string | null;
}

export type FeedbackDecision = "accepted" | "rejected" | "completed";

export interface Recommendation {
  id: string;
  issue: NormalizedIssue;
  total_score: number | null;
  breakdown: SignalScore[] | null;
  why: string | null;
  created_at: string | null;
  decision: FeedbackDecision | null;
  /** Demo personalization only: score before the latest feedback adjustment. */
  previous_score?: number | null;
}

export interface Page<T> {
  items: T[];
  next_cursor: string | null;
  total: number | null;
}

export type SortKey = "score_desc" | "freshness_desc" | "verified_desc";

export interface RecommendationQuery {
  source?: Source | undefined;
  tech?: string | undefined;
  min_score?: number | undefined;
  max_score?: number | undefined;
  sort?: SortKey | undefined;
  cursor?: string | null | undefined;
  limit?: number | undefined;
}

export type Role = "contributor" | "maintainer" | "admin";

export interface Session {
  user: { id: string; login: string; name: string | null; avatar_url: string | null };
  roles: Role[];
  is_demo: boolean;
}

export type ExtractionState = "queued" | "running" | "ready" | "failed";

export interface ExtractionStatus {
  state: ExtractionState;
  progress: number | null;
  steps: { key: string; label: string; done: boolean }[];
  error: string | null;
  updated_at: string | null;
  /** Whether public GitHub history had enough evidence. "insufficient" → starter questionnaire. */
  evidence: "sufficient" | "insufficient" | null;
  /** Set once the starter questionnaire has been submitted. */
  starter_profile: StarterProfile | null;
}

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

/** Questionnaire fallback for accounts with insufficient GitHub evidence. */
export interface StarterProfile {
  languages: string[];
  technologies: string[];
  experience: ExperienceLevel;
  interests: string[];
  contribution_areas: string[];
  resume_filename: string | null;
}

export interface TechSkill {
  name: string;
  kind: "language" | "framework" | "tool" | "domain";
  strength: number | null;
  evidence_count: number | null;
}

export interface TechProfile {
  login: string;
  skills: TechSkill[];
  capability?: number | null;
  capability_confidence?: number | null;
  repos_analyzed: number | null;
  contributions_analyzed: number | null;
  extraction: ExtractionStatus;
  extracted_at: string | null;
  profile_source: "github" | "questionnaire" | null;
  starter: StarterProfile | null;
}

export interface FeedbackEntry {
  id: string;
  recommendation_id: string;
  issue_title: string;
  repo_key: string;
  source: Source;
  decision: FeedbackDecision;
  decided_at: string;
}

export interface PortfolioItem {
  id: string;
  recommendation_id: string | null;
  issue_title: string;
  issue_url: string;
  contribution_url: string | null;
  repo_key: string;
  source: Source;
  completed_at: string;
}

export interface NotificationChannel {
  channel: "telegram" | "discord";
  connected: boolean;
  handle: string | null;
  digest: "daily" | "weekly" | "off" | null;
}

export interface MaintainedRepo {
  repo_key: string;
  source: Source;
  status: "registered" | "ingested" | "pending";
  open_issues: number | null;
  pending_suggestions: number | null;
  registered_at: string | null;
}

export type Difficulty = "starter" | "intermediate" | "advanced";

export interface TriageSuggestion {
  id: string;
  issue: Pick<NormalizedIssue, "source" | "native_id" | "title" | "url" | "repo_key" | "labels">;
  suggested_labels: string[];
  suggested_difficulty: Difficulty | null;
  confidence: number | null;
  rationale: string | null;
  status: "pending" | "approved" | "rejected";
  decided_at: string | null;
  decided_by: string | null;
}

export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  target: string;
  at: string;
}
