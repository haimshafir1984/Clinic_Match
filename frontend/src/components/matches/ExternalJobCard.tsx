import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MarketJob } from "@/types";
import { BriefcaseBusiness, Building2, ExternalLink, MapPin, RefreshCw } from "lucide-react";

interface ExternalJobCardProps {
  job: MarketJob;
}

const sourceLabels: Record<string, string> = {
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

const jobTypeLabels: Record<string, string> = {
  daily: "יומי",
  temporary: "זמני",
  permanent: "קבוע",
  full_time: "משרה מלאה",
  part_time: "משרה חלקית",
  contract: "חוזה",
};

export function ExternalJobCard({ job }: ExternalJobCardProps) {
  const sourceLabel = sourceLabels[job.source] || job.source;
  const jobTypeLabel = job.jobType ? jobTypeLabels[job.jobType] || job.jobType : null;

  return (
    <Card className="p-4 transition-colors hover:bg-accent/30">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-foreground">{job.title}</h3>
            <Badge variant="outline" className="text-xs">
              {sourceLabel}
            </Badge>
            {jobTypeLabel ? (
              <Badge variant="secondary" className="text-xs">
                {jobTypeLabel}
              </Badge>
            ) : null}
            {job.industry ? (
              <Badge variant="secondary" className="text-xs">
                {job.industry}
              </Badge>
            ) : null}
          </div>

          <div className="space-y-1 text-sm text-muted-foreground">
            {job.company ? (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <span>{job.company}</span>
              </div>
            ) : null}
            {job.location ? (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span>{job.location}</span>
              </div>
            ) : null}
            {job.description ? (
              <div className="flex items-start gap-2">
                <BriefcaseBusiness className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                <p className="line-clamp-3">{job.description}</p>
              </div>
            ) : null}
          </div>
        </div>

        <Button asChild size="sm" className="gap-2">
          <a href={job.applyUrl} target="_blank" rel="noreferrer">
            מעבר למשרה
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <RefreshCw className="h-3.5 w-3.5" />
        <span>{`נמשך מהאתר ב-${new Date(job.fetchedAt).toLocaleDateString("he-IL")}`}</span>
      </div>
    </Card>
  );
}
