const { scrapeJobsWithPuppeteer } = require("./puppeteerMcpService");

const USER_AGENT =
  process.env.MARKET_JOBS_USER_AGENT ||
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const DEFAULT_PUPPETEER_SOURCE = {
  name: "indeed",
  locale: "en",
  urlTemplate: "https://www.indeed.com/jobs?q={{query}}&l={{location}}",
};

const DEFAULT_PUBLIC_SOURCES = [
  {
    name: "linkedin",
    locale: "en",
    includeIndustry: false,
    buildUrl: ({ query, location }) =>
      `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}`,
    parser: parseLinkedInJobs,
  },
  {
    name: "jobmaster",
    locale: "he",
    includeIndustry: true,
    buildUrl: ({ query, location }) =>
      `https://www.jobmaster.co.il/jobs/?q=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}`,
    parser: parseJobMasterJobs,
  },
  {
    name: "drushim",
    locale: "he",
    includeIndustry: false,
    buildUrl: ({ query, location }) =>
      `https://www.drushim.co.il/jobs/search/${encodeURIComponent(query)}/${encodeURIComponent(location)}/`,
    parser: parseDrushimJobs,
  },
  {
    name: "alljobs",
    locale: "he",
    includeIndustry: false,
    buildUrl: ({ query }) =>
      `https://www.alljobs.co.il/SearchResultsGuest.aspx?position=${encodeURIComponent(query)}&region=&type=&city=`,
    parser: parseAllJobs,
  },
];

const LOCATION_ALIASES = {
  "תל אביב": { he: "תל אביב", en: "Tel Aviv" },
  "תל אביב יפו": { he: "תל אביב יפו", en: "Tel Aviv-Yafo" },
  "חיפה": { he: "חיפה", en: "Haifa" },
  "ירושלים": { he: "ירושלים", en: "Jerusalem" },
  "רעננה": { he: "רעננה", en: "Raanana" },
  "פתח תקווה": { he: "פתח תקווה", en: "Petah Tikva" },
  "ראשון לציון": { he: "ראשון לציון", en: "Rishon LeZion" },
  "באר שבע": { he: "באר שבע", en: "Beer Sheva" },
  "אשדוד": { he: "אשדוד", en: "Ashdod" },
  "נתניה": { he: "נתניה", en: "Netanya" },
  "רמת גן": { he: "רמת גן", en: "Ramat Gan" },
  "remote": { he: "עבודה מהבית", en: "Remote" },
};

const JOB_QUERY_ALIASES = [
  { match: /נציג(?:\/ת)? שירות|שירות לקוחות|customer service/i, he: "נציג שירות", en: "customer service representative" },
  { match: /מוקד|call center/i, he: "מוקדן", en: "call center representative" },
  { match: /מכירות|sales/i, he: "נציג מכירות", en: "sales representative" },
  { match: /ביטוח|insurance/i, he: "ביטוח", en: "insurance" },
  { match: /תקשורת|telecom|communication/i, he: "תקשורת", en: "telecommunications" },
  { match: /אדמינ|מזכיר|פקיד|office/i, he: "אדמיניסטרציה", en: "office administration" },
  { match: /מתאם|רכז/i, he: "רכז שירות", en: "coordinator" },
  { match: /qa/i, he: "בודק תוכנה", en: "qa engineer" },
  { match: /support/i, he: "תמיכה", en: "support" },
];

const INDUSTRY_ALIASES = {
  insurance: { he: "ביטוח", en: "insurance" },
  communication: { he: "תקשורת", en: "telecommunications" },
  retail: { he: "קמעונאות", en: "retail" },
  hospitality: { he: "אירוח", en: "hospitality" },
  technology: { he: "טכנולוגיה", en: "technology" },
  healthcare: { he: "רפואה", en: "healthcare" },
};

