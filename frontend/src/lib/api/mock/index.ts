/** Mock implementation of the API surface. In-memory only; resets on reload. */
import type { IssuePilotApi } from "../index";
import type { ExtractionStatus, FeedbackDecision, Recommendation, StarterProfile, TriageSuggestion } from "../types";
import { ApiError, NotConnectedError } from "../http";
import * as f from "./fixtures";

const wait = (ms = 450) => new Promise((r) => setTimeout(r, ms));
const DEMO_FLAG = "issuepilot.demo_signed_in"; // a boolean UI flag, not a credential

let recs: Recommendation[] | null = null;
const getRecs = () => (recs ??= f.makeRecommendations());
let feedback = f.makeFeedback();
let repos = f.makeRepos();
let triage = f.makeTriage();
let decided: TriageSuggestion[] = [];
let audit = f.makeAudit();
let extractionStart: number | null = null;
let evidenceInsufficient = false;
let starter: StarterProfile | null = null;

/** Demo-only controls for the onboarding fallback. Not part of the API contract. */
export const demoControls = {
  isInsufficient: () => evidenceInsufficient,
  setInsufficient(v: boolean) {
    evidenceInsufficient = v;
    starter = null;
    extractionStart = Date.now();
  },
};

const setSignal = (r: Recommendation, key: string, fn: (v: number) => number) => {
  const sig = r.breakdown?.find((b) => b.signal === key);
  if (sig) sig.score = Math.max(0, Math.min(100, Math.round(fn(sig.score ?? 0))));
};
const rescore = (r: Recommendation) => {
  const next = f.weightedTotal(r.breakdown);
  if (next !== r.total_score) {
    r.previous_score = r.total_score;
    r.total_score = next;
  }
};
const sharesTech = (a: Recommendation, b: Recommendation) =>
  (a.issue.technologies ?? []).some((t) => (b.issue.technologies ?? []).includes(t));

/** Demo personalization (rule-based, not trained ML): shifts the Feedback signal of related issues. */
function personalize(target: Recommendation, decision: FeedbackDecision) {
  for (const r of getRecs()) {
    if (r.id === target.id || r.decision) continue;
    const related = sharesTech(r, target) || r.issue.repo_key === target.issue.repo_key;
    if (decision === "rejected") setSignal(r, "feedback", (v) => (related ? v - 40 : v + 25));
    else if (related) setSignal(r, "feedback", (v) => v + 30);
    rescore(r);
  }
}

const signedIn = () => typeof window !== "undefined" && window.sessionStorage.getItem(DEMO_FLAG) === "1";

const session = {
  user: { id: "demo", login: "demo-contributor", name: "Demo Contributor", avatar_url: null },
  roles: ["contributor", "maintainer", "admin"] as ("contributor" | "maintainer" | "admin")[],
  is_demo: true,
};

function extraction(): ExtractionStatus {
  if (extractionStart === null) extractionStart = Date.now();
  const p = Math.min(1, (Date.now() - extractionStart) / 6000);
  const steps = [
    { key: "repos", label: "Reading public repositories", done: p > 0.25 },
    { key: "prs", label: "Analyzing merged pull requests", done: p > 0.55 },
    { key: "langs", label: "Deriving languages and frameworks", done: p > 0.8 },
    { key: "profile", label: "Building tech profile", done: p >= 1 },
  ];
  if (evidenceInsufficient) {
    steps[1] = { key: "prs", label: "Analyzing merged pull requests — none found", done: p > 0.55 };
    steps[2] = { key: "langs", label: "Deriving languages — too little evidence", done: p > 0.8 };
    steps[3] = { key: "profile", label: starter ? "Starter profile built from questionnaire" : "Waiting for starter profile", done: !!starter };
  }
  return {
    state: p >= 1 ? "ready" : "running",
    progress: p,
    steps,
    error: null,
    updated_at: new Date().toISOString(),
    evidence: p >= 1 ? (evidenceInsufficient ? "insufficient" : "sufficient") : null,
    starter_profile: starter,
  };
}

