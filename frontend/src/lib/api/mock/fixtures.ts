/**
 * DEMO DATA ONLY. Shown when VITE_USE_MOCK_API is not "false".
 * Delete this folder once the FastAPI backend serves every endpoint.
 * Scores below are hand-written fixtures, not computed by the frontend.
 */
import type {
  FeedbackEntry,
  MaintainedRepo,
  NotificationChannel,
  PortfolioItem,
  Recommendation,
  SignalScore,
  TechProfile,
  TriageSuggestion,
  AuditEntry,
} from "../types";

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

const KEYS = [
  "skill_match",
  "difficulty_match",
  "responsiveness",
  "repo_health",
  "feedback",
  "freshness",
] as const;
const W = [0.35, 0.25, 0.15, 0.1, 0.1, 0.05];

function bd(v: number[], c: (number | null)[], s: string[]): SignalScore[] {
  return KEYS.map((k, i) => ({
    signal: k,
    score: v[i] ?? null,
    max: 100,
    confidence: c[i] ?? null,
    summary: s[i] ?? null,
  }));
}

/** Mock-backend only: stands in for the server's weighted sum. */
export function weightedTotal(b: SignalScore[] | null): number | null {
  if (!b) return null;
  return Math.round(
    b.reduce(
      (acc, x) => acc + (x.score ?? 0) * (W[KEYS.indexOf(x.signal as (typeof KEYS)[number])] ?? 0),
      0,
    ),
  );
}

