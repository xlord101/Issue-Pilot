# Issue Pilot — web frontend

UI for Issue Pilot: discover live, unclaimed open-source issues across GitHub, GitLab, Codeberg/Gitea and Bugzilla, matched to a contributor's demonstrated skills. Maintainers approve AI-suggested triage labels; nothing is written externally without an explicit approval click.

**This is frontend only.** Auth, scoring, verification, and persistence live in the Spring Boot 3.4.3 (Java 21) backend + C++ Ranking Engine + MongoDB Atlas. The browser never scores or verifies issues, never runs OAuth itself, and never stores tokens.

## Stack
TanStack Start (React 19, Vite, file-based routing), TanStack Query, Tailwind v4, shadcn/ui. Everything under `src/lib/api`, `src/components/ip` and `src/routes` is portable to the parent project's `web/` folder.

## Env vars (`.env.example`)
| Var | Meaning |
| --- | --- |
| `VITE_API_BASE_URL` | Spring Boot backend base URL, e.g. `http://localhost:8000` |
| `VITE_USE_MOCK_API` | `true` (default) = demo fixtures labelled "Demo data"; `false` = live backend |

## Routes
Public: `/`, `/login`, `/auth/callback`, `/onboarding`
Contributor (gated): `/app/feed`, `/app/recommendations/:id`, `/app/profile`, `/app/feedback`, `/app/portfolio`, `/app/guide`, `/app/settings`
Maintainer (role `maintainer`): `/maintainer/repos`, `/maintainer/triage`, `/maintainer/history`
Admin (role `admin`, hidden from nav otherwise): `/admin`, `/admin/sources`, `/admin/jobs`, `/admin/users`, `/admin/repos`, `/admin/scoring`, `/admin/audit`

Gates are UI-only; the backend must enforce authorization on every request.

## API layer — `src/lib/api/`
- `index.ts` — `api` object + `IssuePilotApi` interface. Components import only this.
- `endpoints.ts` — **every backend path in one place.** `null` = not built yet → UI shows "Not connected yet". Contracts documented inline.
- `types.ts` — data contracts (`NormalizedIssue`, `Recommendation`, `SignalScore`, …). All optional backend fields are nullable.
- `http.ts` — the only `fetch()`; sends `credentials: "include"` for the httpOnly session cookie. 404/501 → `NotConnectedError`.
- `live.ts` / `mock/` — live and demo implementations of the same interface.

### Labels contract
`labels: null` → the source has no label concept (Bugzilla). `labels: []` → labels supported, none set. The UI renders these differently and never coerces one into the other.

### Scores
Final model: Score(u,i) = 0.35·Skill Match + 0.25·Difficulty Match + 0.15·Responsiveness + 0.10·Repo Health + 0.10·Feedback + 0.05·Freshness; every signal and the total are 0–100 and contributor-relative. Labels are supporting evidence only. Onboarding falls back to a starter questionnaire (`POST onboarding.starterProfile`, not built yet) when GitHub evidence is insufficient. The UI only displays `total_score` and `breakdown[]` from the backend. `confidence` on each `SignalScore` is per (source, signal).

## Auth flow (live)
1. `/login` → browser redirects to `VITE_API_BASE_URL + endpoints.auth.githubStart?redirect_uri=<origin>/auth/callback`.
2. Backend completes GitHub OAuth, sets an httpOnly cookie, redirects to `/auth/callback?status=success` (or `status=error&error=<code>`).
3. Callback calls `endpoints.auth.me` to confirm the session, then routes to `/onboarding`.

Mock mode uses an obvious "demo sign-in" (a sessionStorage boolean flag, not a credential).

## Switching to the real backend
1. Set `VITE_USE_MOCK_API=false` and `VITE_API_BASE_URL=http://localhost:8000`.
2. Configure CORS on Spring Boot (`WebConfig`) with `allowCredentials=true` and the frontend origin.
3. Use `/api/recommendations/personalized` for live 6-factor issue feeds with live zero-assignment verification.

## Backend endpoints still needed
`auth.me`, `auth.logout`, `onboarding.status`, `onboarding.retry`, `profile.me`, `notifications.status`, `maintainer.repos`, `maintainer.registerRepo`, `maintainer.triageDecision`, `maintainer.history`, all `admin.*`. Confirm path of `auth.githubStart` and `recommendations.detail`.