export const mockApi: IssuePilotApi = {
  auth: {
    async getSession() {
      await wait(200);
      return signedIn() ? session : null;
    },
    async startSignIn() {
      window.location.assign("/auth/callback?status=success");
    },
    async completeCallback(search) {
      await wait(900);
      if (search.status !== "success") throw new ApiError(search.error ?? "Sign-in was cancelled or failed.", 401);
      window.sessionStorage.setItem(DEMO_FLAG, "1");
      return session;
    },
    async register(payload) {
      await wait(500);
      const name = `${payload.firstName} ${payload.lastName}`.trim() || payload.email.split("@")[0] || "Contributor";
      const userSession = {
        user: { id: "user_" + Date.now(), login: payload.email.split("@")[0] || "user", name, avatar_url: null },
        roles: ["contributor"] as ("contributor" | "maintainer" | "admin")[],
        is_demo: true,
      };
      window.sessionStorage.setItem(DEMO_FLAG, "1");
      return userSession;
    },
    async signInWithPassword(payload) {
      await wait(500);
      const name = payload.email.split("@")[0] || "Contributor";
      const userSession = {
        user: { id: "user_" + Date.now(), login: name, name, avatar_url: null },
        roles: ["contributor"] as ("contributor" | "maintainer" | "admin")[],
        is_demo: true,
      };
      window.sessionStorage.setItem(DEMO_FLAG, "1");
      return userSession;
    },
    async signOut() {
      window.sessionStorage.removeItem(DEMO_FLAG);
    },
  },
  onboarding: {
    async status() {
      await wait(300);
      return extraction();
    },
    async retry() {
      extractionStart = Date.now();
      return extraction();
    },
    async submitStarterProfile(input) {
      await wait(700);
      starter = input;
      const known = [...input.languages, ...input.technologies].map((x) => x.toLowerCase());
      for (const r of getRecs()) {
        const hit = (r.issue.technologies ?? []).some((t) => known.includes(t.toLowerCase()));
        setSignal(r, "skill_match", (v) => (hit ? Math.max(v, 85) : Math.min(v, 40)));
        r.total_score = f.weightedTotal(r.breakdown);
        r.previous_score = null;
      }
      return extraction();
    },
    async confirmCalibration(input) {
      await wait(500);
      return { status: "success", capability: input.capability };
    },
  },
  recommendations: {
    async list(q) {
      await wait();
      let items = getRecs().filter((r) => r.decision !== "rejected");
      if (q.source) items = items.filter((r) => r.issue.source === q.source);
      if (q.tech) {
        const t = q.tech.toLowerCase();
        items = items.filter((r) => (r.issue.technologies ?? []).some((x) => x.toLowerCase().includes(t)));
      }
      if (q.min_score != null) items = items.filter((r) => (r.total_score ?? 0) >= q.min_score!);
      if (q.max_score != null) items = items.filter((r) => (r.total_score ?? 0) <= q.max_score!);
      const sorted = [...items].sort((a, b) =>
        q.sort === "verified_desc"
          ? (b.issue.verified_at ?? "").localeCompare(a.issue.verified_at ?? "")
          : q.sort === "freshness_desc"
            ? (b.created_at ?? "").localeCompare(a.created_at ?? "")
            : (b.total_score ?? 0) - (a.total_score ?? 0),
      );
      const start = q.cursor ? Number(q.cursor) : 0;
      const limit = q.limit ?? 4;
      const page = sorted.slice(start, start + limit);
      return { items: page, next_cursor: start + limit < sorted.length ? String(start + limit) : null, total: sorted.length };
    },
    async get(id) {
      await wait();
      const r = getRecs().find((x) => x.id === id);
      if (!r) throw new ApiError("Recommendation not found.", 404);
      return r;
    },
  },
  feedback: {
    async list() {
      await wait();
      return feedback;
    },
    async submit(recommendationId, decision: FeedbackDecision, reason?: string) {
      await wait(300);
      const r = getRecs().find((x) => x.id === recommendationId);
      if (r) {
        r.decision = decision;
        personalize(r, decision);
      }
      const entry = { id: `fb_${Date.now()}`, recommendation_id: recommendationId, issue_title: r?.issue.title ?? recommendationId, repo_key: r?.issue.repo_key ?? "", source: r?.issue.source ?? "github", decision, reason, decided_at: new Date().toISOString() };
      feedback = [entry, ...feedback];
      return entry;
    },
  },
  portfolio: { async list() { await wait(); return f.portfolioFixture; } },
  profile: {
    async me() {
      await wait();
      if (!evidenceInsufficient) return f.profileFixture;
      const skills = starter
        ? [
            ...starter.languages.map((name) => ({ name, kind: "language" as const, strength: null, evidence_count: null })),
            ...starter.technologies.map((name) => ({ name, kind: "framework" as const, strength: null, evidence_count: null })),
          ]
        : [];
      return { ...f.profileFixture, skills, repos_analyzed: 0, contributions_analyzed: 0, profile_source: starter ? "questionnaire" : null, starter, extraction: extraction() };
    },
  },
  notifications: { async status() { await wait(); return f.notificationsFixture; } },
  maintainer: {
    async repos() { await wait(); return repos; },
    async registerRepo(source, repo_key) {
      await wait(600);
      const existing = repos.find((r) => r.repo_key.toLowerCase() === repo_key.toLowerCase() && r.source === source);
      if (existing) {
        existing.status = "registered";
        existing.registered_at = new Date().toISOString();
        return { repo: existing, upgraded_existing: true };
      }
      const repo = { repo_key, source, status: "pending" as const, open_issues: null, pending_suggestions: null, registered_at: new Date().toISOString() };
      repos = [...repos, repo];
      return { repo, upgraded_existing: false };
    },
    async triage() { await wait(); return triage; },
    async decide(id, decision) {
      await wait(500);
      const t = triage.find((x) => x.id === id);
      if (!t) throw new ApiError("Suggestion not found.", 404);
      const done = { ...t, status: decision, decided_at: new Date().toISOString(), decided_by: "demo-contributor" };
      triage = triage.filter((x) => x.id !== id);
      decided = [done, ...decided];
      audit = [{ id: `au_${Date.now()}`, actor: "demo-contributor", action: `triage.${decision}`, target: `${t.issue.repo_key}#${t.issue.native_id}`, at: done.decided_at }, ...audit];
      return done;
    },
    async history() { await wait(); return { decisions: decided, audit }; },
  },
  admin: {
    // Never fabricate operational metrics — admin stays "not connected" in mock mode.
    async fetch(section) {
      await wait(250);
      throw new NotConnectedError(`admin.${section}`);
    },
  },
};
