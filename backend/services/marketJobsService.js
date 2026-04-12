const { scrapeJobsWithPuppeteer } = require("./puppeteerMcpService");

const DEFAULT_MARKET_JOB_SOURCE = {
  name: "indeed",
  urlTemplate: "https://www.indeed.com/jobs?q={{query}}&l={{location}}",
};

const MARKET_JOBS_SCHEMA_QUERIES = [
  `
    CREATE TABLE IF NOT EXISTS market_jobs (
      id BIGSERIAL PRIMARY KEY,
      source TEXT NOT NULL,
      external_id TEXT,
      title TEXT NOT NULL,
      company TEXT,
      location TEXT,
      job_type TEXT,
      industry TEXT,
      employment_type TEXT,
      description TEXT,
      apply_url TEXT NOT NULL,
      source_url TEXT,
      salary_min INTEGER,
      salary_max INTEGER,
      posted_at TIMESTAMPTZ,
      fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT unique_market_job UNIQUE (source, apply_url)
    )
  `,
  `CREATE INDEX IF NOT EXISTS idx_market_jobs_location ON market_jobs (location)`,
  `CREATE INDEX IF NOT EXISTS idx_market_jobs_job_type ON market_jobs (job_type)`,
  `CREATE INDEX IF NOT EXISTS idx_market_jobs_industry ON market_jobs (industry)`,
  `CREATE INDEX IF NOT EXISTS idx_market_jobs_posted_at ON market_jobs (posted_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_market_jobs_fetched_at ON market_jobs (fetched_at DESC)`,
  `DROP TRIGGER IF EXISTS trg_market_jobs_updated_at ON market_jobs`,
  `
    CREATE TRIGGER trg_market_jobs_updated_at
      BEFORE UPDATE ON market_jobs
      FOR EACH ROW EXECUTE FUNCTION set_updated_at()
  `,
];

async function ensureMarketJobsSchema(pool) {
  for (const query of MARKET_JOBS_SCHEMA_QUERIES) {
    await pool.query(query);
  }
}

function normalizeText(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function coerceInteger(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function coerceDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function interpolateTemplate(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => encodeURIComponent(values[key] || ""));
}

function getConfiguredSources() {
  const configured = process.env.MARKET_JOB_SOURCES_JSON;
  if (!configured) {
    return [DEFAULT_MARKET_JOB_SOURCE];
  }

  try {
    const parsed = JSON.parse(configured);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [DEFAULT_MARKET_JOB_SOURCE];
    }

    return parsed
      .map((source) => ({
        name: normalizeText(source.name),
        urlTemplate: normalizeText(source.urlTemplate),
        extractorScript: normalizeText(source.extractorScript),
      }))
      .filter((source) => source.name && source.urlTemplate);
  } catch (_error) {
    return [DEFAULT_MARKET_JOB_SOURCE];
  }
}

