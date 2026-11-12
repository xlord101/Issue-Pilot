/** Live implementation — connects to the Spring Boot backend (`http://localhost:8000/api`). */
import type { IssuePilotApi } from "./index";
import { endpoints as e } from "./endpoints";
import {
  ApiError,
  NotConnectedError,
  buildUrl,
  request,
  getStoredAuthToken,
  setStoredAuthToken,
} from "./http";
import type * as T from "./types";

interface BackendIdentity {
  username?: string;
  login?: string;
  display_name?: string;
  name?: string;
  avatar_url?: string;
}

interface BackendAuthMeResponse {
  authenticated?: boolean;
  user_id?: string;
  username?: string;
  display_name?: string;
  name?: string;
  avatar_url?: string;
  onboarding_completed?: boolean;
  identity?: BackendIdentity;
}

interface BackendTokenResponse {
  token?: string;
  access_token?: string;
  onboarding_completed?: boolean;
}

interface BackendSkillEntry {
  technology?: string;
  category?: string;
  score?: number | null;
  confidence?: number | null;
  evidence_count?: number | null;
  evidence?: unknown[];
}

interface BackendAnalyzeResponse {
  status?: string;
  userId?: string;
  user_id?: string;
  repositoriesAnalyzed?: number;
  repositories_analyzed?: number;
  inferredSkillsCount?: number;
  inferred_skills_count?: number;
  inferredSkills?: BackendSkillEntry[];
  inferred_skills?: BackendSkillEntry[];
  analyzedAt?: string | null;
  analyzed_at?: string | null;
  message?: string | null;
}

interface BackendProfileResponse {
  user_id?: string;
  username?: string;
  identity?: BackendIdentity;
  skills?: Record<string, BackendSkillEntry>;
  inferred_skills?: BackendSkillEntry[];
  preferences?: Record<string, unknown>;
  capability?: number | null;
  capability_confidence?: number | null;
  onboarding_completed?: boolean;
  onboardingCompleted?: boolean;
  accepted_count?: number | null;
  rejected_count?: number | null;
  completed_count?: number | null;
  updated_at?: string | null;
}

interface BackendRecommendationItem {
  id?: string;
  issue_id?: string;
  run_id?: string;
  source?: string;
  platform_issue_id?: string;
  source_issue_id?: string;
  native_id?: string | number;
  issue_number?: string | number;
  title?: string;
  body?: string | null;
  issue_url?: string | null;
  url?: string | null;
  repository_full_name?: string | null;
  repo_key?: string | null;
  state?: string | null;
  is_open?: boolean;
  is_assigned?: boolean;
  labels?: string[] | null;
  detected_technologies?: string[];
  technologies?: Array<string | { technology?: string }>;
  verified_at?: string | null;
  updated_at?: string | null;
  generated_at?: string | null;
  created_at?: string | null;
  final_score?: number | string | null;
  score?: number | string | null;
  previous_score?: number | string | null;
  why_recommended?: string | null;
  explanation?: string | null;
  match_reasons?: string[];
  user_vote?: number | null;
  user_vote_reason?: string | null;
  scores?: Record<string, unknown>;
  vote_affinity?: {
    affinity_score?: number;
    confidence?: number;
    explanations?: string[];
  };
  responsiveness_evidence?: {
    available?: boolean;
    median_response_hours?: number;
    response_time_score?: number;
  };
  health_evidence?: {
    available?: boolean;
  };
  freshness_evidence?: {
    available?: boolean;
  };
}

interface BackendRecommendationsResponse {
  run_id?: string;
  next_cursor?: string | null;
  total_available?: number;
  recommendations?: BackendRecommendationItem[];
  verified_recommendations?: BackendRecommendationItem[];
}

interface BackendFeedbackResponse {
  events?: T.FeedbackEntry[];
  feedback?: T.FeedbackEntry[];
}

function asTechKind(category: string | undefined): T.TechSkill["kind"] {
  if (
    category === "language" ||
    category === "framework" ||
    category === "tool" ||
    category === "domain"
  ) {
    return category;
  }
  return "language";
}

