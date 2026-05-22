# Fix: External Jobs / Market Jobs – No Results Returning

## Context

This is the `ClinicMatch` project – a Hebrew-language hiring platform built with React + TypeScript (Vite) on the frontend and Express + PostgreSQL on the backend.

The external jobs feature (`market_jobs`) is supposed to show workers jobs scraped from public job sites. Currently it returns **zero results**. After code review, I found multiple bugs. Fix them all, and also integrate the JSearch API as a proper source for LinkedIn + Indeed jobs.

Key files:
- `backend/services/marketJobsService.js` – main scraping + DB logic
- `backend/services/puppeteerMcpService.js` – Puppeteer-based scraping (Indeed)
- `frontend/src/hooks/useMarketJobs.ts` – frontend hook
- `frontend/src/components/matches/ExternalJobCard.tsx` – UI card
- `frontend/src/pages/Matches.tsx` – shows external jobs to workers

---

## Bugs to Fix

### Bug 1 – Empty query causes zero results from all sources

**File:** `backend/services/marketJobsService.js`, function `scrapePublicSource`

The function immediately returns empty if `query` is falsy:
```js
if (!query) {
  return { jobs: [], warning: { message: "Missing search query for source" } };
}
```

But `buildSearchTerms` returns `""` when no `query` or `industry` is provided. This means a worker with an incomplete profile gets zero results even from the DB.

**Fix:** Add a fallback. If `query` is empty but `location` is provided, still attempt the search with just the location. If both are empty, use a broad default like `"עבודה"` / `"jobs"` as a last resort so at least something is returned.

Also fix the `searchMarketJobs` DB function – if a query is provided but returns 0 rows, it falls back to ignoring the query. But if the whole table is empty, neither pass helps. That's OK – the real fix is making the import work (see Bug 2 + 3).

---

### Bug 2 – Frontend hook builds empty filters silently

**File:** `frontend/src/hooks/useMarketJobs.ts`

```ts
const profilePosition = cleanFilter(profile?.position) || cleanFilter(profile?.positions?.[0]);
const profileLocation = cleanFilter(profile?.preferred_area) || cleanFilter(profile?.city) || cleanFilter(currentUser?.location);
```

If the worker profile has no `positions` filled in, `profilePosition` is `undefined`. No warning, no fallback, and the import is triggered with empty filters.

