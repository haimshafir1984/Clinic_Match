const { importMarketJobs, pruneStaleMarketJobs } = require("./marketJobsService");

// Background refresh for the external-jobs feed.
//
// Before this existed, market_jobs was only ever populated when a user landed
// on the matches page with an empty result — which meant that user paid for a
// live scrape of every source (up to ~60s) before seeing anything. Keeping the
// table warm in the background lets the request path be a plain DB read.
//
// Scheduled runs deliberately skip JSearch (see importMarketJobs): its free
// tier is 500 requests/month and one import spends up to 4, so an unattended
// loop would exhaust it within days. The unmetered HTML sources carry the
// scheduled refresh; JSearch stays available for user-triggered imports.

const DEFAULT_INTERVAL_MINUTES = 360; // 6h
const STARTUP_DELAY_MS = 30_000;

// Broad, high-traffic combinations rather than any one user's filters. Location
// is left empty so sources return country-wide results, which is what a shared
// warm cache wants.
const DEFAULT_SEEDS = [
  { industry: "medical", query: "" },
  { industry: "communication", query: "" },
  { industry: "insurance", query: "" },
];

let timer = null;
let running = false;

function isEnabled() {
  return process.env.MARKET_JOBS_REFRESH_ENABLED !== "false";
}

function getIntervalMs() {
  const minutes =
    Number.parseInt(process.env.MARKET_JOBS_REFRESH_INTERVAL_MINUTES || "", 10) ||
    DEFAULT_INTERVAL_MINUTES;
  return Math.max(15, minutes) * 60 * 1000;
}

function getSeeds() {
  const raw = process.env.MARKET_JOBS_REFRESH_SEEDS;
  if (!raw) return DEFAULT_SEEDS;

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    console.warn("[market-jobs] MARKET_JOBS_REFRESH_SEEDS must be a non-empty array — using defaults.");
  } catch (err) {
    console.warn("[market-jobs] MARKET_JOBS_REFRESH_SEEDS is not valid JSON — using defaults.", err.message);
  }
  return DEFAULT_SEEDS;
}

async function runRefreshCycle(pool) {
  // Overlapping cycles would double-scrape the same sources; if the previous
  // run is still going (slow sources), skip this tick rather than queueing.
  if (running) {
    console.log("[market-jobs] previous refresh still running — skipping this cycle");
    return;
  }

  running = true;
  const startedAt = Date.now();
  let totalImported = 0;

  try {
    for (const seed of getSeeds()) {
      try {
        const result = await importMarketJobs(
          pool,
          { ...seed, limit: 30 },
          { includeJSearch: false }
        );
        totalImported += result.importedCount || 0;

        for (const warning of result.warnings || []) {
          console.warn(
            `[market-jobs] scheduled refresh warning (${seed.industry || seed.query || "all"}): ${warning.source} — ${warning.message}`
          );
        }
      } catch (err) {
        // One bad seed must not abort the rest of the cycle.
        console.error(
          `[market-jobs] scheduled refresh failed for seed ${JSON.stringify(seed)}:`,
          err.message
        );
      }
    }

    await pruneStaleMarketJobs(pool).catch((err) => {
      console.error("[market-jobs] prune during refresh failed:", err.message);
    });

    const seconds = Math.round((Date.now() - startedAt) / 1000);
    console.log(`[market-jobs] scheduled refresh done — ${totalImported} listing(s) in ${seconds}s`);
  } finally {
    running = false;
  }
}

function startMarketJobsScheduler(pool) {
  if (!isEnabled()) {
    console.log("[market-jobs] background refresh disabled (MARKET_JOBS_REFRESH_ENABLED=false)");
    return null;
  }
  if (timer) return timer;

  const intervalMs = getIntervalMs();
  console.log(
    `[market-jobs] background refresh every ${Math.round(intervalMs / 60000)} min (first run in ${STARTUP_DELAY_MS / 1000}s)`
  );

  // Delay the first run so it never competes with schema init / admin
  // bootstrap on a cold boot.
  const startupTimer = setTimeout(() => {
    runRefreshCycle(pool).catch((err) => {
      console.error("[market-jobs] initial refresh failed:", err);
    });
  }, STARTUP_DELAY_MS);
  startupTimer.unref?.();

  timer = setInterval(() => {
    runRefreshCycle(pool).catch((err) => {
      console.error("[market-jobs] scheduled refresh failed:", err);
    });
  }, intervalMs);
  // Don't hold the event loop open on shutdown.
  timer.unref?.();

  return timer;
}

function stopMarketJobsScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = { startMarketJobsScheduler, stopMarketJobsScheduler, runRefreshCycle };