export const liveApi: IssuePilotApi = {
  auth: {
    async getSession() {
      const token = getStoredAuthToken();
      if (!token) {
        return null;
      }

      try {
        const data = await request<BackendAuthMeResponse>("auth.me", e.auth.me);
        if (!data || !data.authenticated) return null;

        const identity = data.identity ?? {};
        const rawId = data.user_id ? String(data.user_id) : "";
        const isGithub = rawId.startsWith("github:");
        const numericId = isGithub ? rawId.replace("github:", "") : rawId;
        const login =
          identity.username || identity.login || data.username || numericId || "contributor";
        const displayName =
          identity.display_name || identity.name || data.display_name || data.name || login;
        const avatarUrl =
          identity.avatar_url ||
          data.avatar_url ||
          (isGithub && numericId ? `https://avatars.githubusercontent.com/u/${numericId}` : null);

        return {
          user: {
            id: data.user_id || "1",
            login: login,
            name: displayName,
            avatar_url: avatarUrl,
          },
          roles: ["contributor"],
          is_demo: false,
          onboarding_completed: Boolean(data.onboarding_completed),
        };
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          setStoredAuthToken(null);
          return null;
        }
        // Fail loudly: Never mask server / connection failures with mock sessions
        throw err;
      }
    },

    async startSignIn() {
      if (!e.auth.githubStart) throw new NotConnectedError("auth.githubStart");
      window.location.assign(buildUrl(e.auth.githubStart));
    },

    async completeCallback(search) {
      if (search.error) {
        setStoredAuthToken(null);
        throw new ApiError(search.error, 401, "/auth/callback", "GET");
      }
      if (search.exchange_code) {
        setStoredAuthToken(null);
        const res = await request<BackendTokenResponse>("auth.exchange", e.auth.exchange, {
          method: "POST",
          body: { exchange_code: search.exchange_code },
        });
        const token = res?.token || res?.access_token;
        if (token) {
          setStoredAuthToken(token);
        }
      }
      const s = await liveApi.auth.getSession();
      if (!s) {
        throw new ApiError(
          "Failed to retrieve authenticated session from server",
          401,
          "/api/auth/me",
          "GET",
        );
      }
      return s;
    },

    async register(payload) {
      return await request<T.OtpChallenge>("auth.register", e.auth.register, {
        method: "POST",
        body: {
          first_name: payload.firstName,
          last_name: payload.lastName,
          email: payload.email,
          password: payload.password,
        },
      });
    },

    async verifyOtp(payload) {
      const res = await request<BackendTokenResponse>("auth.verifyOtp", e.auth.verifyOtp, {
        method: "POST",
        body: {
          email: payload.email,
          otp: payload.otp,
        },
      });
      const token = res?.access_token || res?.token;
      if (token) {
        setStoredAuthToken(token);
      }
      const s = await liveApi.auth.getSession();
      if (!s) {
        throw new ApiError(
          "Email verified, but failed to retrieve session.",
          500,
          "/api/auth/verify-otp",
          "POST",
        );
      }
      return s;
    },

    async resendOtp(payload) {
      return await request<T.OtpChallenge>("auth.resendOtp", e.auth.resendOtp, {
        method: "POST",
        body: { email: payload.email },
      });
    },

    async signInWithPassword(payload) {
      const res = await request<BackendTokenResponse>("auth.login", e.auth.login, {
        method: "POST",
        body: {
          email: payload.email,
          password: payload.password,
        },
      });
      const token = res?.access_token || res?.token;
      if (token) {
        setStoredAuthToken(token);
      }
      const s = await liveApi.auth.getSession();
      if (!s) {
        throw new ApiError(
          "Signed in, but failed to retrieve session.",
          500,
          "/api/auth/login",
          "POST",
        );
      }
      return {
        ...s,
        onboarding_completed:
          typeof res?.onboarding_completed === "boolean"
            ? res.onboarding_completed
            : s.onboarding_completed,
      };
    },

    async forgotPassword(payload) {
      return await request<{
        message: string;
        expires_in_seconds?: number;
        resend_cooldown_seconds?: number;
      }>("auth.forgotPassword", e.auth.forgotPassword, {
        method: "POST",
        body: { email: payload.email },
      });
    },

    async resetPassword(payload) {
      return await request<{ message: string }>("auth.resetPassword", e.auth.resetPassword, {
        method: "POST",
        body: {
          email: payload.email,
          otp: payload.otp,
          new_password: payload.newPassword,
        },
      });
    },

    async signOut() {
      try {
        await request<void>("auth.logout", e.auth.logout, { method: "POST" });
      } catch {
        /* ignore network error on logout */
      } finally {
        setStoredAuthToken(null);
      }
    },
  },

  onboarding: {
    async status() {
      const res = await request<BackendProfileResponse>("onboarding.status", e.onboarding.status);
      const skills = res.inferred_skills ?? [];
      const confirmedMap = res.skills ?? {};
      const allSkills = [
        ...skills.map((s) => ({
          name: s.technology ?? "Unknown",
          kind: asTechKind(s.category),
          strength: (s.score ?? 50) / 100,
          evidence_count: s.evidence_count ?? 1,
        })),
        ...Object.values(confirmedMap).map((s) => ({
          name: s.technology ?? "Unknown",
          kind: asTechKind(s.category),
          strength: (s.score ?? 50) / 100,
          evidence_count: s.evidence_count ?? 5,
        })),
      ];

      return {
        state: res.onboarding_completed ? "ready" : "ready",
        progress: 1.0,
        steps: [
          { key: "auth", label: "Identity confirmed", done: true },
          { key: "repos", label: "Repositories scanned", done: true },
          { key: "skills", label: "Skills calibrated", done: true },
        ],
        error: null,
        updated_at: res.updated_at || new Date().toISOString(),
        evidence: allSkills.length > 0 ? "sufficient" : "insufficient",
        starter_profile: null,
      };
    },

    async retry() {
      await request<unknown>("onboarding.retry", e.onboarding.retry, { method: "POST" });
      return liveApi.onboarding.status();
    },

    async analyze() {
      const res = await request<BackendAnalyzeResponse>("onboarding.retry", e.onboarding.retry, {
        method: "POST",
      });
      const rawInferred = res?.inferredSkills ?? res?.inferred_skills ?? [];
      const mappedInferred: T.TechSkill[] = rawInferred.map((s) => {
        const conf = s.confidence != null ? Number(s.confidence) : 0.7;
        const pct = Math.max(35, Math.min(95, Math.round(conf * 100)));
        return {
          name: s.technology ?? "Unknown",
          kind: asTechKind(s.category),
          strength: s.score != null ? Math.round(Number(s.score)) : pct,
          evidence_count: Array.isArray(s.evidence) ? s.evidence.length : (s.evidence_count ?? 1),
        };
      });
      return {
        status: res?.status ?? "completed",
        userId: res?.userId ?? res?.user_id,
        repositoriesAnalyzed: Number(res?.repositoriesAnalyzed ?? res?.repositories_analyzed ?? 0),
        inferredSkillsCount: Number(
          res?.inferredSkillsCount ?? res?.inferred_skills_count ?? mappedInferred.length,
        ),
        inferredSkills: mappedInferred,
        analyzedAt: res?.analyzedAt ?? res?.analyzed_at ?? null,
        message: res?.message ?? null,
      };
    },

    async submitStarterProfile(body) {
      await request<unknown>("onboarding.starterProfile", e.onboarding.starterProfile, {
        method: "POST",
        body: {
          confirmed_skills: body.languages.map((l) => ({
            technology: l,
            score: 75,
            level: "intermediate",
            category: "language",
          })),
          dismissed_skills: [],
          preferences: {
            experience: body.experience,
            interests: body.interests,
          },
        },
      });
      return liveApi.onboarding.status();
    },

    async confirmCalibration(input) {
      const res = await request<unknown>(
        "onboarding.confirmCalibration",
        e.onboarding.starterProfile,
        {
          method: "POST",
          body: input,
        },
      );
      return res;
    },
  },

  recommendations: {
    async list(q) {
      const offset = q.cursor ? Math.max(0, Number(q.cursor) || 0) : 0;
      const limit = q.limit ?? 6;
      const payload: Record<string, string | number | boolean> = {
        demo_mode: false,
        prefer_live_atlas: true,
        target_count: limit,
        offset,
      };
      if (q.source) {
        payload["source_filter"] = q.source;
      }
      if (q.tech && q.tech.trim()) {
        payload["technology_filter"] = q.tech.trim();
      }
      if (q.min_score != null && q.min_score > 0) {
        payload["min_score"] = q.min_score;
      }
      if (q.max_score != null && q.max_score < 100) {
        payload["max_score"] = q.max_score;
      }
      if (q.sort) {
        payload["sort"] = q.sort;
      }

      const res = await request<BackendRecommendationsResponse>(
        "recommendations.list",
        e.recommendations.list,
        {
          method: "POST",
          body: payload,
        },
      );

      const runId: string | undefined = typeof res?.run_id === "string" ? res.run_id : undefined;
      const rawList = res.recommendations ?? res.verified_recommendations ?? [];
      const items: T.Recommendation[] = rawList.map((item, idx) =>
        mapRecommendationItem(item, idx, runId),
      );

      return {
        items,
        next_cursor: typeof res?.next_cursor === "string" ? res.next_cursor : null,
        total: typeof res?.total_available === "number" ? res.total_available : items.length,
      };
    },

    async get(id) {
      const item = await request<BackendRecommendationItem>(
        "recommendations.detail",
        e.recommendations.detail,
        {
          params: { id },
        },
      );
      if (!item) {
        throw new ApiError(
          `Recommendation '${id}' not found.`,
          404,
          `/api/recommendations/${id}`,
          "GET",
        );
      }
      return mapRecommendationItem(item, 0, item.run_id);
    },
  },

  feedback: {
    async list() {
      const session = await liveApi.auth.getSession();
      if (!session) return [];
      const res = await request<BackendFeedbackResponse>(
        "feedback.list",
        `/api/feedback/${session.user.id}`,
      );
      return res?.events ?? res?.feedback ?? [];
    },

    async submit(recommendationId, decision, reason) {
      const mappedEventType =
        decision === "accepted" ? "accepted" : decision === "rejected" ? "rejected" : "completed";
      await request<unknown>("feedback.record", "/api/feedback", {
        method: "POST",
        body: {
          issue_id: recommendationId,
          event_type: mappedEventType,
          reason: reason || "",
        },
      });
      return {
        id: `fb-${Date.now()}`,
        recommendation_id: recommendationId,
        issue_title: "",
        repo_key: "",
        source: "github",
        decision,
        decided_at: new Date().toISOString(),
      };
    },
  },

  votes: {
    async record(payload) {
      return await request<unknown>("votes.record", e.votes.record, {
        method: "POST",
        body: {
          source: payload.source,
          platform_issue_id: payload.platform_issue_id,
          vote: payload.vote,
          reason: payload.reason ?? null,
          recommendation_run_id: payload.recommendation_run_id ?? null,
        },
      });
    },
    async remove(payload) {
      const session = await liveApi.auth.getSession();
      if (!session) {
        throw new ApiError("Authentication required to clear votes.", 401, "/api/votes", "DELETE");
      }
      return await request<unknown>("votes.remove", e.votes.record, {
        method: "DELETE",
        query: {
          user_id: session.user.id,
          source: payload.source,
          platform_issue_id: payload.platform_issue_id,
        },
      });
    },
  },

  profile: {
    async me() {
      const profile = await request<BackendProfileResponse>("profile.me", e.profile.me);
      if (!profile) {
        throw new ApiError(
          "Failed to retrieve profile from server",
          404,
          e.profile.me || "/api/profile/me",
          "GET",
        );
      }

      const skillsList: T.TechSkill[] = profile.skills
        ? Object.values(profile.skills).map((s) => ({
            name: s.technology || "Unknown",
            kind: asTechKind(s.category),
            strength: s.score != null ? Math.round(Number(s.score)) : null,
            evidence_count: s.evidence_count != null ? Number(s.evidence_count) : null,
          }))
        : [];

      const inferredList: T.TechSkill[] = Array.isArray(profile.inferred_skills)
        ? profile.inferred_skills.map((s) => {
            const conf = s.confidence != null ? Number(s.confidence) : 0.7;
            const derivedPct = Math.max(35, Math.min(95, Math.round(conf * 100)));
            return {
              name: s.technology || "Unknown",
              kind: asTechKind(s.category),
              strength: s.score != null ? Math.round(Number(s.score)) : derivedPct,
              evidence_count: Array.isArray(s.evidence)
                ? s.evidence.length
                : s.evidence_count != null
                  ? Number(s.evidence_count)
                  : 1,
            };
          })
        : [];

      const prefs = profile.preferences ?? {};
      const isGithub = String(profile.user_id || "").startsWith("github:");

      return {
        login:
          profile.identity?.username ||
          profile.username ||
          (profile.user_id
            ? String(profile.user_id).replace(/^(github:|local:)/, "")
            : "contributor"),
        skills: skillsList,
        inferred_skills: inferredList,
        is_github: isGithub,
        capability: profile.capability != null ? Math.round(Number(profile.capability)) : null,
        capability_confidence:
          profile.capability_confidence != null ? Number(profile.capability_confidence) : null,
        onboarding_completed: Boolean(profile.onboarding_completed ?? profile.onboardingCompleted),
        preferences: prefs,
        accepted_count: profile.accepted_count != null ? Number(profile.accepted_count) : 0,
        rejected_count: profile.rejected_count != null ? Number(profile.rejected_count) : 0,
        completed_count: profile.completed_count != null ? Number(profile.completed_count) : 0,
        repos_analyzed: prefs["repos_analyzed"] != null ? Number(prefs["repos_analyzed"]) : null,
        contributions_analyzed:
          profile.completed_count != null ? Number(profile.completed_count) : null,
        extraction: {
          state: "ready",
          progress: 1.0,
          steps: [],
          error: null,
          updated_at: profile.updated_at ?? null,
          evidence: skillsList.length > 0 ? "sufficient" : "insufficient",
          starter_profile: null,
        },
        extracted_at: profile.updated_at ?? null,
        profile_source: isGithub ? "github" : "questionnaire",
        starter: null,
      };
    },
  },
};

