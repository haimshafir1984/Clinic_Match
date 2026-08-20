# Deployment

Live setup as of 2026-08-21. Everything here was configured by hand in the
Render dashboard; `render.yaml` documents it but is **not** currently the
source of truth (see "Adopting the blueprint" below).

## What runs where

| Piece | Where | Notes |
|---|---|---|
| Backend (Express) | Render web service `Clinic_Match` | `https://clinic-match.onrender.com` |
| Frontend (Vite static) | Render static site `clinic-match-frontend-x4or` | `https://clinic-match-frontend-x4or.onrender.com` |
| Database | Neon (free tier) | Postgres; replaced the expired Render DB |
| Transactional email | Resend | sends from the verified `send.flowsbiz.com` subdomain |
| DNS | Cloudflare (`flowsbiz.com`) | only the `send.*` records belong to ShiftMatch |

Both Render services are on the **free** plan, which means the backend spins
down after roughly 15 minutes idle and the next request pays a 30–60s cold
start. That is the single biggest thing standing between the landing page and
a usable first impression.

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

## Adopting the blueprint

`render.yaml` currently only documents the setup. To make it authoritative:

1. Decide on names. Render matches blueprint services **by name**; the live
   services are `Clinic_Match` and `clinic-match-frontend-x4or`, while the
   blueprint declares `shiftmatch-backend` and `shiftmatch-frontend`. Applying
   without reconciling creates a duplicate pair instead of adopting.
2. In Render, create a Blueprint pointing at this repo.
3. Re-enter every `sync: false` value in the dashboard — secrets are
   deliberately not stored in the repo.
4. Confirm the old services are gone before sending traffic, so two backends
   aren't writing to the same database.
