# CLAUDE.md - ShiftMatch Project Notes

Last updated: 2026-08-19 (session 3)

## Overview

ShiftMatch (formerly referred to as "ClinicMatch" in early planning docs — the product is not clinic-specific) is a hiring and matching platform that connects workers and businesses.
The core flow is:

1. Login or register
2. Complete profile
3. Swipe / match
4. Open chat after mutual match
5. Manage recruitment flow
6. Show additional external jobs from public job sites

Current stack:

- Frontend: React + TypeScript + Vite + TanStack Query + Tailwind + shadcn/ui
- Backend: Express + PostgreSQL (`pg`)
- Auth: JWT stored in `localStorage`. Email OTP for all accounts except one hardcoded admin exception (`ADMIN_EMAIL`, default `haim.shafir.1@gmail.com`) which uses a bcrypt-hashed password set via `ADMIN_BOOTSTRAP_PASSWORD`. See "Changelog – Session 3" below.
- AI: OpenAI-powered profile / screening helpers
- Deployment: Render

## Current Production-Relevant State

The following major improvements were already implemented in this repository:

### 1. Core flow stabilization

- Registration flow fixed and Hebrew text normalized to UTF-8
- Matching flow fixed so reciprocal likes create matches correctly
- Chat opening flow fixed after successful match
- Messages and matches now refresh more reliably
- BigInt / text ID mismatches in PostgreSQL routes were fixed
- Guard logic around profile loading was improved so protected routes do not get stuck unnecessarily on "בודק פרופיל..."

Key areas touched:

- `backend/server.js`
- `frontend/src/pages/Swipe.tsx`
- `frontend/src/pages/Matches.tsx`
- `frontend/src/pages/Chat.tsx`
- `frontend/src/hooks/useProfile.ts`
- `frontend/src/components/auth/ProfileGuard.tsx`

### 2. Security and permission fixes

- Match / chat routes were hardened around user identity and ID handling
- Existing profile updates were separated from public profile creation behavior
- Message sending flow was aligned with authenticated user state

### 3. Profile model alignment

Frontend and backend were aligned for these fields:

- `required_position`
- `positions`
- `workplace_types`
- `description`
- `radius_km`
- `experience_years`
- `availability_date`
- `availability_days`
- `availability_hours`
- `salary_min`
- `salary_max`
- `job_type`
- `screening_questions`
- `is_auto_screener_active`
- `is_urgent`
- `avatar_url`
- `logo_url`

### 4. Media support

Added support for:

- Worker profile image upload
- Business logo upload

These are shown across profile, match, swipe, and chat UI where relevant.

### 5. Domain expansion

Additional industries were added in the same structure as the original domain system:

- `communication`
- `insurance`

This includes domain-level definitions and internal roles in:

- `frontend/src/constants/domains.ts`

### 6. Branding cleanup

Old medical-only branding references were removed where possible.
The project now uses the new logo from:

- `frontend/public`

### 7. Recruitment features added

The app now contains a stronger recruitment layer, including:

- Recruitment pipeline stages
- Talent Pool
- Interview scheduling
- Insights / analytics improvements
- Profile highlights support

Relevant backend support exists in:

- `backend/server.js`

Relevant frontend pages and hooks include:

- `frontend/src/pages/Insights.tsx`
- `frontend/src/hooks/useTalentPool.ts`
- `frontend/src/hooks/useAnalytics.ts`
- `frontend/src/hooks/useProfileHighlights.ts`

## External Jobs / Market Jobs

### What exists now

The project now supports external jobs ingestion into `market_jobs` and displays them for workers under matches.

Implemented backend pieces:

- `backend/services/marketJobsService.js`
- `backend/services/puppeteerMcpService.js`
- `backend/.puppeteerrc.cjs`

Implemented frontend pieces:

- `frontend/src/hooks/useMarketJobs.ts`
- `frontend/src/components/matches/ExternalJobCard.tsx`
- `frontend/src/pages/Matches.tsx`

### How it works now

The backend imports jobs from multiple public sources and stores them in PostgreSQL.
The worker-facing matches page can then show external jobs in addition to in-app matches.

Current sources:

