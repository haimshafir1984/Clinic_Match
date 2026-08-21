import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MarketJob } from "@/types";
import { ArrowUpDown, FilterX } from "lucide-react";

export type ExternalJobSort = "relevance" | "newest" | "salary";

export interface ExternalJobFilterState {
  location: string;
  jobType: string;
  source: string;
  arrangement: string;
  sort: ExternalJobSort;
}

export const DEFAULT_EXTERNAL_JOB_FILTERS: ExternalJobFilterState = {
  location: "all",
  jobType: "all",
  source: "all",
  arrangement: "all",
  sort: "relevance",
};

// Exported so useMarketJobs can render a human source name in import
// warnings instead of the raw backend source id (e.g. "jobmaster").
export const SOURCE_LABELS: Record<string, string> = {
  indeed: "Indeed",
  linkedin: "LinkedIn",
  glassdoor: "Glassdoor",
  ziprecruiter: "ZipRecruiter",
  monster: "Monster",
  remotive: "Remotive",
  drushim: "דרושים IL",
  jobmaster: "JobMaster",
  alljobs: "AllJobs",
  jsearch: "JSearch",
};

const JOB_TYPE_LABELS: Record<string, string> = {
  daily: "יומי",
  temporary: "זמני",
  permanent: "קבוע",
  full_time: "משרה מלאה",
  part_time: "משרה חלקית",
  contract: "חוזה",
};

const ARRANGEMENT_LABELS: Record<string, string> = {
  remote: "מרחוק",
  hybrid: "היברידי",
  onsite: "מהמשרד",
};

const SORT_LABELS: Record<ExternalJobSort, string> = {
  relevance: "רלוונטיות",
  newest: "הכי חדשות",
  salary: "שכר גבוה",
};

function salaryValue(job: MarketJob) {
  return job.salaryMax ?? job.salaryMin ?? null;
}

/**
 * Applies the filter/sort state to a job list. Exported separately from the
 * component so the page can derive its deck without rendering concerns.
 */
export function applyExternalJobFilters(
  jobs: MarketJob[],
  filters: ExternalJobFilterState
): MarketJob[] {
  const filtered = jobs.filter((job) => {
    if (filters.location !== "all" && job.location !== filters.location) return false;
    if (filters.jobType !== "all" && job.jobType !== filters.jobType) return false;
    if (filters.source !== "all" && job.source !== filters.source) return false;
    if (filters.arrangement !== "all" && job.workArrangement !== filters.arrangement) return false;
    return true;
  });

  const sorted = [...filtered];
  if (filters.sort === "newest") {
    sorted.sort((a, b) => {
      // Jobs without a date sink to the bottom rather than sorting as epoch 0.
      const aTime = a.postedAt ? new Date(a.postedAt).getTime() : Number.NEGATIVE_INFINITY;
      const bTime = b.postedAt ? new Date(b.postedAt).getTime() : Number.NEGATIVE_INFINITY;
      return bTime - aTime;
    });
  } else if (filters.sort === "salary") {
    sorted.sort((a, b) => {
      const aSalary = salaryValue(a);
      const bSalary = salaryValue(b);
      if (aSalary === null && bSalary === null) return 0;
      if (aSalary === null) return 1;
      if (bSalary === null) return -1;
      return bSalary - aSalary;
    });
  } else {
    sorted.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
  }

  return sorted;
}

interface ExternalJobFiltersProps {
  jobs: MarketJob[];
  value: ExternalJobFilterState;
  onChange: (next: ExternalJobFilterState) => void;
  resultCount: number;
}

export function ExternalJobFilters({ jobs, value, onChange, resultCount }: ExternalJobFiltersProps) {
  // Options come from the jobs actually in hand, so the user never picks a
  // filter that can only return zero results.
  const options = useMemo(() => {
    const collect = (pick: (job: MarketJob) => string | null | undefined) =>
      [...new Set(jobs.map(pick).filter((entry): entry is string => Boolean(entry)))].sort();

    return {
      locations: collect((job) => job.location),
      jobTypes: collect((job) => job.jobType),
      sources: collect((job) => job.source),
      arrangements: collect((job) => job.workArrangement),
    };
  }, [jobs]);

  const isFiltered =
    value.location !== "all" ||
    value.jobType !== "all" ||
    value.source !== "all" ||
    value.arrangement !== "all";

  const set = (patch: Partial<ExternalJobFilterState>) => onChange({ ...value, ...patch });

  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ArrowUpDown className="h-4 w-4 text-primary" />
          סינון ומיון
        </div>
        {isFiltered ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => onChange({ ...DEFAULT_EXTERNAL_JOB_FILTERS, sort: value.sort })}
          >
            <FilterX className="h-3.5 w-3.5" />
            נקה סינון
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Select value={value.sort} onValueChange={(next) => set({ sort: next as ExternalJobSort })}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="מיון" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORT_LABELS) as ExternalJobSort[]).map((key) => (
              <SelectItem key={key} value={key} className="text-xs">
                {SORT_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {options.locations.length > 1 ? (
          <Select value={value.location} onValueChange={(next) => set({ location: next })}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="אזור" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">כל האזורים</SelectItem>
              {options.locations.map((location) => (
                <SelectItem key={location} value={location} className="text-xs">
                  {location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        {options.jobTypes.length > 1 ? (
          <Select value={value.jobType} onValueChange={(next) => set({ jobType: next })}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="סוג משרה" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">כל סוגי המשרה</SelectItem>
              {options.jobTypes.map((jobType) => (
                <SelectItem key={jobType} value={jobType} className="text-xs">
                  {JOB_TYPE_LABELS[jobType] || jobType}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        {options.arrangements.length > 1 ? (
          <Select value={value.arrangement} onValueChange={(next) => set({ arrangement: next })}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="אופן עבודה" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">כל אופני העבודה</SelectItem>
              {options.arrangements.map((arrangement) => (
                <SelectItem key={arrangement} value={arrangement} className="text-xs">
                  {ARRANGEMENT_LABELS[arrangement] || arrangement}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        {options.sources.length > 1 ? (
          <Select value={value.source} onValueChange={(next) => set({ source: next })}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="מקור" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">כל המקורות</SelectItem>
              {options.sources.map((source) => (
                <SelectItem key={source} value={source} className="text-xs">
                  {SOURCE_LABELS[source] || source}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      {isFiltered ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {resultCount > 0
            ? `${resultCount} מתוך ${jobs.length} משרות תואמות לסינון`
            : "אין משרות שתואמות לסינון הנוכחי"}
        </p>
      ) : null}
    </div>
  );
}