**Fix:**
1. Try more profile fields for the query: `profile?.required_position`, then `profile?.positions?.[0]`, then `profile?.position`
2. If all are empty, pass a minimal query (e.g., the worker's industry in Hebrew) so at least a broad search runs
3. Add a `hasFilters` check and log a console.warn if all filters are undefined

---

### Bug 3 – HTML parsers are brittle and likely broken

**File:** `backend/services/marketJobsService.js`

The parsers for LinkedIn, JobMaster, Drushim, and AllJobs all use fragile regex on raw HTML. Job sites change their HTML frequently, breaking these parsers silently.

**Fix for each source:**

**LinkedIn** – Remove the HTML regex parser entirely. LinkedIn actively blocks scraping and returns a login page or HTTP 999. Remove `linkedin` from `DEFAULT_PUBLIC_SOURCES`. LinkedIn jobs will now come through JSearch instead (see Bug 4 below) – JSearch already aggregates LinkedIn listings officially.

**JobMaster** – **Keep this source.** The current regex `/<article id="misra\d+"[\s\S]*?<\/article>/g` might still work, but the inner field parsers (`class="CardHeader"`, `class="font14 CompanyNameLink"`, etc.) are fragile. Install `cheerio` and rewrite `parseJobMasterJobs` using Cheerio selectors instead of regex. Use the same URL. JobMaster is the most reliable Israeli source and must stay active.

**Drushim** – **Keep this source.** Install Cheerio and rewrite `parseDrushimJobs`. The current `data-cy="job-item\d+"` split is unreliable. Use Cheerio to find `[data-cy^="job-item"]` elements and extract from there.

**AllJobs** – **Keep this source.** Keep the Radware bot-detection check but rewrite the card parser with Cheerio. The `<div class="job-listing"` selector may have changed – inspect the live HTML to confirm the right selector.

The final source list should be: **JobMaster + Drushim + AllJobs** (from `DEFAULT_PUBLIC_SOURCES`) + **JSearch** (new API call) + **Indeed via Puppeteer** (if `ENABLE_PUPPETEER_SCRAPING=true`). This gives maximum coverage from all channels simultaneously.

Install Cheerio: `npm install cheerio` in the backend.

---

### Bug 4 – Replace LinkedIn scraping with JSearch API (official aggregator)

**JSearch** is a RapidAPI-based job aggregation API that pulls real-time listings from LinkedIn, Indeed, Glassdoor, ZipRecruiter, and others. It is a legitimate licensed aggregator (not scraping) and includes Israeli jobs. Free tier: 500 requests/month. No credit card required to start.

**Setup:**
- User needs to register at https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch and get an API key
- Add env var: `JSEARCH_API_KEY=<rapidapi_key>`
- Endpoint: `GET https://jsearch.p.rapidapi.com/search`
  - Query params: `query` (string), `page` (1), `num_pages` (1), `date_posted` (all/today/3days/week/month), `country` (il for Israel)
  - Headers: `X-RapidAPI-Key: <key>`, `X-RapidAPI-Host: jsearch.p.rapidapi.com`

**Create a new file:** `backend/services/jsearchService.js`

```js
// Fetches jobs from JSearch API (RapidAPI) - aggregates LinkedIn, Indeed, Glassdoor
// Docs: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch

async function fetchJSearchJobs({ query, location, jobType, industry, limit = 10 }) {
  const apiKey = process.env.JSEARCH_API_KEY;
  if (!apiKey) {
    return { jobs: [], warning: { source: 'jsearch', message: 'JSEARCH_API_KEY not set' } };
  }

  // Build a combined search query for Israel
  const searchQuery = [query, location].filter(Boolean).join(' in ') || 'jobs in Israel';

  const params = new URLSearchParams({
    query: searchQuery,
    page: '1',
    num_pages: '1',
    country: 'il',
    date_posted: 'month',
  });

  try {
    const response = await fetch(`https://jsearch.p.rapidapi.com/search?${params}`, {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return { jobs: [], warning: { source: 'jsearch', message: `HTTP ${response.status}` } };
    }

    const data = await response.json();
    const rawJobs = (data.data || []).slice(0, limit);

    const jobs = rawJobs.map(job => ({
      source: 'jsearch',
      external_id: job.job_id || null,
      title: job.job_title || '',
      company: job.employer_name || null,
      location: job.job_city || job.job_country || location || null,
      job_type: job.job_employment_type || jobType || null,
      industry: industry || null,
      employment_type: job.job_employment_type || null,
      description: job.job_description ? job.job_description.slice(0, 500) : null,
      apply_url: job.job_apply_link || job.job_google_link || null,
      source_url: job.job_apply_link || null,
      posted_at: job.job_posted_at_datetime_utc || null,
      salary_min: job.job_min_salary ? Math.round(job.job_min_salary) : null,
      salary_max: job.job_max_salary ? Math.round(job.job_max_salary) : null,
    })).filter(j => j.title && j.apply_url);

    return { jobs, warning: null };
  } catch (error) {
    return { jobs: [], warning: { source: 'jsearch', message: error.message } };
  }
}