export function makeRecommendations(): Recommendation[] {
  const list: Recommendation[] = [
    {
      id: "rec_01",
      issue: {
        source: "github",
        native_id: "5120",
        title: "Refactor blueprint routing dispatcher to support regex URL parameters",
        body: "Allow custom converters or regex patterns inside url_prefix to support dynamic subdomain multi-tenant routing.",
        url: "https://github.com/pallets/flask/issues/5120",
        repo_key: "pallets/flask",
        is_open: true,
        is_unassigned: true,
        labels: ["good first issue", "feature"],
        technologies: ["Python", "asyncio"],
        verified_at: hoursAgo(1),
        evidence: [
          {
            signal: "skill_match",
            description: "You have 14 merged PRs in Python repos using asyncio.",
            url: null,
          },
          {
            signal: null,
            description:
              "Labelled 'good first issue' by a maintainer — a supporting signal, not the sole suitability decision.",
            url: null,
          },
        ],
      },
      total_score: null,
      why: "Strong Python/asyncio match; scoped change in a well-documented module.",
      created_at: hoursAgo(2),
      decision: null,
      breakdown: bd(
        [92, 84, 88, 80, 80, 90],
        [0.9, 0.72, 0.85, 0.9, 0.6, 0.88],
        [
          "Python + asyncio overlap",
          "Smaller than most issues in this repo, close to your past PR size",
          "Maintainers reply in ~1 day",
          "Active CI, recent releases",
          "You accepted similar Python issues",
          "Updated 2 days ago",
        ],
      ),
    },
    {
      id: "rec_02",
      issue: {
        source: "gitlab",
        native_id: "38211",
        title: "Runner: log a clear error when the Docker socket is unreachable",
        body: null,
        url: "https://gitlab.com/gitlab-org/gitlab-runner/-/issues/38211",
        repo_key: "gitlab-org/gitlab-runner",
        is_open: true,
        is_unassigned: true,
        labels: [],
        technologies: ["Go", "Docker"],
        verified_at: hoursAgo(3),
        evidence: [
          {
            signal: "skill_match",
            description: "Go appears in 6 of your recent repositories.",
            url: null,
          },
        ],
      },
      total_score: null,
      why: "Go experience matches; error-handling change with clear reproduction.",
      created_at: hoursAgo(5),
      decision: null,
      breakdown: bd(
        [80, 72, 78, 90, 70, 80],
        [0.82, 0.6, 0.75, 0.9, 0.5, 0.8],
        [
          "Go + Docker overlap",
          "Mid-range for this repo",
          "Replies within a few days",
          "Large, well-maintained project",
          "No related feedback yet",
          "Updated this week",
        ],
      ),
    },
    {
      id: "rec_03",
      issue: {
        source: "bugzilla",
        native_id: "1893044",
        title: "about:support should show the active compositor backend on Linux",
        body: "Troubleshooting page omits the compositor in use on Wayland sessions.",
        url: "https://bugzilla.mozilla.org/show_bug.cgi?id=1893044",
        repo_key: "Firefox :: General",
        is_open: true,
        is_unassigned: true,
        labels: null,
        technologies: ["JavaScript", "C++"],
        verified_at: hoursAgo(6),
        evidence: [
          {
            signal: "difficulty_match",
            description: "Marked mentored in the bug whiteboard.",
            url: null,
          },
        ],
      },
      total_score: null,
      why: "JavaScript match; mentored bug. Bugzilla has no labels; suitability comes from the other signals.",
      created_at: hoursAgo(8),
      decision: null,
      breakdown: bd(
        [78, 82, 74, 85, 70, 70],
        [0.7, 0.55, 0.6, 0.8, 0.5, 0.75],
        [
          "JavaScript overlap",
          "Mentored bug, scoped component",
          "Mentor assigned in whiteboard",
          "Mature product",
          "No related feedback yet",
          "Comment 4 days ago",
        ],
      ),
    },
    {
      id: "rec_04",
      issue: {
        source: "gitea",
        native_id: "4471",
        title: "Add keyboard shortcut to toggle file tree in diff view",
        body: null,
        url: "https://codeberg.org/forgejo/forgejo/issues/4471",
        repo_key: "forgejo/forgejo",
        is_open: true,
        is_unassigned: false,
        labels: ["Kind/Enhancement", "Good first issue"],
        technologies: ["TypeScript", "Vue"],
        verified_at: hoursAgo(12),
        evidence: [
          {
            signal: "skill_match",
            description: "You've shipped 3 keyboard-accessibility PRs.",
            url: null,
          },
        ],
      },
      total_score: null,
      why: "Good frontend fit, but verification found an assignee — likely claimed.",
      created_at: hoursAgo(20),
      decision: null,
      breakdown: bd(
        [75, 70, 60, 75, 70, 20],
        [0.75, 0.5, 0.65, 0.7, 0.5, 0.4],
        [
          "TypeScript overlap",
          "Moderate for this repo",
          "Slower reviews lately",
          "Healthy community",
          "No related feedback yet",
          "Assigned 3 days ago",
        ],
      ),
    },
    {
      id: "rec_05",
      issue: {
        source: "github",
        native_id: "11840",
        title: "docs: clarify retry semantics for idempotent POST requests",
        body: null,
        url: "https://github.com/encode/httpx/issues/11840",
        repo_key: "encode/httpx",
        is_open: true,
        is_unassigned: true,
        labels: ["docs"],
        technologies: ["Python"],
        verified_at: hoursAgo(2),
        evidence: [],
      },
      total_score: null,
      why: "Documentation change in a library you use frequently.",
      created_at: hoursAgo(26),
      decision: null,
      breakdown: bd(
        [70, 80, 65, 80, 65, 40],
        [0.8, 0.6, 0.55, 0.8, 0.5, 0.7],
        [
          "Python",
          "Small docs change",
          "Moderate response time",
          "Popular library",
          "Docs PRs are rarer for you",
          "Quiet this month",
        ],
      ),
    },
    {
      id: "rec_06",
      issue: {
        source: "github",
        native_id: "84129",
        title: "Missing diagnostic when LLVM vector intrinsic has invalid lane width",
        body: "Clang parser emits silent fallback instead of an explicit error message on mismatched register width.",
        url: "https://github.com/llvm/llvm-project/issues/84129",
        repo_key: "llvm/llvm-project",
        is_open: true,
        is_unassigned: true,
        labels: ["bug", "diagnostics", "good first issue"],
        technologies: ["C++", "LLVM"],
        verified_at: hoursAgo(10),
        evidence: null,
      },
      total_score: null,
      why: "Active systems task in LLVM compiler core.",
      created_at: hoursAgo(15),
      decision: null,
      breakdown: bd(
        [82, 80, 85, 90, 75, 80],
        [0.85, 0.7, 0.8, 0.9, 0.7, 0.85],
        [
          "C++",
          "Scoped compiler diagnostic",
          "Fast triage",
          "Healthy repo",
          "Positive community",
          "Active",
        ],
      ),
    },
  ];
  return list.map((r) => ({ ...r, total_score: weightedTotal(r.breakdown) }));
}

export const profileFixture: TechProfile = {
  login: "demo-contributor",
  repos_analyzed: 42,
  contributions_analyzed: 187,
  extracted_at: hoursAgo(20),
  extraction: {
    state: "ready",
    progress: 1,
    steps: [],
    error: null,
    updated_at: hoursAgo(20),
    evidence: "sufficient",
    starter_profile: null,
  },
  profile_source: "github",
  starter: null,
  skills: [
    { name: "Python", kind: "language", strength: 0.92, evidence_count: 64 },
    { name: "Go", kind: "language", strength: 0.61, evidence_count: 21 },
    { name: "TypeScript", kind: "language", strength: 0.58, evidence_count: 19 },
    { name: "JavaScript", kind: "language", strength: 0.44, evidence_count: 12 },
    { name: "asyncio", kind: "framework", strength: 0.7, evidence_count: 14 },
    { name: "FastAPI", kind: "framework", strength: 0.66, evidence_count: 11 },
    { name: "Docker", kind: "tool", strength: 0.5, evidence_count: 9 },
    { name: "Accessibility", kind: "domain", strength: 0.35, evidence_count: 3 },
  ],
};

