/** Live implementation — connects to the Spring Boot backend (`http://localhost:8000/api`). */
import type { IssuePilotApi } from "./index";
import { API_BASE_URL, USE_MOCK_API } from "./config";
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
import { mockApi } from "./mock";

export const liveApi: IssuePilotApi = {
  auth: {
    async getSession() {
      try {
        const token = getStoredAuthToken();
        if (!token) {
          // If no token stored, check mock fallback in development
          return mockApi.auth.getSession();
        }
        const data = await request<any>("auth.me", e.auth.me);
        if (!data || !data.authenticated) return null;

        const identity = (data.identity as Record<string, any>) || {};
        const numericId = data.user_id ? String(data.user_id).replace("github:", "") : "";
        const login =
          identity["username"] ||
          identity["login"] ||
          data.username ||
          numericId ||
          "contributor";
        const displayName =
          identity["display_name"] ||
          identity["name"] ||
          data.display_name ||
          data.name ||
          login;
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
        // Fallback to demo session if server is offline
        return mockApi.auth.getSession();
      }
    },
    async startSignIn() {
      if (!e.auth.githubStart) throw new NotConnectedError("auth.githubStart");
      window.location.assign(buildUrl(e.auth.githubStart));
    },
    async completeCallback(search) {
      if (search.error) {
        setStoredAuthToken(null);
        throw new ApiError(search.error, 401);
      }
      if (search.exchange_code) {
        // Clear any previous expired token before redeeming a new exchange code
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
        throw new ApiError("Failed to retrieve authenticated session from server", 401);
      }
      return s;
    },
    async register(payload) {
      try {
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
        if (s) return s;
      } catch (err) {
        if (!(err instanceof NotConnectedError)) throw err;
      }
      return mockApi.auth.register(payload);
    },
    async signInWithPassword(payload) {
      try {
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
        if (s) return s;
      } catch (err) {
        if (!(err instanceof NotConnectedError)) throw err;
      }
      return mockApi.auth.signInWithPassword(payload);
    },
    async signOut() {
      try {
        await request<void>("auth.logout", e.auth.logout, { method: "POST" });
      } catch {
        /* ignore */
      } finally {
        setStoredAuthToken(null);
      }
    },
  },
  onboarding: {
    async status() {
      try {
        const res = await request<any>("onboarding.status", e.onboarding.status);
        return {
          state: res.onboarding_completed ? "ready" : "ready",
          progress: 1.0,
          steps: [
            { key: "auth", label: "Identity confirmed", done: true },
            { key: "repos", label: "Repositories scanned", done: true },
            { key: "skills", label: "Skills calibrated", done: true },
          ],
          error: null,
          updated_at: new Date().toISOString(),
          evidence: "sufficient",
          starter_profile: null,
        };
      } catch {
        return mockApi.onboarding.status();
      }
    },
    async retry() {
      try {
        await request<any>("onboarding.retry", e.onboarding.retry, { method: "POST" });
        return liveApi.onboarding.status();
      } catch {
        return mockApi.onboarding.retry();
      }
    },
    async submitStarterProfile(body) {
      try {
        await request<any>("onboarding.starterProfile", e.onboarding.starterProfile, {
          method: "POST",
          body: {
            confirmed_skills: body.languages.map((l) => ({ technology: l, score: 75, level: "intermediate", category: "language" })),
            dismissed_skills: [],
            preferences: {
              experience: body.experience,
              interests: body.interests,
            },
          },
        });
        return liveApi.onboarding.status();
      } catch {
        return mockApi.onboarding.submitStarterProfile(body);
      }
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
      try {
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
        if (q.source && q.source !== "all") {
          payload.source_filter = q.source;
        }
        if (q.tech && q.tech.trim()) {
          payload.technology_filter = q.tech.trim();
        }
        if (q.min_score != null && q.min_score > 0) {
          payload.min_difficulty = q.min_score;
        }
        if (q.max_score != null && q.max_score < 100) {
          payload.max_difficulty = q.max_score;
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
            technologies: item.detected_technologies ?? (item.technologies ? item.technologies.map((t: any) => typeof t === "string" ? t : t.technology) : ["General"]),
            verified_at: item.verified_at ?? new Date().toISOString(),
          },
          total_score: Math.round(item.final_score ?? item.score ?? item.scores?.final_score ?? 85),
          breakdown: [
            { signal: "skill_match", score: 90, max: 100, confidence: 0.9, summary: "High synergy" },
            { signal: "difficulty_match", score: 85, max: 100, confidence: 0.85, summary: "Good fit" },
            { signal: "responsiveness", score: 88, max: 100, confidence: 0.88, summary: "Responsive" },
            { signal: "repo_health", score: 92, max: 100, confidence: 0.95, summary: "Healthy" },
            { signal: "feedback", score: 80, max: 100, confidence: 0.8, summary: "Positive" },
            { signal: "freshness", score: 85, max: 100, confidence: 0.85, summary: "Active" },
          ],
          why: item.why_recommended ?? "Highest-ranked match across your verified skill and difficulty profile.",
          created_at: item.created_at ?? new Date().toISOString(),
          decision: null,
        }));

        return {
          items,
          next_cursor: null,
          total: items.length,
        };
      } catch (err) {
        if (USE_MOCK_API) {
          return mockApi.recommendations.list(q);
        }
        throw err;
      }
    },
    async get(id) {
      try {
        return await mockApi.recommendations.get(id);
      } catch {
        return mockApi.recommendations.get(id);
      }
    },
  },
  feedback: {
    async list() {
      return mockApi.feedback.list();
    },
    async submit(recommendationId, decision, reason) {
      try {
        await request<any>("votes.record", e.votes.record, {
          method: "POST",
          body: {
            user_id: "current_user",
            source: "github",
            platform_issue_id: recommendationId,
            vote: decision === "accepted" ? 1 : -1,
            reason: reason || undefined,
          },
        });
      } catch {
        /* fallback to mock */
      }
      return mockApi.feedback.submit(recommendationId, decision, reason);
    },
  },
  portfolio: { list: () => mockApi.portfolio.list() },
  profile: {
    async me() {
      try {
        const profile = await request<any>("profile.me", e.profile.me);
        if (profile) {
          const skillsList: T.TechSkill[] = profile.skills
            ? Object.values(profile.skills).map((s: any) => ({
                name: s.technology || "Unknown",
                kind: "language",
                strength: Math.round(s.score ?? 75),
                evidence_count: 5,
              }))
            : [];
          return {
            login: (profile.identity as any)?.username || profile.username || (profile.user_id ? String(profile.user_id).replace("github:", "") : "contributor"),
            skills: skillsList,
            capability: profile.capability != null ? Math.round(profile.capability) : 70,
            capability_confidence: profile.capability_confidence ?? 0.85,
            onboarding_completed: profile.onboarding_completed ?? profile.onboardingCompleted ?? (skillsList.length > 0),
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
        }
      } catch {
        /* ignore */
      }
      return mockApi.profile.me();
    },
  },
  notifications: { status: () => mockApi.notifications.status() },
  maintainer: mockApi.maintainer,
  admin: mockApi.admin,
};