module.exports = { fetchJSearchJobs };
```

Then in `marketJobsService.js`, import and call `fetchJSearchJobs` inside `importMarketJobs`, alongside the other sources. Add it to the results loop the same way public sources are handled.

---

### Bug 5 – Industry filter in DB uses exact match (case-sensitive mismatch)

**File:** `backend/services/marketJobsService.js`, `searchMarketJobs` function

```js
clauses.push(`industry = $${values.length}`);
```

Jobs are stored with English industry values (e.g., `"insurance"`) but the frontend might send the Hebrew value (`"ביטוח"`) or vice versa.

**Fix:** Change to case-insensitive ILIKE:
```js
clauses.push(`industry ILIKE $${values.length}`);
```

Also add a reverse lookup: before building the DB filter, normalize the `industry` value through `INDUSTRY_ALIASES` to find the English key, and search for both the Hebrew and English version using `OR`:
```sql
(industry ILIKE $X OR industry ILIKE $Y)
```

---

### Bug 6 – No user-facing error when import fails

**File:** `frontend/src/hooks/useMarketJobs.ts`

Currently if the import fails, `error` is set but the UI (in `Matches.tsx`) may not show it clearly. The user just sees an empty list.

**Fix:** Return an `importWarnings` field from the hook that exposes the per-source warnings returned from the backend (`result.warnings`). These are already returned by the backend in `importMarketJobs` as `{ warnings: [...] }`.

In `useMarketJobs.ts`:
```ts
const [importWarnings, setImportWarnings] = useState<string[]>([]);
// in onSuccess:
onSuccess: (result) => {
  queryClient.setQueryData(queryKey, result.jobs || []);
  setImportWarnings((result.warnings || []).map(w => w.message));
}
```

Note: currently `importMarketJobsApi` in `api.ts` only extracts `response.jobs`. Fix it to also return `response.warnings` or return the full response.

---

### Bug 7 – Puppeteer/Indeed unreliable on Render

**File:** `backend/services/puppeteerMcpService.js`

On Render's free/starter tier, `npx -y @modelcontextprotocol/server-puppeteer` may fail because Chrome is not reliably available and the timeout is 45s.

**Fix (short-term):** Wrap the entire `scrapePuppeteerSource` call with a try/catch that logs clearly and continues. Also add a feature flag env var:

```js
if (!process.env.ENABLE_PUPPETEER_SCRAPING) {
  return { jobs: [], warning: { source: source.name, message: 'Puppeteer scraping disabled (set ENABLE_PUPPETEER_SCRAPING=true to enable)' } };
}
```

Default: disabled. This prevents silent failures from blocking or slowing down the import.

---

## Summary of Changes

1. **`backend/services/jsearchService.js`** – new file, JSearch API integration
2. **`backend/services/marketJobsService.js`**:
   - Remove only `linkedin` from `DEFAULT_PUBLIC_SOURCES` (JobMaster, Drushim, AllJobs stay!)
   - Import and call `fetchJSearchJobs` in `importMarketJobs` alongside the existing sources
   - Install and use `cheerio` to rewrite `parseJobMasterJobs`, `parseDrushimJobs`, `parseAllJobs`
   - Fix empty-query fallback in `scrapePublicSource`
   - Fix `industry ILIKE` in `searchMarketJobs`
3. **`backend/services/puppeteerMcpService.js`** – add `ENABLE_PUPPETEER_SCRAPING` flag
4. **`frontend/src/hooks/useMarketJobs.ts`** – better filter building, expose warnings
5. **`frontend/src/lib/api.ts`** – return full response from `importMarketJobs` (including warnings)

---

## Environment Variables Required

Add to Render dashboard (and `.env` locally):

```
JSEARCH_API_KEY=<your_rapidapi_key_for_jsearch>
ENABLE_PUPPETEER_SCRAPING=false
```

JSearch free tier: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch  
No credit card needed to start. Free = 500 requests/month.

---

## Testing After Fix

After implementing, verify each fix:

1. Add a temporary route `GET /api/market-jobs/debug` (admin-only) that runs `importMarketJobs` with fixed test filters (`query: "נציג שירות", location: "תל אביב", industry: "insurance"`) and returns the full result including `warnings` – so you can see exactly which sources work and which fail.

2. Check that JSearch returns results by calling the debug route and inspecting `jobs` where `source = "jsearch"`.

3. Check that `market_jobs` table is being populated in the DB.

4. Check the frontend: a worker with `positions: ["נציג שירות"]` and `city: "תל אביב"` should see results in the Matches page.