- `jobmaster` — HTML scraping via `fetchHtml` + Cheerio parser
- `drushim` — HTML scraping via `fetchHtml` + Cheerio parser (best-effort)
- `alljobs` — HTML scraping via `fetchHtml` + Cheerio parser (best-effort)
- `jsearch` — JSearch API via RapidAPI (aggregates LinkedIn + Indeed + Glassdoor officially)
- `indeed` — Puppeteer MCP (disabled by default, enable via `ENABLE_PUPPETEER_SCRAPING=true`)

LinkedIn was removed as a direct scraping source because it blocks all non-browser requests.
LinkedIn jobs now come through JSearch instead.

### Required environment variables

- `JSEARCH_API_KEY` — RapidAPI key for JSearch (https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch). Free tier: 500 req/month, no credit card required.
- `ENABLE_PUPPETEER_SCRAPING` — set to `true` to enable Indeed via Puppeteer MCP (disabled by default due to Render reliability issues)

### Important behavior

- Sources run in parallel
- A single source failure does not fail the whole import
- Imported jobs are deduplicated by `source + apply_url`
- Search has a fallback mode so strict text mismatch does not always return an empty list
- Hebrew / English query normalization is basic but implemented
- If worker profile has no `positions` set, query falls back to industry Hebrew label
- `importMarketJobs` returns `{ jobs, warnings }` — warnings expose per-source failures
- `industry` filter in DB search uses `ILIKE` (case-insensitive) to avoid Hebrew/English mismatch

### Important limitation

Puppeteer / Indeed is intentionally disabled by default.
On Render's free/starter tier, Chrome availability is unreliable and the 45s timeout often fires.
Set `ENABLE_PUPPETEER_SCRAPING=true` only if Chrome is confirmed available on the server.

## Puppeteer MCP / Browser Support

The backend integrates with Puppeteer MCP for scraping-based sources (Indeed only).

Important files:

- `backend/services/puppeteerMcpService.js`
- `backend/.puppeteerrc.cjs`
- `backend/package.json`

Important notes:

- Chrome installation is handled in backend `postinstall`
- The backend uses a local project cache directory for Puppeteer browser binaries
- If one MCP source fails, import should continue with remaining sources
- **Puppeteer is disabled by default** via the `ENABLE_PUPPETEER_SCRAPING` env var. If the var is unset or not `"true"`, the Puppeteer source returns an empty result immediately without attempting to launch Chrome.

## JSearch API

JSearch is a RapidAPI-based job aggregation service that pulls live listings from LinkedIn, Indeed, Glassdoor, ZipRecruiter, and others. It replaces direct LinkedIn scraping.

Important files:

- `backend/services/jsearchService.js`

Important notes:

- Requires `JSEARCH_API_KEY` env var (RapidAPI key)
- Free tier: 500 requests/month, no credit card needed
- If the key is missing, the source returns a warning and 0 jobs without crashing
- Results are stored in `market_jobs` with `source = 'jsearch'`
- The `ExternalJobCard` component already handles the `jsearch` source label

## PostgreSQL Notes

### Required schema additions already used by the app

Profile-related additions that were introduced in the project:

- `required_position`
- `industry`
- `description`
- `radius_km`
- `experience_years`
- `availability_date`
- `availability_days`
- `availability_hours`
- `salary_min`
- `salary_max`
- `job_type`
- `avatar_url`
- `logo_url`

### External jobs table

The app expects a `market_jobs` table.
If needed in pgAdmin4, the relevant SQL should create:

- `market_jobs`
- indexes on location / job_type / industry / fetched_at / posted_at
- trigger using `set_updated_at()`

If `set_updated_at()` does not exist, create it first.

## Frontend UX Notes

### Matches page

Worker matches page now includes:

- In-app matches
- External jobs section from public sites

Business users do not use the same external jobs block.

### Hebrew / encoding

Several Hebrew UI files were normalized to UTF-8.
If Hebrew appears broken again after deploy, first suspect:

- stale service worker
- cached JS bundle
- a newly edited file saved with the wrong encoding

## Known limitations still worth improving

These are known follow-up areas, not blockers for the current codebase:

1. External jobs quality is currently strongest on `JobMaster` and `JSearch`
2. `Drushim` and `AllJobs` can be unstable depending on the HTML they return — Cheerio parsers help but sites still change
3. JSearch free tier is 500 req/month — consider upgrading if import runs frequently
4. External jobs ranking is still simple and not yet personalized deeply
5. The external jobs UI does not yet expose per-source warning details inline (warnings are logged server-side and available in `importWarnings` on the frontend hook, but not shown to the user yet)
6. Analytics are still relatively lightweight compared to a full ATS

## Recommended next steps

If continuing from the current state, the best next work items are:

1. Show `importWarnings` to the user in the UI so they can see which sources failed
2. Add a `/api/market-jobs/debug` admin-only route that runs import with test filters and returns full warnings — useful for diagnosing source failures on Render
3. Add match scoring between worker profile and external jobs
4. Add filters in the external jobs section (by location, job type, source)
5. Add background refresh / scheduled imports instead of relying only on on-demand fetches
6. Upgrade JSearch plan if 500 req/month becomes a bottleneck

## High-value files

Core backend:

- `backend/server.js`
- `backend/services/marketJobsService.js`
- `backend/services/jsearchService.js`
- `backend/services/puppeteerMcpService.js`

Core frontend:

- `frontend/src/pages/Matches.tsx`
- `frontend/src/pages/Swipe.tsx`
- `frontend/src/pages/Chat.tsx`
- `frontend/src/hooks/useProfile.ts`
- `frontend/src/hooks/useMarketJobs.ts`
- `frontend/src/lib/api.ts`
- `frontend/src/components/auth/ProfileGuard.tsx`
- `frontend/src/components/matches/ExternalJobCard.tsx`
- `frontend/src/constants/domains.ts`

## Summary

This project is no longer just a local matching app.
It now includes:

- stabilized registration / matching / chat flow
- richer recruitment capabilities
- media support for workers and businesses
- new industries
- cleaned branding
- external market jobs ingestion
- multi-source public job search: JobMaster + Drushim + AllJobs (Cheerio) + JSearch API (LinkedIn/Indeed/Glassdoor) + Indeed via Puppeteer (optional)

The current external jobs system is functional and intentionally pragmatic:
it favors "show real results now" over perfect source coverage.

## Changelog – Session 2 (2026-04-12)

### External jobs – major overhaul

Changes made in this session to fix zero-results bug:

**Backend:**
- `backend/services/jsearchService.js` — new file, JSearch RapidAPI integration (aggregates LinkedIn, Indeed, Glassdoor). Returns `{ jobs, warning }`. Requires `JSEARCH_API_KEY` env var.
- `backend/services/marketJobsService.js` — rewrote all HTML parsers from regex to Cheerio for robustness. Removed `linkedin` from `DEFAULT_PUBLIC_SOURCES` (replaced by JSearch). Added `fetchJSearchJobs` call inside `importMarketJobs`. Fixed empty-query fallback in `scrapePublicSource`. Fixed `industry` DB filter from exact match to `ILIKE`. Added `ENABLE_PUPPETEER_SCRAPING` guard.
- `backend/services/puppeteerMcpService.js` — added `ENABLE_PUPPETEER_SCRAPING` feature flag; Puppeteer is now disabled by default.
- `backend/package.json` + `package-lock.json` — added `cheerio` dependency.

**Frontend:**
- `frontend/src/hooks/useMarketJobs.ts` — fixed truncated file (hook body was missing). Improved filter building: tries `required_position` → `positions[0]` → `position` → industry Hebrew fallback. Added `importWarnings` state. Auto-refresh logic preserved.
- `frontend/src/lib/api.ts` — fixed truncated file (`importMarketJobs` function was entirely missing). Function now returns `{ jobs: MarketJob[], warnings: [...] }` matching `ImportMarketJobsResult` interface. CRLF → LF line endings normalized.

## Changelog – Session 3 (2026-08-19)

### Critical security fixes: passwordless login closed, mojibake fixed, rebrand

Starting point of this session was a full codebase audit (findings not repeated here). This session addressed the launch-blocking items from that audit.