function buildExtractorScript({ sourceName, filters, limit }) {
  const fallbackLocation = JSON.stringify(filters.location || "");
  const fallbackJobType = JSON.stringify(filters.jobType || "");
  const fallbackIndustry = JSON.stringify(filters.industry || "");

  return `
    (() => {
      const limit = ${Number(limit) || 20};
      const source = ${JSON.stringify(sourceName)};
      const fallbackLocation = ${fallbackLocation};
      const fallbackJobType = ${fallbackJobType};
      const fallbackIndustry = ${fallbackIndustry};

      const clean = (value) => (typeof value === "string" ? value.replace(/\\s+/g, " ").trim() : "");
      const absoluteUrl = (href) => {
        try {
          return href ? new URL(href, window.location.href).href : null;
        } catch (_error) {
          return null;
        }
      };

      const extractFromCard = (card) => {
        const link =
          card.querySelector('a[href*="/viewjob"]') ||
          card.querySelector('a[href*="jk="]') ||
          card.querySelector("h2 a") ||
          card.querySelector("a");

        const titleNode =
          card.querySelector("h2 span") ||
          card.querySelector("h2") ||
          card.querySelector("[data-testid='jobTitle']") ||
          link;

        const companyNode =
          card.querySelector("[data-testid='company-name']") ||
          card.querySelector(".companyName") ||
          card.querySelector("[class*='company']");

        const locationNode =
          card.querySelector("[data-testid='text-location']") ||
          card.querySelector(".companyLocation") ||
          card.querySelector("[class*='location']");

        const descriptionNode =
          card.querySelector("[data-testid='job-snippet']") ||
          card.querySelector(".job-snippet") ||
          card.querySelector("[class*='snippet']");

        const postedNode =
          card.querySelector("time") ||
          card.querySelector("[data-testid='myJobsStateDate']") ||
          card.querySelector("[class*='date']");

        const title = clean(titleNode?.textContent);
        const applyUrl = absoluteUrl(link?.href);

        if (!title || !applyUrl) {
          return null;
        }

        return {
          source,
          external_id: clean(card.getAttribute("data-jk") || link?.getAttribute("data-jk")),
          title,
          company: clean(companyNode?.textContent),
          location: clean(locationNode?.textContent) || fallbackLocation || null,
          job_type: fallbackJobType || null,
          industry: fallbackIndustry || null,
          employment_type: null,
          description: clean(descriptionNode?.textContent),
          apply_url: applyUrl,
          source_url: window.location.href,
          posted_at: clean(postedNode?.getAttribute("datetime") || postedNode?.textContent),
          salary_min: null,
          salary_max: null,
        };
      };

      const cards = Array.from(
        document.querySelectorAll(
          "article, .job_seen_beacon, .jobsearch-SerpJobCard, li[data-testid='job-card'], [data-jk]"
        )
      );

      let jobs = cards.map(extractFromCard).filter(Boolean);

      if (!jobs.length) {
        jobs = Array.from(document.querySelectorAll("a[href]"))
          .map((link) => {
            const href = absoluteUrl(link.href);
            const text = clean(link.textContent);
            if (!href || !text) return null;
            if (!/job|career|position|opening|viewjob|jk=/i.test(href)) return null;

            return {
              source,
              external_id: null,
              title: text,
              company: null,
              location: fallbackLocation || null,
              job_type: fallbackJobType || null,
              industry: fallbackIndustry || null,
              employment_type: null,
              description: null,
              apply_url: href,
              source_url: window.location.href,
              posted_at: null,
              salary_min: null,
              salary_max: null,
            };
          })
          .filter(Boolean);
      }

      return JSON.stringify(jobs.slice(0, limit));
    })();
  `;
}

function normalizeImportedJob(job, filters, sourceName) {
  const applyUrl = normalizeText(job.apply_url);
  const title = normalizeText(job.title);

  if (!applyUrl || !title) {
    return null;
  }

  return {
    source: normalizeText(job.source) || sourceName,
    external_id: normalizeText(job.external_id),
    title,
    company: normalizeText(job.company),
    location: normalizeText(job.location) || filters.location || null,
    job_type: normalizeText(job.job_type) || filters.jobType || null,
    industry: normalizeText(job.industry) || filters.industry || null,
    employment_type: normalizeText(job.employment_type),
    description: normalizeText(job.description),
    apply_url: applyUrl,
    source_url: normalizeText(job.source_url),
    salary_min: coerceInteger(job.salary_min),
    salary_max: coerceInteger(job.salary_max),
    posted_at: coerceDate(job.posted_at),
    raw_payload: job,
  };
}

async function upsertMarketJob(pool, job) {
  const result = await pool.query(
    `
      INSERT INTO market_jobs (
        source,
        external_id,
        title,
        company,
        location,
        job_type,
        industry,
        employment_type,
        description,
        apply_url,
        source_url,
        salary_min,
        salary_max,
        posted_at,
        fetched_at,
        raw_payload
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW(),$15::jsonb)
      ON CONFLICT (source, apply_url) DO UPDATE
      SET
        external_id = EXCLUDED.external_id,
        title = EXCLUDED.title,
        company = EXCLUDED.company,
        location = EXCLUDED.location,
        job_type = EXCLUDED.job_type,
        industry = EXCLUDED.industry,
        employment_type = EXCLUDED.employment_type,
        description = EXCLUDED.description,
        source_url = EXCLUDED.source_url,
        salary_min = EXCLUDED.salary_min,
        salary_max = EXCLUDED.salary_max,
        posted_at = EXCLUDED.posted_at,
        fetched_at = NOW(),
        raw_payload = EXCLUDED.raw_payload,
        updated_at = NOW()
      RETURNING *
    `,
    [
      job.source,
      job.external_id,
      job.title,
      job.company,
      job.location,
      job.job_type,
      job.industry,
      job.employment_type,
      job.description,
      job.apply_url,
      job.source_url,
      job.salary_min,
      job.salary_max,
      job.posted_at,
      JSON.stringify(job.raw_payload || {}),
    ]
  );

  return result.rows[0];
}

