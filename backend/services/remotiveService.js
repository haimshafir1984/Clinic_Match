const REMOTIVE_BASE_URL = "https://remotive.com/api/remote-jobs";

const REMOTIVE_TECH_SEARCH_TERMS = [
  {
    terms: ["devops", "\u05d3\u05d1\u05d0\u05d5\u05e4\u05e1"],
    variants: ["devops", "platform engineer", "site reliability engineer", "cloud engineer"],
  },
  {
    terms: ["\u05de\u05e0\u05d4\u05dc \u05de\u05d5\u05e6\u05e8", "\u05de\u05e0\u05d4\u05dc\u05ea \u05de\u05d5\u05e6\u05e8", "\u05de\u05e0\u05d4\u05dc/\u05ea \u05de\u05d5\u05e6\u05e8", "product manager"],
    variants: ["product manager", "technical product manager", "product owner"],
  },
  {
    terms: ["backend", "\u05d1\u05e7\u05d0\u05e0\u05d3"],
    variants: ["backend engineer", "backend developer", "software engineer"],
  },
  {
    terms: ["frontend", "\u05e4\u05e8\u05d5\u05e0\u05d8\u05d0\u05e0\u05d3"],
    variants: ["frontend engineer", "frontend developer", "react developer"],
  },
  {
    terms: ["full stack", "fullstack", "\u05e4\u05d5\u05dc \u05e1\u05d8\u05d0\u05e7"],
    variants: ["full stack developer", "software engineer"],
  },
];

function normalizeText(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getRemotiveSearchQueries(query, limit) {
  const normalizedQuery = normalizeText(query);
  const queries = [];

  if (normalizedQuery) {
    queries.push(normalizedQuery);
  }

  const lowerQuery = (normalizedQuery || "").toLowerCase();
  const alias = REMOTIVE_TECH_SEARCH_TERMS.find((entry) =>
    entry.terms.some((term) => lowerQuery.includes(term.toLowerCase()))
  );

  if (alias) {
    queries.push(...alias.variants);
  }

  const uniqueQueries = [...new Set(queries.filter(Boolean))];
  return uniqueQueries.slice(0, Math.min(limit, 4));
}

async function fetchRemotiveJobs({ query, limit = 10 }) {
  const queries = getRemotiveSearchQueries(query, limit);
  if (!queries.length) {
    return { jobs: [], warning: null };
  }

  const seen = new Set();
  const jobs = [];
  const warnings = [];

  for (const search of queries) {
    const params = new URLSearchParams({
      category: "software-dev",
      search,
      limit: String(Math.min(Math.max(Number(limit) || 10, 1), 20)),
    });

    try {
      const response = await fetch(`${REMOTIVE_BASE_URL}?${params.toString()}`, {
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        warnings.push(`${search}: HTTP ${response.status}`);
        continue;
      }

      const data = await response.json();
      const rawJobs = Array.isArray(data.jobs) ? data.jobs : [];

      for (const job of rawJobs) {
        const applyUrl = normalizeText(job.url);
        const title = normalizeText(job.title);
        if (!applyUrl || !title) {
          continue;
        }

        const dedupeKey = `remotive:${applyUrl}`;
        if (seen.has(dedupeKey)) {
          continue;
        }

        seen.add(dedupeKey);
        jobs.push({
          source: "remotive",
          external_id: job.id ? String(job.id) : null,
          title,
          company: normalizeText(job.company_name),
          location: normalizeText(job.candidate_required_location) || "Remote",
          job_type: normalizeText(job.job_type),
          industry: "tech",
          employment_type: normalizeText(job.job_type),
          description: normalizeText(job.description)?.slice(0, 500) || null,
          apply_url: applyUrl,
          source_url: applyUrl,
          posted_at: normalizeText(job.publication_date),
          salary_min: null,
          salary_max: null,
          raw_publisher: "Remotive",
        });
      }
    } catch (error) {
      warnings.push(`${search}: ${error.message}`);
    }
  }

  if (jobs.length > 0) {
    return { jobs, warning: null };
  }

  if (warnings.length > 0) {
    return { jobs: [], warning: { source: "remotive", message: warnings.join(" | ") } };
  }

  return { jobs: [], warning: null };
}

module.exports = { fetchRemotiveJobs };
