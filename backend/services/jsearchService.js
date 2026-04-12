// Fetches jobs from JSearch API (RapidAPI) - aggregates LinkedIn, Indeed, Glassdoor
// Docs: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch

async function fetchJSearchJobs({ query, location, jobType, industry, limit = 10 }) {
  const apiKey = process.env.JSEARCH_API_KEY;
  if (!apiKey) {
    return { jobs: [], warning: { source: 'jsearch', message: 'JSEARCH_API_KEY not set' } };
  }

  // Build a combined search query for Israel
  const searchQuery = [query, industry, location].filter(Boolean).join(" ") || "jobs in Israel";

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