**Auth rework — passwordless login was the #1 finding, now closed:**
- `backend/server.js` — replaced the old `POST /api/auth/login` (looked up a user by email only and issued a JWT, no credential check at all) with:
  - `POST /api/auth/login/start` `{email}` — returns `{mode: "password"}` for the admin exception, `{mode: "otp"}` for existing accounts (and sends the code), `{mode: "register"}` if no account exists.
  - `POST /api/auth/login/password` `{email, password}` — bcrypt-checked, valid **only** for the admin exception account (see below). No public route sets a password for any other account, so this can't be used to take over other users.
  - `POST /api/auth/otp/request` `{email, purpose: "login"|"register"}` — issues/resends a 6-digit code, emailed via `services/mailerService.js` (or logged to the server console if SMTP isn't configured — see `.env.example`).
  - `POST /api/auth/otp/verify` `{email, code, purpose}` — for `login`, verifies and returns a normal session JWT; for `register`, returns a short-lived (`15m`) `emailToken` proving the address was verified.
  - `POST /api/profiles` (registration) now **requires** a valid `emailToken` (header `X-Email-Verification` or body field) matching the submitted email — closes the parallel hole where anyone could register with someone else's email and get an instant session for it.
  - New tables/columns: `profiles.password_hash` (nullable, only ever set for the admin account), `login_otps` (email PK, bcrypt code hash, expiry, attempt counter, 5-attempt lockout).
  - Rate limiting added via `express-rate-limit` on all `/api/auth/*` routes (`authLimiter`) plus a stricter per-email `otpRequestLimiter` on code requests.
  - `err.message` is no longer leaked to the client on auth routes (generic Hebrew error messages instead; details still logged server-side).
- **Admin exception**: `haim.shafir.1@gmail.com` (override via `ADMIN_EMAIL` env var) is the one account that logs in with a password instead of OTP. Set/rotate it by setting `ADMIN_BOOTSTRAP_PASSWORD` in the environment and restarting the server — `ensureAdminBootstrap()` runs on every boot, hashes it with bcrypt, and upserts the admin profile (`is_admin = true`). Remove/rotate the env var after it's applied if you don't want it reapplied on every future restart.
- Frontend: `frontend/src/pages/Login.tsx` and `Register.tsx` were rewritten as multi-step flows (email → password-or-OTP for login; email → OTP → wizard for registration). `frontend/src/lib/api.ts` and `frontend/src/contexts/AuthContext.tsx` got new functions (`startLogin`, `loginWithPassword`, `requestOtp`, `verifyLoginOtp`, `verifyRegisterOtp`) replacing the old single-call `login(email)`.
- **Still needed for full production readiness**: real SMTP credentials (`SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` in `.env`) — without them OTP codes only appear in server logs, which is fine for local dev but not for real users.

**Corrupted Hebrew text fixed:**
- `backend/server.js` — `buildStrengthHighlights()` and `buildConversationSuggestions()` contained severely mojibake-corrupted Hebrew string literals (re-encoded multiple times into garbage). Rewritten with clean, correct Hebrew. Also fixed a similarly corrupted default `next_step` value in the interview-creation route.

**Rebrand: ClinicMatch → ShiftMatch:**
- Updated remaining "ClinicMatch" strings in live UI/code: `frontend/src/components/layout/TopHeader.tsx`, `Chat.tsx`, `Insights.tsx`, `frontend/src/index.css` comment, `backend/services/puppeteerMcpService.js` MCP client name, `backend/package.json` / `frontend/package.json` names.
- Old planning/presentation docs (`frontend/docs/ClinicMatch-Presentation.md`, `frontend/.lovable/plan.md`, `SHIFTMATCH_PROMPT.md`, `claude-code-market-jobs-fix.md`) were **not** touched — they're historical notes, not live product surface. Worth deleting in a later cleanup pass if they're no longer useful.
- The Render deployment URL (`clinic-match.onrender.com`, referenced in `frontend/src/lib/api.ts` and `adminApi.ts`) was left as-is since renaming the actual Render service is an infrastructure decision outside this repo, not a code change.

**Not done in this session (explicitly out of scope per user request):** payment/billing infrastructure. `profiles.is_premium` is still unwired.