async function importMarketJobs(pool, filters = {}) {
  const normalizedFilters = {
    query: normalizeText(filters.query) || "",
    location: normalizeText(filters.location) || "",
    industry: normalizeText(filters.industry) || "",
    jobType: normalizeText(filters.jobType || filters.job_type) || "",
  };

  const limit = Math.min(Math.max(coerceInteger(filters.limit) || 20, 1), 50);
  const sources = getConfiguredSources();
  const importedJobs = [];
  const warnings = [];

  for (const source of sources) {
    const searchQuery = [normalizedFilters.query, normalizedFilters.industry, normalizedFilters.jobType]
      .filter(Boolean)
      .join(" ")
      .trim();

    const url = interpolateTemplate(source.urlTemplate, {
      query: searchQuery,
      location: normalizedFilters.location,
      industry: normalizedFilters.industry,
      jobType: normalizedFilters.jobType,
    });

    const extractorScript = source.extractorScript || buildExtractorScript({
      sourceName: source.name,
      filters: normalizedFilters,
      limit,
    });

    let scrapedJobs = [];
    try {
      scrapedJobs = await scrapeJobsWithPuppeteer({ url, extractorScript });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown market jobs scraping error";
      warnings.push({ source: source.name, message });
      console.error(`[market-jobs] source "${source.name}" failed:`, message);
      continue;
    }

    for (const rawJob of scrapedJobs) {
      const normalizedJob = normalizeImportedJob(rawJob, normalizedFilters, source.name);
      if (!normalizedJob) continue;
      const savedJob = await upsertMarketJob(pool, normalizedJob);
      importedJobs.push(savedJob);
    }
  }

  return {
    importedCount: importedJobs.length,
    jobs: importedJobs,
    filters: normalizedFilters,
    warnings,
  };
}

async function searchMarketJobs(pool, filters = {}) {
  const values = [];
  const clauses = [];
  const limit = Math.min(Math.max(coerceInteger(filters.limit) || 20, 1), 100);

  const query = normalizeText(filters.query);
  if (query) {
    values.push(`%${query}%`);
    clauses.push(`(title ILIKE $${values.length} OR company ILIKE $${values.length} OR description ILIKE $${values.length})`);
  }

  const location = normalizeText(filters.location);
  if (location) {
    values.push(`%${location}%`);
    clauses.push(`location ILIKE $${values.length}`);
  }

  const industry = normalizeText(filters.industry);
  if (industry) {
    values.push(industry);
    clauses.push(`industry = $${values.length}`);
  }

  const jobType = normalizeText(filters.jobType || filters.job_type);
  if (jobType) {
    values.push(jobType);
    clauses.push(`job_type = $${values.length}`);
  }

  values.push(limit);
  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

  const result = await pool.query(
    `
      SELECT
        id,
        source,
        external_id,
        title,
        company,
        location,
        job_type,
        industry,
        employment_type,
        description,
        apply_url,
        source_url,
        salary_min,
        salary_max,
        posted_at,
        fetched_at,
        created_at,
        updated_at
      FROM market_jobs
      ${whereClause}
      ORDER BY COALESCE(posted_at, fetched_at) DESC, id DESC
      LIMIT $${values.length}
    `,
    values
  );

  return result.rows;
}

module.exports = {
  ensureMarketJobsSchema,
  importMarketJobs,
  searchMarketJobs,
};
