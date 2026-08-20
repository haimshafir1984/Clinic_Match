import { describe, it, expect } from "vitest";
import {
  applyExternalJobFilters,
  DEFAULT_EXTERNAL_JOB_FILTERS,
} from "@/components/matches/ExternalJobFilters";
import type { MarketJob } from "@/types";

const job = (over: Partial<MarketJob>): MarketJob => ({
  id: "1", source: "jobmaster", externalId: null, title: "t", company: null,
  location: "תל אביב", jobType: "permanent", industry: null, employmentType: null,
  description: null, applyUrl: "u", sourceUrl: null, salaryMin: null, salaryMax: null,
  postedAt: null, fetchedAt: "2026-08-01T00:00:00Z", ...over,
});

describe("applyExternalJobFilters", () => {
  const jobs = [
    job({ id: "a", location: "חיפה", source: "drushim", matchScore: 40, postedAt: "2026-08-10T00:00:00Z", salaryMax: 90 }),
    job({ id: "b", location: "תל אביב", source: "jobmaster", matchScore: 90, postedAt: "2026-08-01T00:00:00Z", salaryMax: 50 }),
    job({ id: "c", location: "תל אביב", source: "jsearch", matchScore: 70, postedAt: null, salaryMax: null }),
  ];

  it("defaults to sorting by relevance", () => {
    const out = applyExternalJobFilters(jobs, DEFAULT_EXTERNAL_JOB_FILTERS);
    expect(out.map((j) => j.id)).toEqual(["b", "c", "a"]);
  });

  it("filters by location", () => {
    const out = applyExternalJobFilters(jobs, { ...DEFAULT_EXTERNAL_JOB_FILTERS, location: "תל אביב" });
    expect(out.map((j) => j.id).sort()).toEqual(["b", "c"]);
  });

  it("filters by source", () => {
    const out = applyExternalJobFilters(jobs, { ...DEFAULT_EXTERNAL_JOB_FILTERS, source: "drushim" });
    expect(out.map((j) => j.id)).toEqual(["a"]);
  });

  it("sorts newest first and sinks undated jobs to the bottom", () => {
    const out = applyExternalJobFilters(jobs, { ...DEFAULT_EXTERNAL_JOB_FILTERS, sort: "newest" });
    expect(out.map((j) => j.id)).toEqual(["a", "b", "c"]);
  });

  it("sorts by salary and sinks jobs without salary to the bottom", () => {
    const out = applyExternalJobFilters(jobs, { ...DEFAULT_EXTERNAL_JOB_FILTERS, sort: "salary" });
    expect(out.map((j) => j.id)).toEqual(["a", "b", "c"]);
  });

  it("returns an empty list when filters exclude everything", () => {
    const out = applyExternalJobFilters(jobs, { ...DEFAULT_EXTERNAL_JOB_FILTERS, location: "אילת" });
    expect(out).toEqual([]);
  });

  it("does not mutate the input array", () => {
    const original = [...jobs];
    applyExternalJobFilters(jobs, { ...DEFAULT_EXTERNAL_JOB_FILTERS, sort: "newest" });
    expect(jobs).toEqual(original);
  });
});