const JOB_TYPE_ALIASES = {
  daily: { he: "עבודה יומית", en: "daily" },
  temporary: { he: "עבודה זמנית", en: "temporary" },
  permanent: { he: "משרה מלאה", en: "full time" },
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

function decodeHtml(value) {
  if (!value) return "";

  return value
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCharCode(Number.parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function stripTags(value) {
  return decodeHtml(String(value || ""))
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function absoluteUrl(baseUrl, href) {
  try {
    return href ? new URL(href, baseUrl).href : null;
  } catch (_error) {
    return null;
  }
}

function uniqueValues(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function interpolateTemplate(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => encodeURIComponent(values[key] || ""));
}

function getLocaleLocation(location, locale) {
  const normalized = normalizeText(location);
  if (!normalized) return "";
  const alias = LOCATION_ALIASES[normalized];
  if (alias) {
    return locale === "he" ? alias.he : alias.en;
  }
  return normalized;
}

function getQueryAlias(value, locale) {
  const normalized = normalizeText(value);
  if (!normalized) return "";

  const alias = JOB_QUERY_ALIASES.find((item) => item.match.test(normalized));
  if (alias) {
    return locale === "he" ? alias.he : alias.en;
  }

  return normalized;
}

function getIndustryAlias(value, locale) {
  const normalized = normalizeText(value);
  if (!normalized) return "";
  const alias = INDUSTRY_ALIASES[normalized.toLowerCase()];
  return alias ? (locale === "he" ? alias.he : alias.en) : normalized;
}

function getJobTypeAlias(value, locale) {
  const normalized = normalizeText(value);
  if (!normalized) return "";
  const alias = JOB_TYPE_ALIASES[normalized.toLowerCase()];
  return alias ? (locale === "he" ? alias.he : alias.en) : normalized;
}

function buildSearchTerms(filters, locale, options = {}) {
  const { includeIndustry = true } = options;
  const primaryRole = getQueryAlias(filters.query, locale);
  const industry = getIndustryAlias(filters.industry, locale);

  if (includeIndustry && primaryRole && industry && !primaryRole.toLowerCase().includes(industry.toLowerCase())) {
    return `${primaryRole} ${industry}`.trim();
  }

  return primaryRole || industry || getJobTypeAlias(filters.jobType, locale) || "";
}

function getConfiguredPuppeteerSources() {
  const configured = process.env.MARKET_JOB_SOURCES_JSON;
  if (!configured) {
    return [DEFAULT_PUPPETEER_SOURCE];
  }

  try {
    const parsed = JSON.parse(configured);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [DEFAULT_PUPPETEER_SOURCE];
    }

    return parsed
      .map((source) => ({
        name: normalizeText(source.name),
        locale: normalizeText(source.locale) || "en",
        urlTemplate: normalizeText(source.urlTemplate),
        extractorScript: normalizeText(source.extractorScript),
      }))
      .filter((source) => source.name && source.urlTemplate);
  } catch (_error) {
    return [DEFAULT_PUPPETEER_SOURCE];
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

async function fetchHtml(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      signal: controller.signal,
    });

    return {
      ok: response.ok,
      status: response.status,
      text: await response.text(),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseLinkedInJobs(html, context) {
  const cards = html.match(/<div class="base-card[\s\S]*?<\/div>\s*<\/div>\s*<\/li>/g) || [];
  const jobs = [];

  for (const card of cards.slice(0, context.limit)) {
    const href = absoluteUrl(context.url, decodeHtml(card.match(/class="base-card__full-link[^"]*"[^>]*href="([^"]+)"/)?.[1] || ""));
    const title = stripTags(card.match(/class="base-search-card__title[\s\S]*?>([\s\S]*?)<\/h3>/)?.[1] || "");
    const company = stripTags(card.match(/class="base-search-card__subtitle[\s\S]*?>([\s\S]*?)<\/h4>/)?.[1] || "");
    const location = stripTags(card.match(/class="job-search-card__location[\s\S]*?>([\s\S]*?)<\/span>/)?.[1] || "") || context.filters.location;
    const postedAt = stripTags(card.match(/<time[^>]*datetime="([^"]+)"/)?.[1] || card.match(/<time[^>]*>([\s\S]*?)<\/time>/)?.[1] || "");
    const externalId = card.match(/urn:li:jobPosting:(\d+)/)?.[1] || card.match(/jobs\/view\/[^-]+-(\d+)/)?.[1] || null;

    if (!href || !title) continue;

    jobs.push({
      source: "linkedin",
      external_id: externalId,
      title,
      company,
      location,
      job_type: context.filters.jobType || null,
      industry: context.filters.industry || null,
      employment_type: null,
      description: null,
      apply_url: href,
      source_url: context.url,
      posted_at: postedAt,
      salary_min: null,
      salary_max: null,
    });
  }

  return jobs;
}

function parseJobMasterJobs(html, context) {
  const cards = html.match(/<article id="misra\d+"[\s\S]*?<\/article>/g) || [];
  const jobs = [];

  for (const card of cards.slice(0, context.limit)) {
    const href = absoluteUrl(context.url, decodeHtml(card.match(/class="CardHeader[\s\S]*?href=['"]([^'"]+)['"]/i)?.[1] || ""));
    const title = stripTags(card.match(/class="CardHeader[\s\S]*?>([\s\S]*?)<\/a>/i)?.[1] || "");
    const company = stripTags(card.match(/class="font14 CompanyNameLink"[\s\S]*?<span>([\s\S]*?)<\/span>/i)?.[1] || "");
    const location = stripTags(card.match(/class="jobLocation"[\s\S]*?<span>([\s\S]*?)<\/span>/i)?.[1] || "") || context.filters.location;
    const jobType = stripTags(card.match(/class="jobType"[\s\S]*?>([\s\S]*?)<\/li>/i)?.[1] || "") || context.filters.jobType;
    const description = stripTags(card.match(/class="jobShortDescription[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1] || "");
    const postedAt = stripTags(card.match(/<span class="Gray">([\s\S]*?)<\/span>/i)?.[1] || "");
    const externalId = card.match(/id="misra(\d+)"/i)?.[1] || card.match(/applyJob\((\d+),null\)/)?.[1] || null;

    if (!href || !title) continue;

    jobs.push({
      source: "jobmaster",
      external_id: externalId,
      title,
      company,
      location,
      job_type: jobType || null,
      industry: context.filters.industry || null,
      employment_type: null,
      description: description || null,
      apply_url: href,
      source_url: context.url,
      posted_at: postedAt,
      salary_min: null,
      salary_max: null,
    });
  }

  return jobs;
}

function parseDrushimJobs(html, context) {
  const chunks = html.split(/data-cy="job-item\d+"/).slice(1);
  const jobs = [];

  for (const chunk of chunks.slice(0, context.limit)) {
    const block = chunk.slice(0, 5000);
    const href = absoluteUrl(context.url, decodeHtml(block.match(/<a href="([^"]*\/job\/[^"]+)"/i)?.[1] || ""));
    const title = stripTags(block.match(/class="job-url[^"]*"[^>]*>([\s\S]*?)<\/span>/i)?.[1] || "");
    const company = stripTags(block.match(/class="display-22[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i)?.[1] || "");
    const location = context.filters.location || null;
    const externalId = block.match(/listingid="(\d+)"/i)?.[1] || block.match(/\/job\/(\d+)/i)?.[1] || null;
    const description = stripTags(block.match(/class="display-18 region-item"[\s\S]*?>([\s\S]*?)<\/span>/i)?.[1] || "");

    if (!href || !title) continue;

    jobs.push({
      source: "drushim",
      external_id: externalId,
      title,
      company,
      location,
      job_type: context.filters.jobType || null,
      industry: context.filters.industry || null,
      employment_type: null,
      description: description || null,
      apply_url: href,
      source_url: context.url,
      posted_at: null,
      salary_min: null,
      salary_max: null,
    });
  }

  return jobs;
}

function parseAllJobs(html, context) {
  if (/Radware Page/i.test(html)) {
    throw new Error("AllJobs returned a protection page");
  }

  const cards = html.match(/<div class="job-listing"[\s\S]*?<\/div>\s*<\/div>/g) || [];
  const jobs = [];

  for (const card of cards.slice(0, context.limit)) {
    const href = absoluteUrl(context.url, decodeHtml(card.match(/<a href="([^"]+)"/i)?.[1] || ""));
    const title = stripTags(card.match(/<h\d[^>]*>([\s\S]*?)<\/h\d>/i)?.[1] || "");
    const company = stripTags(card.match(/class="company[^"]*"[^>]*>([\s\S]*?)<\/span>/i)?.[1] || "");
    if (!href || !title) continue;

    jobs.push({
      source: "alljobs",
      external_id: null,
      title,
      company,
      location: context.filters.location || null,
      job_type: context.filters.jobType || null,
      industry: context.filters.industry || null,
      employment_type: null,
      description: null,
      apply_url: href,
      source_url: context.url,
      posted_at: null,
      salary_min: null,
      salary_max: null,
    });
  }

  return jobs;
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

async function scrapePublicSource(source, filters, limit) {
  const query = buildSearchTerms(filters, source.locale, { includeIndustry: source.includeIndustry !== false });
  const location = getLocaleLocation(filters.location, source.locale);

  if (!query) {
    return { jobs: [], warning: { source: source.name, message: "Missing search query for source" } };
  }

  const url = source.buildUrl({ query, location, filters });
  let response;

  try {
    response = await fetchHtml(url);
  } catch (error) {
    return {
      jobs: [],
      warning: {
        source: source.name,
        message: error instanceof Error ? error.message : "Failed to fetch source HTML",
      },
    };
  }

  const { ok, status, text } = response;

  if (!ok) {
    return { jobs: [], warning: { source: source.name, message: `HTTP ${status}` } };
  }

  try {
    return {
      jobs: source.parser(text, { filters, limit, url }),
      warning: null,
    };
  } catch (error) {
    return {
      jobs: [],
      warning: {
        source: source.name,
        message: error instanceof Error ? error.message : "Failed to parse source HTML",
      },
    };
  }
}

async function scrapePuppeteerSource(source, filters, limit) {
  const query = buildSearchTerms(filters, source.locale || "en", { includeIndustry: source.includeIndustry !== false });
  const location = getLocaleLocation(filters.location, source.locale || "en");
  const url = interpolateTemplate(source.urlTemplate, {
    query,
    location,
    industry: getIndustryAlias(filters.industry, source.locale || "en"),
    jobType: getJobTypeAlias(filters.jobType, source.locale || "en"),
  });

  const extractorScript = source.extractorScript || buildExtractorScript({
    sourceName: source.name,
    filters,
    limit,
  });

  try {
    const jobs = await scrapeJobsWithPuppeteer({ url, extractorScript });
    return { jobs, warning: null };
  } catch (error) {
    return {
      jobs: [],
      warning: {
        source: source.name,
        message: error instanceof Error ? error.message : "Unknown market jobs scraping error",
      },
    };
  }
}

async function importMarketJobs(pool, filters = {}) {
  const normalizedFilters = {
    query: normalizeText(filters.query) || "",
    location: normalizeText(filters.location) || "",
    industry: normalizeText(filters.industry) || "",
    jobType: normalizeText(filters.jobType || filters.job_type) || "",
  };

  const limit = Math.min(Math.max(coerceInteger(filters.limit) || 20, 1), 50);
  const importedJobs = [];
  const warnings = [];
  const seen = new Set();

  const publicResults = await Promise.all(
    DEFAULT_PUBLIC_SOURCES.map(async (source) => ({
      source,
      result: await scrapePublicSource(source, normalizedFilters, limit),
    }))
  );

  for (const { source, result } of publicResults) {
    if (result.warning) {
      warnings.push(result.warning);
      console.error(`[market-jobs] source "${source.name}" failed:`, result.warning.message);
    }

    for (const rawJob of result.jobs) {
      const normalizedJob = normalizeImportedJob(rawJob, normalizedFilters, source.name);
      if (!normalizedJob) continue;
      const dedupeKey = `${normalizedJob.source}:${normalizedJob.apply_url}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      const savedJob = await upsertMarketJob(pool, normalizedJob);
      importedJobs.push(savedJob);
    }
  }

  const puppeteerSources = getConfiguredPuppeteerSources();
  const puppeteerResults = await Promise.all(
    puppeteerSources.map(async (source) => ({
      source,
      result: await scrapePuppeteerSource(source, normalizedFilters, limit),
    }))
  );

  for (const { source, result } of puppeteerResults) {
    if (result.warning) {
      warnings.push(result.warning);
      console.error(`[market-jobs] source "${source.name}" failed:`, result.warning.message);
    }

    for (const rawJob of result.jobs) {
      const normalizedJob = normalizeImportedJob(rawJob, normalizedFilters, source.name);
      if (!normalizedJob) continue;
      const dedupeKey = `${normalizedJob.source}:${normalizedJob.apply_url}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
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
  const limit = Math.min(Math.max(coerceInteger(filters.limit) || 20, 1), 100);
  const runSearch = async ({ includeQuery }) => {
    const values = [];
    const clauses = [];

    const query = normalizeText(filters.query);
    if (includeQuery && query) {
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
      values.push(`%${jobType}%`);
      clauses.push(`job_type ILIKE $${values.length}`);
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
  };

  const strictRows = await runSearch({ includeQuery: true });
  if (strictRows.length > 0 || !normalizeText(filters.query)) {
    return strictRows;
  }

  return runSearch({ includeQuery: false });
}

module.exports = {
  ensureMarketJobsSchema,
  importMarketJobs,
  searchMarketJobs,
};
