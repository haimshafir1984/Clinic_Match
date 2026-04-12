# CLAUDE.md - ClinicMatch Project Notes

Last updated: 2026-04-12 (session 2)

## Overview

ClinicMatch is a hiring and matching platform that connects workers and businesses.
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
- Auth: JWT stored in `localStorage`
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

## Kn