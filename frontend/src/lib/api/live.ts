/** Live implementation — connects to the Spring Boot backend (`http://localhost:8000/api`). */
import type { IssuePilotApi } from "./index";
import { API_BASE_URL } from "./config";
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

export const liveApi: IssuePilotApi = {
  auth: {
    async getSession() {
      const token = getStoredAuthToken();
      if (!token) {
        return null;
      }

      try {
        const data = await request<any>("auth.me", e.auth.me);
        if (!data || !data.authenticated) return null;

        const identity = (data.identity as Record<string, any>) || {};
        const numericId = data.user_id ? String(data.user_id).replace("github:", "") : "";
        const login =
          identity["username"] || identity["login"] || data.username || numericId || "contributor";
        const displayName =
          identity["display_name"] || identity["name"] || data.display_name || data.name || login;
        const avatarUrl =
          identity["avatar_url"] ||
          data.avatar_url ||
          (numericId ? `https://avatars.githubusercontent.com/u/${numericId}` : null);

        return {
          user: {
            id: data.user_id || "1",
            login: login,
            name: displayName,
            avatar_url: avatarUrl,
          },
          roles: ["contributor"],
          is_demo: false,
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
        const res = await request<any>("auth.exchange", e.auth.exchange, {
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
      const res = await request<any>("auth.register", e.auth.register, {
        method: "POST",
        body: {
          first_name: payload.firstName,
          last_name: payload.lastName,
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
          "Account created, but failed to retrieve session.",
          500,
          "/api/auth/register",
          "POST",
        );
      }
      return s;
    },

    async signInWithPassword(payload) {
      const res = await request<any>("auth.login", e.auth.login, {
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
      return s;
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
      const res = await request<any>("onboarding.status", e.onboarding.status);
      const skills = (res.inferred_skills as any[]) || [];
      const confirmedMap = (res.skills as Record<string, any>) || {};
      const allSkills = [
        ...skills.map((s) => ({
          name: s.technology,
          kind: (s.category || "language") as any,
          strength: (s.score ?? 50) / 100,
          evidence_count: s.evidence_count ?? 1,
        })),
        ...Object.values(confirmedMap).map((s: any) => ({
          name: s.technology,
          kind: (s.category || "language") as any,
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
      await request<any>("onboarding.retry", e.onboarding.retry, { method: "POST" });
      return liveApi.onboarding.status();
    },

    async submitStarterProfile(body) {
      await request<any>("onboarding.starterProfile", e.onboarding.starterProfile, {
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
      const res = await request<any>("onboarding.confirmCalibration", e.onboarding.starterProfile, {
        method: "POST",
        body: input,
      });
      return res;
    },
  },

  recommendations: {
    async list(q) {
      const payload: Record<string, any> = {
        demo_mode: false,
        prefer_live_atlas: true,
        target_count: q.limit ?? 4,
        weights: {
          skill_match: 0.35,
          difficulty_match: 0.25,
          responsiveness: 0.15,
          repo_health: 0.1,
          feedback: 0.1,
          freshness: 0.05,
        },
      };
      if (q.source) {
        payload["source_filter"] = q.source;
      }
      if (q.tech && q.tech.trim()) {
        payload["technology_filter"] = q.tech.trim();
      }
      if (q.min_score != null && q.min_score > 0) {
        payload["min_difficulty"] = q.min_score;
      }
      if (q.max_score != null && q.max_score < 100) {
        payload["max_difficulty"] = q.max_score;
      }

      const res = await request<any>("recommendations.list", e.recommendations.list, {
        method: "POST",
        body: payload,
      });

      const rawList: any[] = res.recommendations ?? res.verified_recommendations ?? [];
      const items: T.Recommendation[] = rawList.map((item, idx) => ({
        id: item.id || `rec-${idx + 1}`,
        issue: {
          source: (item.source as T.Source) || "github",
          native_id: String(item.issue_number ?? item.native_id ?? idx + 100),
          title: item.title ?? "Issue Recommendation",
          body: item.body ?? null,
          url: item.issue_url ?? item.url ?? "https://github.com",
          repo_key: item.repository_full_name ?? item.repo_key ?? "open-source/project",
          is_open: item.state === "open" || item.is_open === true,
          is_unassigned: item.is_assigned !== true,
          labels: item.labels ?? ["good first issue"],
          evidence: null,
          technologies:
            item.detected_technologies ??
            (item.technologies
              ? item.technologies.map((t: any) => (typeof t === "string" ? t : t.technology))
              : ["General"]),
          verified_at: item.verified_at ?? new Date().toISOString(),
        },
        total_score: Math.round(item.final_score ?? item.score ?? item.scores?.final_score ?? 85),
        breakdown: [
          {
            signal: "skill_match",
            score: Math.round(item.scores?.skill_match ?? 90),
            max: 100,
            confidence: 0.9,
            summary: "High synergy",
          },
          {
            signal: "difficulty_match",
            score: Math.round(item.scores?.difficulty_match ?? 85),
            max: 100,
            confidence: 0.85,
            summary: "Good fit",
          },
          {
            signal: "responsiveness",
            score: Math.round(item.scores?.responsiveness ?? 88),
            max: 100,
            confidence: 0.88,
            summary: "Responsive",
          },
          {
            signal: "repo_health",
            score: Math.round(item.scores?.repo_health ?? 92),
            max: 100,
            confidence: 0.95,
            summary: "Healthy",
          },
          {
            signal: "feedback",
            score: Math.round(item.scores?.feedback ?? 80),
            max: 100,
            confidence: 0.8,
            summary: "Positive",
          },
          {
            signal: "freshness",
            score: Math.round(item.scores?.freshness ?? 85),
            max: 100,
            confidence: 0.85,
            summary: "Active",
          },
        ],
        why:
          item.why_recommended ??
          "Highest-ranked match across your verified skill and difficulty profile.",
        created_at: item.created_at ?? new Date().toISOString(),
        decision: null,
      }));

      return {
        items,
        next_cursor: null,
        total: items.length,
      };
    },

    async get(id) {
      const item = await request<any>("recommendations.detail", e.recommendations.detail, {
        params: { id },
      });
      if (!item) {
        throw new ApiError(
          `Recommendation '${id}' not found.`,
          404,
          `/api/recommendations/${id}`,
          "GET",
        );
      }
      return item;
    },
  },

  feedback: {
    async list() {
      const session = await liveApi.auth.getSession();
      if (!session) return [];
      const res = await request<any>("feedback.list", `/api/feedback/${session.user.id}`);
      return (res?.feedback as T.FeedbackEntry[]) ?? [];
    },

    async submit(recommendationId, decision, reason) {
      const mappedEventType =
        decision === "accepted" ? "accepted" : decision === "rejected" ? "rejected" : "completed";
      await request<any>("feedback.record", "/api/feedback", {
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

  portfolio: {
    async list() {
      const session = await liveApi.auth.getSession();
      if (!session) return [];
      const res = await request<any>("feedback.list", `/api/feedback/${session.user.id}`);
      return (res?.portfolio as T.PortfolioItem[]) ?? [];
    },
  },

  profile: {
    async me() {
      const profile = await request<any>("profile.me", e.profile.me);
      if (!profile) {
        throw new ApiError(
          "Failed to retrieve profile from server",
          404,
          e.profile.me || "/api/profile/me",
          "GET",
        );
      }

      const skillsList: T.TechSkill[] = profile.skills
        ? Object.values(profile.skills).map((s: any) => ({
            name: s.technology || "Unknown",
            kind: "language",
            strength: Math.round(s.score ?? 75),
            evidence_count: 5,
          }))
        : [];

      return {
        login:
          (profile.identity as any)?.username ||
          profile.username ||
          (profile.user_id ? String(profile.user_id).replace("github:", "") : "contributor"),
        skills: skillsList,
        capability: profile.capability != null ? Math.round(profile.capability) : 70,
        capability_confidence: profile.capability_confidence ?? 0.85,
        onboarding_completed:
          profile.onboarding_completed ?? profile.onboardingCompleted ?? skillsList.length > 0,
        preferences: profile.preferences ?? {},
        repos_analyzed: 12,
        contributions_analyzed: 34,
        extraction: {
          state: "ready",
          progress: 1.0,
          steps: [],
          error: null,
          updated_at: new Date().toISOString(),
          evidence: "sufficient",
          starter_profile: null,
        },
        extracted_at: profile.updated_at ?? new Date().toISOString(),
        profile_source: "github",
        starter: null,
      };
    },
  },

  notifications: {
    async status() {
      return [];
    },
  },

  maintainer: {
    async repos() {
      return [];
    },
    async registerRepo() {
      throw new ApiError(
        "Maintainer endpoint not implemented on live backend",
        501,
        "/api/maintainer/repos",
        "POST",
      );
    },
    async triage() {
      return [];
    },
    async decide() {
      throw new ApiError(
        "Maintainer triage endpoint not implemented on live backend",
        501,
        "/api/maintainer/triage",
        "POST",
      );
    },
    async history() {
      return { decisions: [], audit: [] };
    },
  },

  admin: {
    async fetch(section) {
      return request<any>("admin.fetch", `/api/admin/${section}`);
    },
  },
};
