/**
 * SINGLE SOURCE OF TRUTH for Issue Pilot API paths.
 * Aligned with the Spring Boot backend (`http://localhost:8000/api`).
 */
export type Endpoint = string | null;

export type AdminSection = "crawler" | "queue" | "metrics" | "settings";

export const endpoints = {
  auth: {
    /** GET — redirects browser to GitHub OAuth 2.0 flow. */
    githubStart: "/api/auth/github/login" as Endpoint,
    /** POST { exchange_code: string } → { access_token, token_type: 'Bearer', expires_in } */
    exchange: "/api/auth/exchange" as Endpoint,
    /** GET → Current User Identity / 401 */
    me: "/api/auth/me" as Endpoint,
    /** POST { first_name, last_name, email, password } → { access_token } */
    register: "/api/auth/register" as Endpoint,
    /** POST { email, password } → { access_token } */
    login: "/api/auth/login" as Endpoint,
    /** POST → Logout confirmation */
    logout: "/api/auth/logout" as Endpoint,
  },
  onboarding: {
    /** GET → OnboardingStatusResponse */
    status: "/api/profile/onboarding" as Endpoint,
    /** POST → OnboardingStatusResponse */
    confirm: "/api/profile/onboarding/confirm" as Endpoint,
    /** POST → re-triggers GitHub profile analysis */
    retry: "/api/profile/analyze" as Endpoint,
    /** POST → OnboardingStatusResponse */
    starterProfile: "/api/profile/onboarding/confirm" as Endpoint,
  },
  recommendations: {
    /** POST /api/recommendations/personalized → 6-factor deterministic ranked recommendations */
    list: "/api/recommendations/personalized" as Endpoint,
    /** GET /api/recommendations/:id */
    detail: "/api/recommendations/:id" as Endpoint,
  },
  votes: {
    /** POST /api/votes { user_id, source, platform_issue_id, vote: 1 | -1 } */
    record: "/api/votes" as Endpoint,
    /** GET /api/votes/:userId */
    getUserVotes: "/api/votes/:userId" as Endpoint,
  },
  simulator: {
    /** GET /api/simulator/sample-data */
    sampleData: "/api/simulator/sample-data" as Endpoint,
    /** POST /api/simulator/rank */
    rank: "/api/simulator/rank" as Endpoint,
    /** GET /api/simulator/experiments */
    experiments: "/api/simulator/experiments" as Endpoint,
  },
  issues: {
    /** GET /api/issues */
    list: "/api/issues" as Endpoint,
    /** GET /api/issues/:issueId */
    detail: "/api/issues/:issueId" as Endpoint,
  },
  profile: {
    /** GET /api/profile/me */
    me: "/api/profile/me" as Endpoint,
    /** PUT /api/profile/skills/:technology */
    updateSkill: "/api/profile/skills/:technology" as Endpoint,
    /** DELETE /api/profile/skills/:technology */
    deleteSkill: "/api/profile/skills/:technology" as Endpoint,
  },
} as const;
