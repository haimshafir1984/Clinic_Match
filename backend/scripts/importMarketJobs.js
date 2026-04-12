const { Pool } = require("pg");
const { importMarketJobs } = require("../services/marketJobsService");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function getArg(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

(async () => {
  const result = await importMarketJobs(pool, {
    query: getArg("query"),
    location: getArg("location"),
    industry: getArg("industry"),
    jobType: getArg("jobType"),
    limit: getArg("limit"),
  });

  console.log(JSON.stringify(result, null, 2));
  await pool.end();
})().catch(async (error) => {
  console.error("Market jobs import failed:", error);
  await pool.end().catch(() => {});
  process.exit(1);
});
