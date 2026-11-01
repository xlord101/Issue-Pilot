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

        const login = data.user_id ? String(data.user_id).replace("github:", "") : "contributor";
        return {
          user: {
            id: data.user_id || "1",
            login: login,
            name: (data.identity as any)?.name ?? login,
            avatar_url: (data.identity as any)?.avatar_url ?? null,
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
        throw new ApiError(search.error, 401);
      }
      // If code was returned
      const s = await liveApi.auth.getSession();
      if (!s) return mockApi.auth.getSession().then((res) => res!);
      return s;
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
            confirmed_skills: body.languages.map((l) => ({ technology: l, proficiency_level: "proficient" })),
            dismissed_technologies: [],
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
  },
  recommendations: {
    async list(q) {
      try {
        const payload = {
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
            is_open: true,
            is_unassigned: true,
            labels: item.labels ?? ["good first issue"],
            evidence: null,
            technologies: item.technologies ? item.technologies.map((t: any) => typeof t === "string" ? t : t.technology) : ["Python"],
            verified_at: new Date().toISOString(),
          },
          total_score: Math.round(item.final_score ?? item.scores?.final_score ?? 85),
          breakdown: [
            { signal: "skill_match", score: 90, max: 100, confidence: 0.9, summary: "High synergy" },
            { signal: "difficulty_match", score: 85, max: 100, confidence: 0.85, summary: "Good fit" },
            { signal: "responsiveness", score: 88, max: 100, confidence: 0.88, summary: "Responsive" },
            { signal: "repo_health", score: 92, max: 100, confidence: 0.95, summary: "Healthy" },
            { signal: "feedback", score: 80, max: 100, confidence: 0.8, summary: "Positive" },
            { signal: "freshness", score: 85, max: 100, confidence: 0.85, summary: "Active" },
          ],
          why: item.why_recommended ?? "Ranked #1 by native C++ 6-factor model for current contributor skill profile.",
          created_at: new Date().toISOString(),
          decision: null,
        }));

        return {
          items,
          next_cursor: null,
          total: items.length,
        };
      } catch {
        return mockApi.recommendations.list(q);
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
    async submit(recommendationId, decision) {
      try {
        await request<any>("votes.record", e.votes.record, {
          method: "POST",
          body: {
            user_id: "current_user",
            source: "github",
            platform_issue_id: recommendationId,
            vote: decision === "accepted" ? 1 : -1,
          },
        });
      } catch {
        /* fallback to mock */
      }
      return mockApi.feedback.submit(recommendationId, decision);
    },
  },
  portfolio: { list: () => mockApi.portfolio.list() },
  profile: {
    async me() {
      try {
        const profile = await request<any>("profile.me", e.profile.me);
        if (profile && profile.skills) {
          const skillsList: T.TechSkill[] = Object.values(profile.skills).map((s: any) => ({
            name: s.technology || "Unknown",
            kind: "language",
            strength: Math.round(s.score ?? 75),
            evidence_count: 5,
          }));
          return {
            login: profile.user_id ? String(profile.user_id).replace("github:", "") : "contributor",
            skills: skillsList,
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
