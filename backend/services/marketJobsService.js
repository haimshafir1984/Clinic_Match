const cheerio = require("cheerio");
const { scrapeJobsWithPuppeteer } = require("./puppeteerMcpService");
const { fetchJSearchJobs } = require("./jsearchService");
const { fetchRemotiveJobs } = require("./remotiveService");

const USER_AGENT =
  process.env.MARKET_JOBS_USER_AGENT ||
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const DEFAULT_PUPPETEER_SOURCE = {
  name: "indeed",
  locale: "en",
  urlTemplate: "https://www.indeed.com/jobs?q={{query}}&l={{location}}",
};

// LinkedIn removed — it blocks scraping (HTTP 999 / login page).
// LinkedIn jobs are now covered by JSearch API.
const DEFAULT_PUBLIC_SOURCES = [
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
    browserFallback: true,
    headers: {
      Referer: "https://www.drushim.co.il/",
      Origin: "https://www.drushim.co.il",
    },
    buildUrl: ({ query, location }) =>
      `https://www.drushim.co.il/jobs/search/${encodeURIComponent(query)}/${encodeURIComponent(location)}/`,
    parser: parseDrushimJobs,
  },
  {
    name: "alljobs",
    locale: "he",
    includeIndustry: false,
    useBrowser: true,
    forceBrowser: true,
    buildUrl: ({ query }) =>
      `https://www.alljobs.co.il/SearchResultsGuest.aspx?page=1&position=&type=&freetxt=${encodeURIComponent(query)}&city=&region=`,
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

const NORMALIZED_LOCATION_ALIASES = {
  "\u05ea\u05dc \u05d0\u05d1\u05d9\u05d1": { he: "\u05ea\u05dc \u05d0\u05d1\u05d9\u05d1", en: "Tel Aviv" },
  "\u05ea\u05dc \u05d0\u05d1\u05d9\u05d1 \u05d9\u05e4\u05d5": { he: "\u05ea\u05dc \u05d0\u05d1\u05d9\u05d1 \u05d9\u05e4\u05d5", en: "Tel Aviv-Yafo" },
  "\u05d7\u05d9\u05e4\u05d4": { he: "\u05d7\u05d9\u05e4\u05d4", en: "Haifa" },
  "\u05d9\u05e8\u05d5\u05e9\u05dc\u05d9\u05dd": { he: "\u05d9\u05e8\u05d5\u05e9\u05dc\u05d9\u05dd", en: "Jerusalem" },
  "\u05e8\u05e2\u05e0\u05e0\u05d4": { he: "\u05e8\u05e2\u05e0\u05e0\u05d4", en: "Raanana" },
  "\u05e4\u05ea\u05d7 \u05ea\u05e7\u05d5\u05d5\u05d4": { he: "\u05e4\u05ea\u05d7 \u05ea\u05e7\u05d5\u05d5\u05d4", en: "Petah Tikva" },
  "\u05e8\u05d0\u05e9\u05d5\u05df \u05dc\u05e6\u05d9\u05d5\u05df": { he: "\u05e8\u05d0\u05e9\u05d5\u05df \u05dc\u05e6\u05d9\u05d5\u05df", en: "Rishon LeZion" },
  "\u05d1\u05d0\u05e8 \u05e9\u05d1\u05e2": { he: "\u05d1\u05d0\u05e8 \u05e9\u05d1\u05e2", en: "Beer Sheva" },
  "\u05d0\u05e9\u05d3\u05d5\u05d3": { he: "\u05d0\u05e9\u05d3\u05d5\u05d3", en: "Ashdod" },
  "\u05e0\u05ea\u05e0\u05d9\u05d4": { he: "\u05e0\u05ea\u05e0\u05d9\u05d4", en: "Netanya" },
  "\u05e8\u05de\u05ea \u05d2\u05df": { he: "\u05e8\u05de\u05ea \u05d2\u05df", en: "Ramat Gan" },
  remote: { he: "\u05e2\u05d1\u05d5\u05d3\u05d4 \u05de\u05d4\u05d1\u05d9\u05ea", en: "Remote" },
};

const NORMALIZED_JOB_QUERY_ALIASES = [
  {
    terms: ["\u05e0\u05e6\u05d9\u05d2 \u05e9\u05d9\u05e8\u05d5\u05ea", "\u05e0\u05e6\u05d9\u05d2\u05ea \u05e9\u05d9\u05e8\u05d5\u05ea", "\u05e9\u05d9\u05e8\u05d5\u05ea \u05dc\u05e7\u05d5\u05d7\u05d5\u05ea", "customer service"],
    he: "\u05e0\u05e6\u05d9\u05d2 \u05e9\u05d9\u05e8\u05d5\u05ea",
    en: "customer service representative",
  },
  {
    terms: ["\u05de\u05d5\u05e7\u05d3", "call center"],
    he: "\u05de\u05d5\u05e7\u05d3\u05df",
    en: "call center representative",
  },
  {
    terms: ["\u05de\u05db\u05d9\u05e8\u05d5\u05ea", "sales"],
    he: "\u05e0\u05e6\u05d9\u05d2 \u05de\u05db\u05d9\u05e8\u05d5\u05ea",
    en: "sales representative",
  },
  {
    terms: ["\u05d1\u05d9\u05d8\u05d5\u05d7", "insurance"],
    he: "\u05d1\u05d9\u05d8\u05d5\u05d7",
    en: "insurance",
  },
  {
    terms: ["\u05ea\u05e7\u05e9\u05d5\u05e8\u05ea", "telecom", "communication"],
    he: "\u05ea\u05e7\u05e9\u05d5\u05e8\u05ea",
    en: "telecommunications",
  },
  {
    terms: ["\u05d0\u05d3\u05de\u05d9\u05df", "\u05de\u05d6\u05db\u05d9\u05e8", "\u05de\u05d6\u05db\u05d9\u05e8\u05d4", "\u05e4\u05e7\u05d9\u05d3", "\u05e4\u05e7\u05d9\u05d3\u05d4", "office"],
    he: "\u05d0\u05d3\u05de\u05d9\u05e0\u05d9\u05e1\u05d8\u05e8\u05e6\u05d9\u05d4",
    en: "office administration",
  },
  {
    terms: ["\u05de\u05ea\u05d0\u05dd", "\u05e8\u05db\u05d6", "\u05e8\u05db\u05d6\u05ea", "coordinator"],
    he: "\u05e8\u05db\u05d6 \u05e9\u05d9\u05e8\u05d5\u05ea",
    en: "coordinator",
  },
  {
    terms: ["qa"],
    he: "\u05d1\u05d5\u05d3\u05e7 \u05ea\u05d5\u05db\u05e0\u05d4",
    en: "qa engineer",
  },
  {
    terms: ["devops", "\u05d3\u05d1\u05d0\u05d5\u05e4\u05e1"],
    he: "DevOps",
    en: "devops engineer",
  },
  {
    terms: ["\u05de\u05e0\u05d4\u05dc \u05de\u05d5\u05e6\u05e8", "\u05de\u05e0\u05d4\u05dc\u05ea \u05de\u05d5\u05e6\u05e8", "\u05de\u05e0\u05d4\u05dc/\u05ea \u05de\u05d5\u05e6\u05e8", "product manager"],
    he: "\u05de\u05e0\u05d4\u05dc \u05de\u05d5\u05e6\u05e8",
    en: "product manager",
  },
  {
    terms: ["backend", "\u05d1\u05e7\u05d0\u05e0\u05d3"],
    he: "\u05de\u05e4\u05ea\u05d7 \u05d1\u05e7\u05d0\u05e0\u05d3",
    en: "backend engineer",
  },
  {
    terms: ["frontend", "\u05e4\u05e8\u05d5\u05e0\u05d8\u05d0\u05e0\u05d3"],
    he: "\u05de\u05e4\u05ea\u05d7 \u05e4\u05e8\u05d5\u05e0\u05d8\u05d0\u05e0\u05d3",
    en: "frontend engineer",
  },
  {
    terms: ["support", "\u05ea\u05de\u05d9\u05db\u05d4"],
    he: "\u05ea\u05de\u05d9\u05db\u05d4",
    en: "support",
  },
];

const NORMALIZED_INDUSTRY_ALIASES = {
  insurance: { he: "\u05d1\u05d9\u05d8\u05d5\u05d7", en: "insurance" },
  communication: { he: "\u05ea\u05e7\u05e9\u05d5\u05e8\u05ea", en: "telecommunications" },
  retail: { he: "\u05e7\u05de\u05e2\u05d5\u05e0\u05d0\u05d5\u05ea", en: "retail" },
  hospitality: { he: "\u05d0\u05d9\u05e8\u05d5\u05d7", en: "hospitality" },
  technology: { he: "\u05d8\u05db\u05e0\u05d5\u05dc\u05d5\u05d2\u05d9\u05d4", en: "technology" },
  tech: { he: "\u05d8\u05db\u05e0\u05d5\u05dc\u05d5\u05d2\u05d9\u05d4", en: "technology" },
  healthcare: { he: "\u05e8\u05e4\u05d5\u05d0\u05d4", en: "healthcare" },
  medical: { he: "\u05e8\u05e4\u05d5\u05d0\u05d4", en: "healthcare" },
  education: { he: "\u05d7\u05d9\u05e0\u05d5\u05da", en: "education" },
  construction: { he: "\u05d1\u05e0\u05d9\u05d9\u05d4", en: "construction" },
  daily: { he: "\u05de\u05e9\u05e8\u05d5\u05ea \u05d9\u05d5\u05de\u05d9\u05d5\u05ea", en: "shift work" },
};

const NORMALIZED_JOB_TYPE_ALIASES = {
  daily: { he: "\u05e2\u05d1\u05d5\u05d3\u05d4 \u05d9\u05d5\u05de\u05d9\u05ea", en: "daily" },
  temporary: { he: "\u05e2\u05d1\u05d5\u05d3\u05d4 \u05d6\u05de\u05e0\u05d9\u05ea", en: "temporary" },
  permanent: { he: "\u05de\u05e9\u05e8\u05d4 \u05de\u05dc\u05d0\u05d4", en: "full time" },
};

const QUERY_VARIANT_ALIASES = [
  {
    terms: ["devops", "\u05d3\u05d1\u05d0\u05d5\u05e4\u05e1"],
    he: ["DevOps", "\u05de\u05d4\u05e0\u05d3\u05e1 DevOps", "\u05d0\u05d9\u05e0\u05e4\u05e8\u05d4 \u05e2\u05e0\u05df"],
    en: ["DevOps Engineer", "Platform Engineer", "Site Reliability Engineer"],
  },
  {
    terms: ["\u05de\u05e0\u05d4\u05dc \u05de\u05d5\u05e6\u05e8", "\u05de\u05e0\u05d4\u05dc\u05ea \u05de\u05d5\u05e6\u05e8", "\u05de\u05e0\u05d4\u05dc/\u05ea \u05de\u05d5\u05e6\u05e8", "product manager"],
    he: ["\u05de\u05e0\u05d4\u05dc \u05de\u05d5\u05e6\u05e8", "\u05de\u05d0\u05e4\u05d9\u05d9\u05df \u05de\u05d5\u05e6\u05e8", "\u05de\u05d5\u05e6\u05e8 \u05d8\u05db\u05e0\u05d5\u05dc\u05d5\u05d2\u05d9"],
    en: ["Product Manager", "Technical Product Manager", "Product Owner"],
  },
  {
    terms: ["backend", "\u05d1\u05e7\u05d0\u05e0\u05d3"],
    he: ["\u05de\u05e4\u05ea\u05d7 \u05d1\u05e7\u05d0\u05e0\u05d3", "\u05de\u05e4\u05ea\u05d7 \u05e9\u05e8\u05ea"],
    en: ["Backend Engineer", "Backend Developer", "Software Engineer"],
  },
  {
    terms: ["frontend", "\u05e4\u05e8\u05d5\u05e0\u05d8\u05d0\u05e0\u05d3"],
    he: ["\u05de\u05e4\u05ea\u05d7 \u05e4\u05e8\u05d5\u05e0\u05d8\u05d0\u05e0\u05d3", "\u05de\u05e4\u05ea\u05d7 UI"],
    en: ["Frontend Engineer", "Frontend Developer", "React Developer"],
  },
  {
    terms: ["full stack", "fullstack", "\u05e4\u05d5\u05dc \u05e1\u05d8\u05d0\u05e7"],
    he: ["\u05de\u05e4\u05ea\u05d7 \u05e4\u05d5\u05dc \u05e1\u05d8\u05d0\u05e7"],
    en: ["Full Stack Developer", "Full Stack Engineer"],
  },
  {
    terms: ["qa", "\u05d1\u05d5\u05d3\u05e7", "\u05d1\u05d5\u05d3\u05e7\u05ea"],
    he: ["\u05d1\u05d5\u05d3\u05e7 \u05ea\u05d5\u05db\u05e0\u05d4", "\u05d0\u05d5\u05d8\u05d5\u05de\u05e6\u05d9\u05d4 QA"],
    en: ["QA Engineer", "Automation Engineer", "Software QA Engineer"],
  },
  {
    terms: ["\u05e9\u05d9\u05e8\u05d5\u05ea \u05dc\u05e7\u05d5\u05d7\u05d5\u05ea", "\u05e0\u05e6\u05d9\u05d2 \u05e9\u05d9\u05e8\u05d5\u05ea", "customer service"],
    he: ["\u05e0\u05e6\u05d9\u05d2 \u05e9\u05d9\u05e8\u05d5\u05ea", "\u05de\u05d5\u05e7\u05d3 \u05e9\u05d9\u05e8\u05d5\u05ea", "\u05e0\u05e6\u05d9\u05d2 \u05e9\u05d9\u05e8\u05d5\u05ea \u05dc\u05e7\u05d5\u05d7\u05d5\u05ea"],
    en: ["customer service representative", "customer support", "call center representative"],
  },
  {
    terms: ["\u05d1\u05d9\u05d8\u05d5\u05d7", "insurance"],
    he: ["\u05e0\u05e6\u05d9\u05d2 \u05d1\u05d9\u05d8\u05d5\u05d7", "\u05e8\u05e4\u05e8\u05e0\u05d8 \u05d1\u05d9\u05d8\u05d5\u05d7", "\u05d7\u05ea\u05dd"],
    en: ["insurance representative", "underwriter", "claims specialist"],
  },
  {
    terms: ["\u05ea\u05e7\u05e9\u05d5\u05e8\u05ea", "telecom", "communication"],
    he: ["\u05de\u05d5\u05e7\u05d3 \u05ea\u05e7\u05e9\u05d5\u05e8\u05ea", "\u05e0\u05e6\u05d9\u05d2 \u05e9\u05d9\u05e8\u05d5\u05ea", "\u05e0\u05e6\u05d9\u05d2 \u05ea\u05de\u05d9\u05db\u05d4"],
    en: ["telecommunications", "customer support", "call center representative"],
  },
];

const INDUSTRY_QUERY_FALLBACKS = {
  insurance: {
    he: ["\u05d1\u05d9\u05d8\u05d5\u05d7", "\u05e0\u05e6\u05d9\u05d2 \u05d1\u05d9\u05d8\u05d5\u05d7", "\u05e8\u05e4\u05e8\u05e0\u05d8 \u05d1\u05d9\u05d8\u05d5\u05d7"],
    en: ["insurance", "insurance representative", "claims specialist"],
  },
  communication: {
    he: ["\u05ea\u05e7\u05e9\u05d5\u05e8\u05ea", "\u05de\u05d5\u05e7\u05d3 \u05e9\u05d9\u05e8\u05d5\u05ea", "\u05e0\u05e6\u05d9\u05d2 \u05e9\u05d9\u05e8\u05d5\u05ea"],
    en: ["telecommunications", "call center representative", "customer service representative"],
  },
  medical: {
    he: ["\u05e8\u05e4\u05d5\u05d0\u05d4", "\u05de\u05e8\u05e4\u05d0\u05d4", "\u05e1\u05d9\u05d9\u05e2\u05ea"],
    en: ["medical", "clinic", "healthcare"],
  },
  education: {
    he: ["\u05d7\u05d9\u05e0\u05d5\u05da", "\u05d4\u05d5\u05e8\u05d0\u05d4", "\u05e1\u05d9\u05d9\u05e2\u05ea"],
    en: ["education", "teaching assistant", "school administration"],
  },
  construction: {
    he: ["\u05d1\u05e0\u05d9\u05d9\u05d4", "\u05e2\u05d5\u05d1\u05d3 \u05d1\u05e0\u05d9\u05d9\u05d4", "\u05de\u05e0\u05d4\u05dc \u05e2\u05d1\u05d5\u05d3\u05d4"],
    en: ["construction", "site manager", "field worker"],
  },
  daily: {
    he: ["\u05de\u05e9\u05e8\u05d4 \u05d9\u05d5\u05de\u05d9\u05ea", "\u05de\u05e9\u05de\u05e8\u05d5\u05ea", "\u05e2\u05d5\u05d1\u05d3 \u05db\u05dc\u05dc\u05d9"],
    en: ["shift work", "daily job", "general worker"],
  },
};

const TECH_INDUSTRIES = new Set(["tech", "technology"]);
const SOURCE_PRIORITY = {
  tech: ["linkedin", "glassdoor", "indeed", "ziprecruiter", "remotive", "jobmaster", "alljobs", "drushim", "jsearch", "monster"],
  general: ["alljobs", "jobmaster", "drushim", "linkedin", "indeed", "glassdoor", "ziprecruiter", "jsearch", "monster"],
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

function absoluteUrl(baseUrl, href) {
  try {
    return href ? new URL(href, baseUrl).href : null;
  } catch (_error) {
    return null;
  }
}

function interpolateTemplate(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => encodeURIComponent(values[key] || ""));
}

function getLocaleLocation(location, locale) {
  const normalized = normalizeText(location);
  if (!normalized) return "";
  const alias = NORMALIZED_LOCATION_ALIASES[normalized] || LOCATION_ALIASES[normalized];
  if (alias) {
    return locale === "he" ? alias.he : alias.en;
  }
  return normalized;
}

function getQueryAlias(value, locale) {
  const normalized = normalizeText(value);
  if (!normalized) return "";

  const lower = normalized.toLowerCase();
  const alias = NORMALIZED_JOB_QUERY_ALIASES.find((item) =>
    item.terms.some((term) => lower.includes(term.toLowerCase()))
  );
  if (alias) {
    return locale === "he" ? alias.he : alias.en;
  }

  return normalized;
}

function getMatchedQueryAlias(value) {
  const normalized = normalizeText(value);
  if (!normalized) return null;

  const lower = normalized.toLowerCase();
  return QUERY_VARIANT_ALIASES.find((item) =>
    item.terms.some((term) => lower.includes(term.toLowerCase()))
  ) || null;
}

function getIndustryAlias(value, locale) {
  const normalized = normalizeText(value);
  if (!normalized) return "";
  const alias = NORMALIZED_INDUSTRY_ALIASES[normalized.toLowerCase()] || INDUSTRY_ALIASES[normalized.toLowerCase()];
  return alias ? (locale === "he" ? alias.he : alias.en) : normalized;
}

function getJobTypeAlias(value, locale) {
  const normalized = normalizeText(value);
  if (!normalized) return "";
  const alias = NORMALIZED_JOB_TYPE_ALIASES[normalized.toLowerCase()] || JOB_TYPE_ALIASES[normalized.toLowerCase()];
  return alias ? (locale === "he" ? alias.he : alias.en) : normalized;
}

// Normalize an industry value to both its Hebrew and English forms for DB search
function resolveIndustryVariants(value) {
  const normalized = normalizeText(value);
  if (!normalized) return [];

  const lower = normalized.toLowerCase();
  if (NORMALIZED_INDUSTRY_ALIASES[lower]) {
    return [NORMALIZED_INDUSTRY_ALIASES[lower].he, NORMALIZED_INDUSTRY_ALIASES[lower].en];
  }

  if (INDUSTRY_ALIASES[lower]) {
    return [INDUSTRY_ALIASES[lower].he, INDUSTRY_ALIASES[lower].en];
  }

  for (const [, alias] of Object.entries(NORMALIZED_INDUSTRY_ALIASES)) {
    if (alias.he === normalized || alias.en.toLowerCase() === lower) {
      return [alias.he, alias.en];
    }
  }

  for (const [, alias] of Object.entries(INDUSTRY_ALIASES)) {
    if (alias.he === normalized || alias.en.toLowerCase() === lower) {
      return [alias.he, alias.en];
    }
  }
  return [normalized];
}

function buildQueryVariants(filters, locale, options = {}) {
  const { maxVariants = 3 } = options;
  const variants = [];
  const exactQuery = normalizeText(filters.query);
  const normalizedIndustry = normalizeText(filters.industry)?.toLowerCase();

  if (exactQuery) {
    variants.push(exactQuery);
  }

  const localizedAlias = getQueryAlias(filters.query, locale);
  if (localizedAlias) {
    variants.push(localizedAlias);
  }

  const matchedAlias = getMatchedQueryAlias(filters.query);
  if (matchedAlias) {
    variants.push(...(matchedAlias[locale] || []));
  }

  if (!exactQuery && normalizedIndustry && INDUSTRY_QUERY_FALLBACKS[normalizedIndustry]) {
    variants.push(...(INDUSTRY_QUERY_FALLBACKS[normalizedIndustry][locale] || []));
  }

  if (!variants.length) {
    const industryAlias = getIndustryAlias(filters.industry, locale);
    if (industryAlias) {
      variants.push(industryAlias);
    }
  }

  return [...new Set(variants.filter(Boolean))].slice(0, maxVariants);
}

function buildSearchTerms(filters, locale, options = {}) {
  return (
    buildQueryVariants(filters, locale, options)[0] ||
    getIndustryAlias(filters.industry, locale) ||
    getJobTypeAlias(filters.jobType, locale) ||
    ""
  );
}

function normalizeComparableText(value) {
  return stripTags(value)
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05ff\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveLocationVariants(location) {
  const normalized = normalizeText(location);
  if (!normalized) return [];

  const alias = NORMALIZED_LOCATION_ALIASES[normalized] || LOCATION_ALIASES[normalized];
  const candidates = [normalized, alias?.he, alias?.en];

  if (alias?.en?.includes("-")) {
    candidates.push(alias.en.replace(/-/g, " "));
  }

  if (normalized.includes(" ")) {
    candidates.push(normalized.replace(/\s+/g, ""));
  }

  return [...new Set(candidates.filter(Boolean).map(normalizeComparableText).filter(Boolean))];
}

function locationMatchesFilters(job, filters) {
  const requestedLocation = normalizeText(filters.location);
  if (!requestedLocation) {
    return true;
  }

  const jobLocation = normalizeComparableText(job.location);
  if (!jobLocation) {
    return false;
  }

  const requestedVariants = resolveLocationVariants(requestedLocation);
  if (requestedVariants.some((variant) => jobLocation.includes(variant))) {
    return true;
  }

  const wantsIsraeliCity = /[\u0590-\u05ff]/.test(requestedLocation) || requestedVariants.some((variant) =>
    ["tel aviv", "haifa", "jerusalem", "petah tikva", "beer sheva", "ashdod", "netanya", "ramat gan"].includes(variant)
  );

  const remoteInIsrael =
    /remote|\u05de\u05d4\u05d1\u05d9\u05ea|\u05d4\u05d9\u05d1\u05e8\u05d9\u05d3/.test(jobLocation) &&
    /israel|\u05d9\u05e9\u05e8\u05d0\u05dc/.test(jobLocation);

  return wantsIsraeliCity && remoteInIsrael;
}

function roleMatchesFilters(job, filters) {
  const requestedQuery = normalizeText(filters.query);
  if (!requestedQuery) {
    return true;
  }

  const haystack = normalizeComparableText([job.title, job.description, job.company].filter(Boolean).join(" "));
  if (!haystack) {
    return false;
  }

  const variants = [
    ...buildQueryVariants(filters, "he", { maxVariants: 4 }),
    ...buildQueryVariants(filters, "en", { maxVariants: 4 }),
  ];

  return [...new Set(variants.filter(Boolean))].some((variant) => {
    const normalizedVariant = normalizeComparableText(variant);
    if (!normalizedVariant) return false;
    if (haystack.includes(normalizedVariant)) return true;

    const tokens = normalizedVariant.split(" ").filter((token) => token.length > 2);
    if (!tokens.length) return false;

    const matchedTokens = tokens.filter((token) => haystack.includes(token));
    return tokens.length === 1 ? matchedTokens.length === 1 : matchedTokens.length >= Math.min(2, tokens.length);
  });
}

function getSourcePriorityOrder(filters = {}) {
  const industry = normalizeText(filters.industry)?.toLowerCase();
  return TECH_INDUSTRIES.has(industry) ? SOURCE_PRIORITY.tech : SOURCE_PRIORITY.general;
}

function getSourcePriorityMap(filters = {}) {
  return Object.fromEntries(getSourcePriorityOrder(filters).map((source, index) => [source, index]));
}

function buildUniqueVariants(values, maxItems = 8) {
  return [...new Set((values || []).map(normalizeText).filter(Boolean))].slice(0, maxItems);
}

function semanticDedupeKey(job) {
  const title = normalizeComparableText(job.title);
  const company = normalizeComparableText(job.company);
  const location = normalizeComparableText(job.location);
  const sourceUrl = normalizeComparableText(job.apply_url || job.source_url);

  if (title && company) {
    return `${title}|${company}|${location || ""}`;
  }

  return sourceUrl || `${title}|${location || ""}`;
}

function inferWorkArrangement(job) {
  const haystack = normalizeComparableText(
    [job.location, job.job_type, job.employment_type, job.description, job.title].filter(Boolean).join(" ")
  );

  if (!haystack) return null;
  if (/hybrid|היברידי|שילוב/.test(haystack)) return "hybrid";
  if (/remote|remote only|מהבית|עבודה מהבית/.test(haystack)) return "remote";
  if (/onsite|on site|במשרד|פרונטלי/.test(haystack)) return "onsite";
  return null;
}

function getPostedAgoDays(job) {
  const timestamp = job.posted_at || job.fetched_at;
  if (!timestamp) return null;

  const postedAt = new Date(timestamp).getTime();
  if (!Number.isFinite(postedAt)) return null;

  const days = Math.floor((Date.now() - postedAt) / (1000 * 60 * 60 * 24));
  return days < 0 ? 0 : days;
}

function getFreshnessLabel(days) {
  if (days === null || days === undefined) return null;
  if (days <= 0) return "פורסם היום";
  if (days === 1) return "פורסם אתמול";
  if (days <= 6) return `פורסם לפני ${days} ימים`;
  if (days <= 13) return "פורסם השבוע";
  if (days <= 30) return "פורסם החודש";
  return "פורסם לפני יותר מחודש";
}

function getPublisher(job) {
  return normalizeText(job.raw_payload?.raw_publisher) || normalizeText(job.raw_payload?.publisher) || job.source;
}

function computeJobInsights(job, filters = {}) {
  const reasons = [];
  const reasonCodes = [];
  let score = 0;

  if (roleMatchesFilters(job, filters)) {
    const requestedQuery = normalizeText(filters.query);
    if (requestedQuery) {
      reasons.push(`התפקיד תואם לחיפוש שלך: ${requestedQuery}`);
      reasonCodes.push("matched_role");
      score += 42;
    }
  }

  if (locationMatchesFilters(job, filters)) {
    const requestedLocation = normalizeText(filters.location);
    if (requestedLocation) {
      reasons.push(`המיקום תואם לאזור שביקשת: ${requestedLocation}`);
      reasonCodes.push("matched_location");
      score += 26;
    }
  }

  const requestedIndustry = normalizeText(filters.industry);
  if (requestedIndustry) {
    const industryVariants = resolveIndustryVariants(requestedIndustry).map(normalizeComparableText);
    const jobIndustry = normalizeComparableText([job.industry, job.description, job.title].filter(Boolean).join(" "));
    if (industryVariants.some((variant) => variant && jobIndustry.includes(variant))) {
      reasons.push("תחום הפעילות של המשרה מתאים לפרופיל שבחרת");
      reasonCodes.push("matched_industry");
      score += 14;
    }
  }

  const requestedJobType = normalizeText(filters.jobType || filters.job_type);
  if (requestedJobType) {
    const requestedType = normalizeComparableText(getJobTypeAlias(requestedJobType, "he"));
    const haystack = normalizeComparableText([job.job_type, job.employment_type, job.description].filter(Boolean).join(" "));
    if (requestedType && haystack.includes(requestedType)) {
      reasons.push("סוג המשרה תואם להעדפה שלך");
      reasonCodes.push("matched_job_type");
      score += 8;
    }
  }

  const workArrangement = inferWorkArrangement(job);
  if (workArrangement === "remote") {
    reasons.push("כולל מתכונת עבודה מרחוק");
    reasonCodes.push("remote");
    score += 4;
  } else if (workArrangement === "hybrid") {
    reasons.push("כולל מתכונת עבודה היברידית");
    reasonCodes.push("hybrid");
    score += 3;
  }

  const postedAgoDays = getPostedAgoDays(job);
  if (postedAgoDays !== null) {
    if (postedAgoDays <= 3) {
      reasons.push("המשרה פורסמה לאחרונה");
      reasonCodes.push("fresh");
      score += 10;
    } else if (postedAgoDays <= 14) {
      score += 6;
    } else if (postedAgoDays <= 30) {
      score += 3;
    }
  }

  return {
    matchScore: Math.min(score, 100),
    fitReasons: buildUniqueVariants(reasons, 4),
    reasonCodes: buildUniqueVariants(reasonCodes, 6),
    workArrangement,
    postedAgoDays,
    freshnessLabel: getFreshnessLabel(postedAgoDays),
  };
}

function decorateMarketJob(job, filters = {}) {
  const insights = computeJobInsights(job, filters);
  return {
    ...job,
    match_score: insights.matchScore,
    fit_reasons: insights.fitReasons,
    reason_codes: insights.reasonCodes,
    work_arrangement: insights.workArrangement,
    freshness_label: insights.freshnessLabel,
    posted_ago_days: insights.postedAgoDays,
    source_rank: getSourcePriorityMap(filters)[job.source] ?? null,
    publisher: getPublisher(job),
  };
}

function prioritizeJobs(jobs, filters = {}) {
  const priorityMap = getSourcePriorityMap(filters);
  return [...jobs].sort((left, right) => {
    const leftScore = Number(left.match_score ?? 0);
    const rightScore = Number(right.match_score ?? 0);
    if (leftScore !== rightScore) {
      return rightScore - leftScore;
    }

    const leftPriority = priorityMap[left.source] ?? 999;
    const rightPriority = priorityMap[right.source] ?? 999;
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    const leftDate = new Date(left.posted_at || left.fetched_at || 0).getTime();
    const rightDate = new Date(right.posted_at || right.fetched_at || 0).getTime();
    return rightDate - leftDate;
  });
}

function buildSourceStats(filters, sourceResults, importedJobs) {
  const importedBySource = importedJobs.reduce((acc, job) => {
    acc[job.source] = (acc[job.source] || 0) + 1;
    return acc;
  }, {});

  const stats = sourceResults.map((item) => ({
    source: item.source,
    fetched: item.fetched || 0,
    imported: importedBySource[item.source] || 0,
    warning: item.warning || null,
  }));

  return prioritizeJobs(
    stats.map((stat, index) => ({
      source: stat.source,
      posted_at: null,
      fetched_at: new Date(Date.now() - index).toISOString(),
      ...stat,
    })),
    filters
  ).map(({ source, fetched, imported, warning }) => ({ source, fetched, imported, warning }));
}

function buildPublisherStats(importedJobs) {
  const stats = {};

  for (const job of importedJobs) {
    const publisher = job.raw_payload?.raw_publisher || job.source;
    stats[publisher] = (stats[publisher] || 0) + 1;
  }

  return Object.entries(stats)
    .map(([publisher, count]) => ({ publisher, count }))
    .sort((a, b) => b.count - a.count);
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
          card.querySelector('a[href*="UploadSingle.aspx"]') ||
          card.querySelector('a[href*="/job/"]') ||
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
            if (!/job|career|position|opening|viewjob|jk=|uploadsingle/i.test(href)) return null;

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

async function fetchHtml(url, source = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12_000);
  const requestHeaders = {
    "User-Agent": USER_AGENT,
    "Accept-Language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Site": "cross-site",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Dest": "document",
    ...(source.headers || {}),
  };

  try {
    let response = await fetch(url, {
      headers: requestHeaders,
      signal: controller.signal,
    });

    if (response.status === 403 && source.retryHeaders) {
      response = await fetch(url, {
        headers: {
          ...requestHeaders,
          ...source.retryHeaders,
        },
        signal: controller.signal,
      });
    }

    return {
      ok: response.ok,
      status: response.status,
      text: await response.text(),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseJobMasterJobs(html, context) {
  const $ = cheerio.load(html);
  const jobs = [];

  $("article[id^='misra']").slice(0, context.limit).each((_i, el) => {
    const $el = $(el);
    const externalId = (el.attribs.id || "").replace("misra", "") || null;

    const $link = $el.find("a.CardHeader, a[class*='CardHeader']").first();
    const href = absoluteUrl(context.url, $link.attr("href") || "");
    const title = $link.text().trim();

    if (!href || !title) return;

    const company = $el.find(".CompanyNameLink span, [class*='CompanyName'] span").first().text().trim();
    const location = $el.find(".jobLocation span, [class*='jobLocation'] span").first().text().trim() || context.filters.location;
    const jobType = $el.find(".jobType li, [class*='jobType']").first().text().trim() || context.filters.jobType;
    const description = $el.find("[class*='jobShortDescription']").first().text().trim();
    const postedAt = $el.find("span.Gray, span[class*='Gray']").first().text().trim();

    jobs.push({
      source: "jobmaster",
      external_id: externalId,
      title,
      company: company || null,
      location: location || null,
      job_type: jobType || null,
      industry: context.filters.industry || null,
      employment_type: null,
      description: description || null,
      apply_url: href,
      source_url: context.url,
      posted_at: postedAt || null,
      salary_min: null,
      salary_max: null,
    });
  });

  return jobs;
}

function parseDrushimJobs(html, context) {
  const $ = cheerio.load(html);
  const jobs = [];

  $("[data-cy^='job-item']").slice(0, context.limit).each((_i, el) => {
    const $el = $(el);

    const $link = $el.find("a[href*='/job/']").first();
    const href = absoluteUrl(context.url, $link.attr("href") || "");
    const title = $el.find(".job-url, [class*='job-url']").first().text().trim() || $link.text().trim();

    if (!href || !title) return;

    const externalId = ($link.attr("href") || "").match(/\/job\/(\d+)/i)?.[1] ||
      $el.attr("listingid") || null;
    const company = $el.find(".display-22 span, [class*='display-22'] span").first().text().trim();
    const description = $el.find(".display-18.region-item, [class*='display-18']").first().text().trim();

    jobs.push({
      source: "drushim",
      external_id: externalId,
      title,
      company: company || null,
      location: context.filters.location || null,
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
  });

  return jobs;
}

function parseAllJobs(html, context) {
  if (/Radware Page/i.test(html)) {
    throw new Error("AllJobs returned a protection page");
  }

  const $ = cheerio.load(html);
  const jobs = [];

  // Try multiple selectors as AllJobs may change their HTML
  const $cards = $(".job-listing, [class*='job-listing'], .job-item, [class*='job-item']");

  $cards.slice(0, context.limit).each((_i, el) => {
    const $el = $(el);
    const $link = $el.find("a[href]").first();
    const href = absoluteUrl(context.url, $link.attr("href") || "");
    const title = $el.find("h2, h3, h4").first().text().trim() || $link.text().trim();

    if (!href || !title) return;

    const company = $el.find(".company, [class*='company']").first().text().trim();

    jobs.push({
      source: "alljobs",
      external_id: null,
      title,
      company: company || null,
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
  });

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
    description: stripTags(job.description),
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
  if (source.useBrowser) {
    return scrapeBrowserSource(source, filters, limit);
  }

  const location = getLocaleLocation(filters.location, source.locale);
  const queryVariants = buildQueryVariants(filters, source.locale, { maxVariants: 3 });
  const effectiveQueries = queryVariants.length
    ? queryVariants
    : [location ? "" : source.locale === "he" ? "עבודה" : "jobs"];
  const jobs = [];
  const seen = new Set();
  const warnings = [];

  for (const query of effectiveQueries) {
    const url = source.buildUrl({ query, location, filters });
    let response;

    try {
      response = await fetchHtml(url, source);
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : "Failed to fetch source HTML");
      continue;
    }

    const { ok, status, text } = response;
    if (!ok) {
      warnings.push(`HTTP ${status}`);
      continue;
    }

    try {
      const parsedJobs = source.parser(text, { filters, limit, url });
      for (const job of parsedJobs) {
        const dedupeKey = `${job.apply_url || ""}:${job.title || ""}`;
        if (!dedupeKey.trim() || seen.has(dedupeKey)) {
          continue;
        }
        seen.add(dedupeKey);
        jobs.push(job);
      }
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : "Failed to parse source HTML");
    }

    if (jobs.length >= limit) {
      break;
    }
  }

  if ((jobs.length === 0 || warnings.some((warning) => /403/i.test(warning))) && source.browserFallback) {
    const browserResult = await scrapeBrowserSource(
      {
        ...source,
        useBrowser: true,
        forceBrowser: true,
      },
      filters,
      limit
    );

    if (browserResult.jobs.length > 0) {
      return browserResult;
    }

    if (browserResult.warning?.message) {
      warnings.push(browserResult.warning.message);
    }
  }

  return {
    jobs: jobs.slice(0, limit),
    warning: warnings.length ? { source: source.name, message: warnings.join(" | ") } : null,
  };
}

async function scrapeBrowserSource(source, filters, limit) {
  const queryVariants = buildQueryVariants(filters, source.locale || "he", { maxVariants: 3 });
  const effectiveQueries = queryVariants.length ? queryVariants : [filters.query || ""];
  const jobs = [];
  const seen = new Set();
  const warnings = [];

  for (const query of effectiveQueries) {
    const url = source.buildUrl({
      query,
      location: getLocaleLocation(filters.location, source.locale || "he"),
      filters,
    });

    let result;
    try {
      result = await scrapePuppeteerSource(source, filters, limit, { url });
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : "Browser scraping failed");
      continue;
    }

    if (result.warning) {
      warnings.push(result.warning.message);
    }

    for (const job of result.jobs) {
      const dedupeKey = `${job.apply_url || ""}:${job.title || ""}`;
      if (!dedupeKey.trim() || seen.has(dedupeKey)) {
        continue;
      }
      seen.add(dedupeKey);
      jobs.push(job);
    }

    if (jobs.length >= limit) {
      break;
    }
  }

  return {
    jobs: jobs.slice(0, limit),
    warning: warnings.length ? { source: source.name, message: warnings.join(" | ") } : null,
  };
}

async function scrapePuppeteerSource(source, filters, limit, overrides = {}) {
  const query =
    overrides.query ||
    buildSearchTerms(filters, source.locale || "en", { includeIndustry: source.includeIndustry !== false });
  const location = overrides.location || getLocaleLocation(filters.location, source.locale || "en");
  const url = overrides.url || interpolateTemplate(source.urlTemplate, {
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
    const jobs = await scrapeJobsWithPuppeteer({
      url,
      extractorScript,
      sourceName: source.name,
      forceEnable: source.forceBrowser === true,
    });
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
  const semanticSeen = new Set();

  // Run public HTML sources + JSearch API + Puppeteer sources in parallel
  const [publicResults, jsearchResult, remotiveResult, puppeteerResults] = await Promise.all([
    Promise.all(
      DEFAULT_PUBLIC_SOURCES.map(async (source) => ({
        source,
        result: await scrapePublicSource(source, normalizedFilters, limit),
      }))
    ),
    fetchJSearchJobs({
      query: normalizedFilters.query || undefined,
      location: normalizedFilters.location || undefined,
      jobType: normalizedFilters.jobType || undefined,
      industry: normalizedFilters.industry || undefined,
      limit,
    }),
    TECH_INDUSTRIES.has((normalizedFilters.industry || "").toLowerCase())
      ? fetchRemotiveJobs({
          query: normalizedFilters.query || undefined,
          limit,
        })
      : Promise.resolve({ jobs: [], warning: null }),
    Promise.all(
      getConfiguredPuppeteerSources().map(async (source) => ({
        source,
        result: await scrapePuppeteerSource(source, normalizedFilters, limit),
      }))
    ),
  ]);

  for (const { source, result } of publicResults) {
    if (result.warning) {
      warnings.push(result.warning);
      console.error(`[market-jobs] source "${source.name}" failed:`, result.warning.message);
    }

    for (const rawJob of result.jobs) {
      const normalizedJob = normalizeImportedJob(rawJob, normalizedFilters, source.name);
      if (!normalizedJob) continue;
      if (!locationMatchesFilters(normalizedJob, normalizedFilters)) continue;
      if (!roleMatchesFilters(normalizedJob, normalizedFilters)) continue;
      const dedupeKey = `${normalizedJob.source}:${normalizedJob.apply_url}`;
      const semanticKey = semanticDedupeKey(normalizedJob);
      if (seen.has(dedupeKey) || semanticSeen.has(semanticKey)) continue;
      seen.add(dedupeKey);
      semanticSeen.add(semanticKey);
      const savedJob = await upsertMarketJob(pool, normalizedJob);
      importedJobs.push(decorateMarketJob(savedJob, normalizedFilters));
    }
  }

  // JSearch results
  if (jsearchResult.warning) {
    warnings.push(jsearchResult.warning);
    console.error(`[market-jobs] source "jsearch" failed:`, jsearchResult.warning.message);
  }
  for (const rawJob of jsearchResult.jobs) {
    const normalizedJob = normalizeImportedJob(rawJob, normalizedFilters, "jsearch");
    if (!normalizedJob) continue;
    if (!locationMatchesFilters(normalizedJob, normalizedFilters)) continue;
    if (!roleMatchesFilters(normalizedJob, normalizedFilters)) continue;
    const dedupeKey = `${normalizedJob.source}:${normalizedJob.apply_url}`;
    const semanticKey = semanticDedupeKey(normalizedJob);
    if (seen.has(dedupeKey) || semanticSeen.has(semanticKey)) continue;
    seen.add(dedupeKey);
    semanticSeen.add(semanticKey);
    const savedJob = await upsertMarketJob(pool, normalizedJob);
    importedJobs.push(decorateMarketJob(savedJob, normalizedFilters));
  }

  if (remotiveResult.warning) {
    warnings.push(remotiveResult.warning);
    console.error(`[market-jobs] source "remotive" failed:`, remotiveResult.warning.message);
  }
  for (const rawJob of remotiveResult.jobs) {
    const normalizedJob = normalizeImportedJob(rawJob, normalizedFilters, "remotive");
    if (!normalizedJob) continue;
    if (!locationMatchesFilters(normalizedJob, normalizedFilters)) continue;
    if (!roleMatchesFilters(normalizedJob, normalizedFilters)) continue;
    const dedupeKey = `${normalizedJob.source}:${normalizedJob.apply_url}`;
    const semanticKey = semanticDedupeKey(normalizedJob);
    if (seen.has(dedupeKey) || semanticSeen.has(semanticKey)) continue;
    seen.add(dedupeKey);
    semanticSeen.add(semanticKey);
    const savedJob = await upsertMarketJob(pool, normalizedJob);
    importedJobs.push(decorateMarketJob(savedJob, normalizedFilters));
  }

  // Puppeteer sources
  for (const { source, result } of puppeteerResults) {
    if (result.warning) {
      warnings.push(result.warning);
      console.error(`[market-jobs] source "${source.name}" failed:`, result.warning.message);
    }

    for (const rawJob of result.jobs) {
      const normalizedJob = normalizeImportedJob(rawJob, normalizedFilters, source.name);
      if (!normalizedJob) continue;
      if (!locationMatchesFilters(normalizedJob, normalizedFilters)) continue;
      if (!roleMatchesFilters(normalizedJob, normalizedFilters)) continue;
      const dedupeKey = `${normalizedJob.source}:${normalizedJob.apply_url}`;
      const semanticKey = semanticDedupeKey(normalizedJob);
      if (seen.has(dedupeKey) || semanticSeen.has(semanticKey)) continue;
      seen.add(dedupeKey);
      semanticSeen.add(semanticKey);
      const savedJob = await upsertMarketJob(pool, normalizedJob);
      importedJobs.push(decorateMarketJob(savedJob, normalizedFilters));
    }
  }

  const prioritizedJobs = prioritizeJobs(importedJobs, normalizedFilters);
  const sourceStats = buildSourceStats(
    normalizedFilters,
    [
      ...publicResults.map(({ source, result }) => ({
        source: source.name,
        fetched: result.jobs.length,
        warning: result.warning?.message || null,
      })),
      { source: "jsearch", fetched: jsearchResult.jobs.length, warning: jsearchResult.warning?.message || null },
      { source: "remotive", fetched: remotiveResult.jobs.length, warning: remotiveResult.warning?.message || null },
      ...puppeteerResults.map(({ source, result }) => ({
        source: source.name,
        fetched: result.jobs.length,
        warning: result.warning?.message || null,
      })),
    ],
    prioritizedJobs
  );

  return {
    importedCount: prioritizedJobs.length,
    jobs: prioritizedJobs,
    filters: normalizedFilters,
    warnings,
    sourceStats,
    publisherStats: buildPublisherStats(prioritizedJobs),
  };
}

async function searchMarketJobs(pool, filters = {}) {
  const normalizedFilters = {
    query: normalizeText(filters.query) || "",
    location: normalizeText(filters.location) || "",
    industry: normalizeText(filters.industry) || "",
    jobType: normalizeText(filters.jobType || filters.job_type) || "",
  };
  const limit = Math.min(Math.max(coerceInteger(filters.limit) || 20, 1), 100);
  const sourceOrder = getSourcePriorityOrder(normalizedFilters);
  const candidateLimit = Math.max(limit * 5, 50);
  const values = [];
  const clauses = [];

  const addVariantClause = (variants, columns) => {
    const uniqueVariants = buildUniqueVariants(variants, 10);
    if (!uniqueVariants.length) return;

    const variantClauses = uniqueVariants.map((variant) => {
      values.push(`%${variant}%`);
      const placeholder = `$${values.length}`;
      return `(${columns.map((column) => `${column} ILIKE ${placeholder}`).join(" OR ")})`;
    });

    clauses.push(`(${variantClauses.join(" OR ")})`);
  };

  addVariantClause(
    [
      ...buildQueryVariants(normalizedFilters, "he", { maxVariants: 6 }),
      ...buildQueryVariants(normalizedFilters, "en", { maxVariants: 6 }),
    ],
    ["title", "company", "description"]
  );

  addVariantClause(resolveLocationVariants(normalizedFilters.location), ["location"]);
  addVariantClause(resolveIndustryVariants(normalizedFilters.industry), ["industry", "description", "title"]);
  addVariantClause(
    [
      getJobTypeAlias(normalizedFilters.jobType, "he"),
      getJobTypeAlias(normalizedFilters.jobType, "en"),
      normalizedFilters.jobType,
    ],
    ["job_type", "employment_type", "description"]
  );

  values.push(candidateLimit);
  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const sourceCase = sourceOrder
    .map((source, index) => `WHEN source = '${source}' THEN ${index}`)
    .join(" ");

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
        raw_payload,
        created_at,
        updated_at
      FROM market_jobs
      ${whereClause}
      ORDER BY CASE ${sourceCase} ELSE 999 END, COALESCE(posted_at, fetched_at) DESC, id DESC
      LIMIT $${values.length}
    `,
    values
  );

  const semanticSeen = new Set();
  const filteredRows = result.rows.filter((job) => {
    if (!locationMatchesFilters(job, normalizedFilters) || !roleMatchesFilters(job, normalizedFilters)) {
      return false;
    }

    const semanticKey = semanticDedupeKey(job);
    if (semanticSeen.has(semanticKey)) {
      return false;
    }

    semanticSeen.add(semanticKey);
    return true;
  });

  return prioritizeJobs(
    filteredRows.map((job) => decorateMarketJob(job, normalizedFilters)),
    normalizedFilters
  ).slice(0, limit);
}

module.exports = {
  ensureMarketJobsSchema,
  importMarketJobs,
  searchMarketJobs,
};
