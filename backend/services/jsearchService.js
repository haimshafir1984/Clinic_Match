const TECH_QUERY_VARIANTS = [
  {
    terms: ["devops", "\u05d3\u05d1\u05d0\u05d5\u05e4\u05e1"],
    variants: ["DevOps Engineer", "Platform Engineer", "Site Reliability Engineer", "Cloud Engineer"],
  },
  {
    terms: ["\u05de\u05e0\u05d4\u05dc/\u05ea \u05de\u05d5\u05e6\u05e8", "\u05de\u05e0\u05d4\u05dc \u05de\u05d5\u05e6\u05e8", "\u05de\u05e0\u05d4\u05dc\u05ea \u05de\u05d5\u05e6\u05e8", "product manager"],
    variants: ["Product Manager", "Technical Product Manager", "Product Owner"],
  },
  {
    terms: ["backend", "\u05d1\u05e7\u05d0\u05e0\u05d3", "\u05e9\u05e8\u05ea"],
    variants: ["Backend Developer", "Backend Engineer", "Software Engineer"],
  },
  {
    terms: ["frontend", "\u05e4\u05e8\u05d5\u05e0\u05d8\u05d0\u05e0\u05d3", "\u05e7\u05dc\u05d9\u05d9\u05e0\u05d8"],
    variants: ["Frontend Developer", "Frontend Engineer", "React Developer"],
  },
  {
    terms: ["full stack", "fullstack", "\u05e4\u05d5\u05dc \u05e1\u05d8\u05d90\u05e7"],
    variants: ["Full Stack Developer", "Software Engineer"],
  },
  {
    terms: ["qa", "\u05d1\u05d5\u05d3\u05e7", "\u05d1\u05d5\u05d3\u05e7\u05ea"],
    variants: ["QA Engineer", "Software QA Engineer", "Automation Engineer"],
  },
  {
    terms: ["data", "\u05d3\u05d0\u05d8\u05d4", "\u05d0\u05e0\u05dc\u05d9\u05e1\u05d8"],
    variants: ["Data Analyst", "Data Engineer", "Business Intelligence Analyst"],
  },
];

function normalizeText(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeJSearchSource(job) {
  const publisher = normalizeText(job.job_publisher) || normalizeText(job.job_source) || normalizeText(job.job_board) || "";
  const applyUrl = normalizeText(job.job_apply_link) || normalizeText(job.job_google_link) || "";
  const lowerPublisher = publisher.toLowerCase();
  const lowerUrl = applyUrl.toLowerCase();

  if (lowerPublisher.includes("linkedin") || lowerUrl.includes("linkedin.com")) {
    return "linkedin";
  }
  if (lowerPublisher.includes("indeed") || lowerUrl.includes("indeed.")) {
    return "indeed";
  }
  if (lowerPublisher.includes("glassdoor") || lowerUrl.includes("glassdoor.")) {
    return "glassdoor";
  }
  if (lowerPublisher.includes("ziprecruiter") || lowerUrl.includes("ziprecruiter.")) {
    return "ziprecruiter";
  }
  if (lowerPublisher.includes("monster") || lowerUrl.includes("monster.")) {
    return "monster";
  }

  return "jsearch";
}

function buildQueryVariants({ query, industry, location }) {
  const normalizedQuery = normalizeText(query);
  const normalizedIndustry = normalizeText(industry);
  const normalizedLocation = normalizeText(location);
  const variants = [];

  if (normalizedQuery) {
    variants.push(normalizedQuery);
  }

  const lowerQuery = (normalizedQuery || "").toLowerCase();
  const techAliases = TECH_QUERY_VARIANTS.find((entry) =>
    entry.terms.some((term) => lowerQuery.includes(term.toLowerCase()))
  );

  if (techAliases) {
    variants.push(...techAliases.variants);
  }

  if (!variants.length && normalizedIndustry === "tech") {
    variants.push("Software Engineer", "Product Manager", "DevOps Engineer");
  }

  const uniqueVariants = [...new Set(variants.filter(Boolean))].slice(0, 4);
  if (!uniqueVariants.length) {
    uniqueVariants.push("jobs");
  }

  return uniqueVariants.map((baseQuery) =>
    [baseQuery, normalizedIndustry && normalizedIndustry !== "tech" ? normalizedIndustry : null, normalizedLocation]
      .filter(Boolean)
      .join(" ")
  );
}

async function fetchSingleSearch(apiKey, searchQuery, limit) {
  const params = new URLSearchParams({
    query: searchQuery,
    page: "1",
    num_pages: "1",
    country: "il",
    date_posted: "month",
  });

  const response = await fetch(`https://jsearch.p.rapidapi.com/search?${params.toString()}`, {
    headers: {
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  return (data.data || []).slice(0, limit);
}

async function fetchJSearchJobs({ query, location, jobType, industry, limit = 10 }) {
  const apiKey = process.env.JSEARCH_API_KEY;
  if (!apiKey) {
    return { jobs: [], warning: { source: "jsearch", message: "JSEARCH_API_KEY not set" } };
  }

  const effectiveLimit = Math.min(Math.max(Number(limit) || 10, 1), 30);
  const queries = buildQueryVariants({ query, industry, location });
  const seen = new Set();
  const jobs = [];
  const warnings = [];

  for (const searchQuery of queries) {
    try {
      const rawJobs = await fetchSingleSearch(apiKey, searchQuery, effectiveLimit);

      for (const job of rawJobs) {
        const applyUrl = normalizeText(job.job_apply_link) || normalizeText(job.job_google_link);
        const title = normalizeText(job.job_title);
        if (!applyUrl || !title) {
          continue;
        }

        const source = normalizeJSearchSource(job);
        const dedupeKey = `${source}:${applyUrl}`;
        if (seen.has(dedupeKey)) {
          continue;
        }

        seen.add(dedupeKey);
        jobs.push({
          source,
          external_id: job.job_id || null,
          title,
          company: normalizeText(job.employer_name),
          location: normalizeText(job.job_city) || normalizeText(job.job_country) || normalizeText(location),
          job_type: normalizeText(job.job_employment_type) || normalizeText(jobType),
          industry: normalizeText(industry),
          employment_type: normalizeText(job.job_employment_type),
          description: normalizeText(job.job_description)?.slice(0, 500) || null,
          apply_url: applyUrl,
          source_url: applyUrl,
          posted_at: normalizeText(job.job_posted_at_datetime_utc),
          salary_min: job.job_min_salary ? Math.round(job.job_min_salary) : null,
          salary_max: job.job_max_salary ? Math.round(job.job_max_salary) : null,
          raw_publisher: normalizeText(job.job_publisher) || null,
        });
      }
    } catch (error) {
      warnings.push(`${searchQuery}: ${error.message}`);
    }
  }

  if (jobs.length > 0) {
    return { jobs: jobs.slice(0, effectiveLimit), warning: null };
  }

  if (warnings.length > 0) {
    return { jobs: [], warning: { source: "jsearch", message: warnings.join(" | ") } };
  }

  return { jobs: [], warning: null };
}

module.exports = { fetchJSearchJobs };