function roundOrNull(val: unknown): number | null {
  if (typeof val === "number" && Number.isFinite(val)) return Math.round(val);
  if (typeof val === "string" && val.trim() !== "") {
    const parsed = Number(val);
    if (Number.isFinite(parsed)) return Math.round(parsed);
  }
  return null;
}

function buildSignalEvidence(
  item: BackendRecommendationItem,
  issueUrl: string | null,
): T.Evidence[] | null {
  const trail: T.Evidence[] = [];

  const matchReasons = Array.isArray(item?.match_reasons) ? item.match_reasons : [];
  for (const reason of matchReasons) {
    if (typeof reason === "string" && reason.trim()) {
      trail.push({ signal: "skill_match", description: reason, url: issueUrl });
    }
  }

  const affExps = Array.isArray(item?.vote_affinity?.explanations)
    ? item.vote_affinity.explanations
    : [];
  for (const exp of affExps) {
    if (
      typeof exp === "string" &&
      exp.trim() &&
      !exp.startsWith("No preference evidence") &&
      !exp.startsWith("No vote history")
    ) {
      trail.push({ signal: "feedback", description: exp, url: null });
    }
  }

  const sc = item?.scores || {};
  if (sc["difficulty_available"] && sc["computed_issue_difficulty"] != null) {
    trail.push({
      signal: "difficulty_match",
      description: `Computed issue difficulty: ${Math.round(Number(sc["computed_issue_difficulty"]))}/100 derived from repository complexity & scope.`,
      url: issueUrl,
    });
  }

  const resp = item?.responsiveness_evidence;
  if (resp?.available) {
    const medianHours = resp.median_response_hours;
    const desc =
      typeof medianHours === "number" && Number.isFinite(medianHours)
        ? `Maintainer median first response: ${medianHours.toFixed(1)}h across recent issues.`
        : `Maintainer responsiveness evidence recorded (response score ${Math.round(Number(resp.response_time_score ?? sc["responsiveness"] ?? 0))}/100).`;
    trail.push({ signal: "responsiveness", description: desc, url: issueUrl });
  }

  const health = item?.health_evidence;
  if (health?.available) {
    trail.push({
      signal: "repo_health",
      description: `Repository commit, PR, and contributor health metrics verified on ${item.repository_full_name || "host repository"}.`,
      url: issueUrl,
    });
  }

  const fresh = item?.freshness_evidence;
  if (fresh?.available) {
    trail.push({
      signal: "freshness",
      description: `Issue updated ${item.updated_at ? new Date(item.updated_at).toLocaleDateString() : "recently"}; active triage state.`,
      url: issueUrl,
    });
  }

  return trail.length > 0 ? trail : null;
}

