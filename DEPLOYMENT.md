# Deployment

Live setup as of 2026-08-21. Everything here was configured by hand in the
Render dashboard; `render.yaml` documents it but is **not** currently the
source of truth (see "Adopting the blueprint" below).

## What runs where

| Piece | Where | Notes |
|---|---|---|
| Backend (Express) | Render web service `shiftmatch-backend` | `https://api.flowsbiz.com` (custom domain; `clinic-match.onrender.com` still resolves) |
| Frontend (Vite static) | Render static site `shiftmatch-frontend` | `https://app.flowsbiz.com` (custom domain; `clinic-match-frontend-x4or.onrender.com` still resolves) |
| Database | Neon (free tier) | Postgres; replaced the expired Render DB |
| Transactional email | Resend | sends from the verified `send.flowsbiz.com` subdomain |
| DNS | Cloudflare (`flowsbiz.com`) | only the `send.*` records belong to ShiftMatch |

Only the **backend** is affected by the free plan. Render static sites are
free with no spin-down, so `shiftmatch-frontend` needs no upgrade. The
free *web service* (`shiftmatch-backend`) spins down after ~15 minutes idle and
the next request pays a 30-60s cold start — that is the single biggest thing
standing between the landing page and a usable first impression, and the
only service worth paying for.

## Required environment variables (backend)

`backend/.env.example` is the full annotated list. The ones that will silently
break things if unset:

- `DATABASE_URL` — Neon pooled connection string, `sslmode=require`.
- `JWT_SECRET` — the server refuses to boot without it.
- `ALLOWED_ORIGIN` — must be the frontend origin exactly, `https://`, no
  trailing slash, or every browser request fails CORS while curl still works.
- `RESEND_API_KEY` + `RESEND_FROM` — without these no OTP email is delivered;
  codes only appear in the server log, so nobody can register.
- `ADMIN_BOOTSTRAP_PASSWORD` — sets/rotates the one password account on the
  next boot. Remove it afterwards unless you want it reapplied every restart.

## First-time database setup

`ensureExtendedSchema()` creates the newer tables on boot, but the base tables
are not auto-created. On a fresh database, run
[`shiftmatch_schema.sql`](shiftmatch_schema.sql) once in the Neon SQL editor
before pointing the backend at it. The boot-time retry loop covers the
overlap if a deploy races the migration.

## Verifying a deploy

Backend logs should show, in order:

```
ShiftMatch Backend Running on port 10000
Schema initialization completed on attempt 1
Admin bootstrap complete for <ADMIN_EMAIL>
[market-jobs] background refresh every 360 min (first run in 30s)
```

Then check the app itself, **in a private window** — the PWA service worker
otherwise serves the previous build.

## Known platform constraints (each cost real debugging time)

- **Outbound SMTP is blocked on Render's free tier** (ports 25/465/587). Gmail
  SMTP cannot work there no matter how it is configured; this is why mail goes
  through Resend's HTTPS API. Symptom was OTP requests hanging until timeout.
- **Render runs behind a proxy**, so `app.set("trust proxy", 1)` is required or
  `express-rate-limit` throws `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` on every
  request to a rate-limited route. Symptom looked like "server not responding".
- **The service worker caches aggressively.** `skipWaiting`/`clientsClaim` are
  now set, but clients that installed an older worker still need one hard
  refresh before normal refreshes pick up deploys.
- **Neon free tier scales to zero**, adding a short delay on the first query
  after idle — on top of Render's own cold start.

## Custom domain

Live since 2026-08-21. `app.flowsbiz.com` (frontend) and `api.flowsbiz.com`
(backend) are CNAMEs on the existing Cloudflare zone for `flowsbiz.com`,
independent of that domain's other records and of the `send.*` records used
by Resend. Both are Render custom domains with certificates issued, added
with proxy status **DNS only** (a proxied record blocks Render's certificate
validation).

To add another one later: Render service -> Settings -> Custom Domains ->
Add, copy the exact CNAME target Render gives you (use its copy icon — it's
truncated on screen), add it in Cloudflare as CNAME / DNS only, then Verify
in Render once DNS propagates (usually minutes, can take longer).

The old `*.onrender.com` hostnames keep working — Render doesn't remove them
when a custom domain is added — so this was a zero-downtime change; nothing
had to be cut over.

### What still points here and needed updating

- `ALLOWED_ORIGIN` (backend env, Render dashboard) -> `https://app.flowsbiz.com`
- `VITE_API_BASE_URL` (frontend env, Render dashboard) -> `https://api.flowsbiz.com/api`
  — this is baked in at build time, so setting it requires a rebuild, not just
  a restart.
- `frontend/src/lib/api.ts` and `adminApi.ts` — the fallback used when
  `VITE_API_BASE_URL` is unset, now `https://api.flowsbiz.com/api`.
- `frontend/index.html` — `og:url`, `og:image`, `twitter:image` are absolute
  URLs (crawlers fetch them server-side, won't resolve relative paths), now
  pointing at `app.flowsbiz.com`.
- The marketing landing page (published as a Claude Artifact, not in this
  repo) — its CTAs point at `app.flowsbiz.com/register`.

Re-check the link preview after this ships — WhatsApp/Facebook crawlers
cache aggressively and may still show the old host until forced to re-scrape.

## Adopting the blueprint

`render.yaml` currently only documents the setup. The live services were
renamed to `shiftmatch-backend` / `shiftmatch-frontend` to match it — Render
matches blueprint services by name, so this should let it adopt them rather
than create a duplicate pair, but confirm that (a support ticket or a
careful dry run) before relying on it, since a dashboard-created service
isn't guaranteed to be interchangeable with a blueprint-managed one.

1. In Render, create a Blueprint pointing at this repo.
2. Re-enter every `sync: false` value in the dashboard — secrets are
   deliberately not stored in the repo.
3. Confirm there's still exactly one backend and one frontend running
   afterward — if the blueprint created new services instead of adopting the
   existing ones, two backends would end up writing to the same database.