export function makeFeedback(): FeedbackEntry[] {
  return [
    {
      id: "fb_1",
      recommendation_id: "rec_91",
      issue_title: "Typo in contributing guide",
      repo_key: "psf/requests",
      source: "github",
      decision: "completed",
      decided_at: hoursAgo(200),
    },
    {
      id: "fb_2",
      recommendation_id: "rec_92",
      issue_title: "Fix flaky test in scheduler",
      repo_key: "gitlab-org/gitaly",
      source: "gitlab",
      decision: "rejected",
      decided_at: hoursAgo(120),
    },
    {
      id: "fb_3",
      recommendation_id: "rec_93",
      issue_title: "Add --quiet flag to export command",
      repo_key: "forgejo/forgejo",
      source: "gitea",
      decision: "accepted",
      decided_at: hoursAgo(48),
    },
  ];
}

export const portfolioFixture: PortfolioItem[] = [
  {
    id: "pf_1",
    recommendation_id: "rec_01",
    issue_title: "Typo in contributing guide",
    issue_url: "https://github.com/psf/requests/issues/6601",
    contribution_url: "https://github.com/psf/requests/pull/6602",
    repo_key: "psf/requests",
    source: "github",
    completed_at: hoursAgo(190),
  },
  {
    id: "pf_2",
    recommendation_id: null,
    issue_title: "Clarify docker executor timeout docs",
    issue_url: "https://gitlab.com/gitlab-org/gitlab-runner/-/issues/37002",
    contribution_url: null,
    repo_key: "gitlab-org/gitlab-runner",
    source: "gitlab",
    completed_at: hoursAgo(500),
  },
];

export const notificationsFixture: NotificationChannel[] = [
  { channel: "telegram", connected: true, handle: "@demo_contrib", digest: "daily" },
  { channel: "discord", connected: false, handle: null, digest: null },
];

export function makeRepos(): MaintainedRepo[] {
  return [
    {
      repo_key: "demo-org/parser",
      source: "github",
      status: "registered",
      open_issues: 58,
      pending_suggestions: 3,
      registered_at: hoursAgo(400),
    },
    {
      repo_key: "demo-org/cli",
      source: "github",
      status: "ingested",
      open_issues: 21,
      pending_suggestions: 0,
      registered_at: null,
    },
  ];
}

export function makeTriage(): TriageSuggestion[] {
  return [
    {
      id: "tr_1",
      issue: {
        source: "github",
        native_id: "412",
        title: "Parser crashes on empty front-matter block",
        url: "https://github.com/demo-org/parser/issues/412",
        repo_key: "demo-org/parser",
        labels: [],
      },
      suggested_labels: ["bug", "good first issue"],
      suggested_difficulty: "starter",
      confidence: 0.84,
      rationale: "Clear stack trace, single-function fix, reproduction included.",
      status: "pending",
      decided_at: null,
      decided_by: null,
    },
    {
      id: "tr_2",
      issue: {
        source: "github",
        native_id: "418",
        title: "Streaming API for large documents",
        url: "https://github.com/demo-org/parser/issues/418",
        repo_key: "demo-org/parser",
        labels: ["enhancement"],
      },
      suggested_labels: ["design needed"],
      suggested_difficulty: "advanced",
      confidence: 0.58,
      rationale: "Touches the tokenizer and public API; needs design discussion.",
      status: "pending",
      decided_at: null,
      decided_by: null,
    },
    {
      id: "tr_3",
      issue: {
        source: "github",
        native_id: "421",
        title: "README example uses deprecated option",
        url: "https://github.com/demo-org/parser/issues/421",
        repo_key: "demo-org/parser",
        labels: [],
      },
      suggested_labels: ["docs", "good first issue"],
      suggested_difficulty: "starter",
      confidence: 0.91,
      rationale: "One-line docs change.",
      status: "pending",
      decided_at: null,
      decided_by: null,
    },
  ];
}

export function makeAudit(): AuditEntry[] {
  return [
    {
      id: "au_1",
      actor: "demo-contributor",
      action: "triage.approved",
      target: "demo-org/parser#398",
      at: hoursAgo(72),
    },
    {
      id: "au_2",
      actor: "demo-contributor",
      action: "repo.registered",
      target: "demo-org/parser",
      at: hoursAgo(400),
    },
  ];
}