function mapRecommendationItem(
  item: BackendRecommendationItem,
  idx: number,
  runId?: string,
): T.Recommendation {
  const sc = item?.scores ?? {};
  const src = ((item?.source as T.Source) || "github") as T.Source;
  const issueUrl = (item?.issue_url ?? item?.url ?? null) as string | null;
  const rawLabels = Array.isArray(item?.labels) ? item.labels : src === "bugzilla" ? null : [];

  const techs: string[] | null = Array.isArray(item?.detected_technologies)
    ? item.detected_technologies
    : Array.isArray(item?.technologies)
      ? item.technologies
          .map((t) => (typeof t === "string" ? t : t?.technology))
          .filter((t): t is string => Boolean(t))
      : null;

  const skillOk = sc["skill_available"] !== false && sc["skill_match"] != null;
  const diffOk = sc["difficulty_available"] !== false && sc["difficulty_match"] != null;
  const respOk = sc["responsiveness_available"] !== false && sc["responsiveness"] != null;
  const healthVal = sc["repository_health"] ?? sc["repo_health"];
  const healthOk = sc["health_available"] !== false && healthVal != null;
  const fbOk = sc["feedback_available"] === true && sc["feedback"] != null;
  const freshOk = sc["freshness_available"] !== false && sc["freshness"] != null;

  const matchReasons = Array.isArray(item?.match_reasons) ? item.match_reasons : [];
  const affExps = Array.isArray(item?.vote_affinity?.explanations)
    ? item.vote_affinity.explanations.filter(
        (s: string) =>
          s && !s.startsWith("No preference evidence") && !s.startsWith("No vote history"),
      )
    : [];

  const whyText: string | null =
    (typeof item?.why_recommended === "string" && item.why_recommended.trim()
      ? item.why_recommended
      : null) ||
    (matchReasons.length > 0 ? matchReasons.slice(0, 2).join(" • ") : null) ||
    (typeof item?.explanation === "string" && item.explanation.trim() ? item.explanation : null);

  const canonicalId = String(item?.id || item?.issue_id || `rec-${idx + 1}`);
  const platformIssueId = String(
    item?.platform_issue_id ??
      item?.id ??
      item?.source_issue_id ??
      item?.native_id ??
      item?.issue_number ??
      canonicalId,
  );

  return {
    id: canonicalId,
    run_id: typeof item?.run_id === "string" ? item.run_id : runId,
    user_vote: item?.user_vote === 1 ? 1 : item?.user_vote === -1 ? -1 : null,
    user_vote_reason: typeof item?.user_vote_reason === "string" ? item.user_vote_reason : null,
    affinity_score:
      typeof item?.vote_affinity?.affinity_score === "number"
        ? Number(item.vote_affinity.affinity_score)
        : null,
    affinity_confidence:
      typeof item?.vote_affinity?.confidence === "number"
        ? Number(item.vote_affinity.confidence)
        : null,
    previous_score: roundOrNull(item?.previous_score),
    issue: {
      source: src,
      native_id: String(item?.issue_number ?? item?.native_id ?? canonicalId),
      platform_issue_id: platformIssueId,
      title: item?.title ?? "Untitled Issue",
      body: item?.body ?? null,
      url: issueUrl ?? "#",
      repo_key: item?.repository_full_name ?? item?.repo_key ?? "unknown/repository",
      is_open:
        item?.state != null
          ? item.state === "open"
          : typeof item?.is_open === "boolean"
            ? item.is_open
            : null,
      is_unassigned: typeof item?.is_assigned === "boolean" ? !item.is_assigned : null,
      labels: rawLabels,
      evidence: buildSignalEvidence(item, issueUrl),
      technologies: techs,
      verified_at: item?.verified_at ?? null,
    },
    total_score: roundOrNull(item?.final_score ?? item?.score ?? sc["final_score"]),
    breakdown: [
      {
        signal: "skill_match",
        score: skillOk ? roundOrNull(sc["skill_match"]) : null,
        max: 100,
        confidence:
          skillOk && typeof sc["skill_confidence"] === "number"
            ? Math.min(1, Math.max(0, Number(sc["skill_confidence"])))
            : skillOk
              ? 0.9
              : null,
        summary: skillOk
          ? matchReasons[0] || "Confirmed skill overlap from issue technologies"
          : "Insufficient technology coverage (weight renormalized)",
      },
      {
        signal: "difficulty_match",
        score: diffOk ? roundOrNull(sc["difficulty_match"]) : null,
        max: 100,
        confidence:
          diffOk && typeof sc["difficulty_confidence"] === "number"
            ? Math.min(1, Math.max(0, Number(sc["difficulty_confidence"])))
            : diffOk
              ? 0.85
              : null,
        summary: diffOk
          ? sc["computed_issue_difficulty"] != null
            ? `Issue complexity ${Math.round(Number(sc["computed_issue_difficulty"]))}/100 vs your capability`
            : "Evaluated against your calibrated capability"
          : "Difficulty evidence unavailable (weight renormalized)",
      },
      {
        signal: "responsiveness",
        score: respOk ? roundOrNull(sc["responsiveness"]) : null,
        max: 100,
        confidence: respOk ? 0.85 : null,
        summary: respOk
          ? "Maintainer triage & response history"
          : "Responsiveness data unavailable (weight renormalized)",
      },
      {
        signal: "repo_health",
        score: healthOk ? roundOrNull(healthVal) : null,
        max: 100,
        confidence: healthOk ? 0.9 : null,
        summary: healthOk
          ? "Commit, PR & release maintenance signals"
          : "Repository health unavailable (weight renormalized)",
      },
      {
        signal: "feedback",
        score: fbOk ? roundOrNull(sc["feedback"]) : null,
        max: 100,
        confidence:
          fbOk && typeof sc["vote_affinity_confidence"] === "number"
            ? Number(sc["vote_affinity_confidence"])
            : fbOk
              ? 0.8
              : null,
        summary: fbOk
          ? affExps[0] || "Personalized from your Like / Dislike & acceptance history"
          : "No vote/feedback history yet (weight renormalized)",
      },
      {
        signal: "freshness",
        score: freshOk ? roundOrNull(sc["freshness"]) : null,
        max: 100,
        confidence: freshOk ? 0.9 : null,
        summary: freshOk
          ? "Recency of creation and activity"
          : "Freshness unavailable (weight renormalized)",
      },
    ],
    why: whyText,
    created_at: item?.generated_at ?? item?.created_at ?? null,
    decision: null,
  };
}
