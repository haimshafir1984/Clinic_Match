import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MarketJob } from "@/types";
import { Building2, ExternalLink, MapPin, RefreshCw, Sparkles } from "lucide-react";

interface ExternalJobDetailsDialogProps {
  job: MarketJob | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenJob: (job: MarketJob) => void;
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

const arrangementLabels: Record<string, string> = {
  remote: "מרחוק",
  hybrid: "היברידי",
  onsite: "מהמשרד",
};

function formatDescription(text: string | null) {
  if (!text) return [];

  return text
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function ExternalJobDetailsDialog({
  job,
  open,
  onOpenChange,
  onOpenJob,
}: ExternalJobDetailsDialogProps) {
  if (!job) {
    return null;
  }

  const sourceLabel = sourceLabels[job.source] || job.publisher || job.source;
  const descriptionParts = formatDescription(job.description);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-hidden p-0 sm:rounded-2xl">
        <div className="flex max-h-[88vh] flex-col">
          <div className="border-b bg-gradient-to-br from-primary/10 via-background to-accent/30 px-6 py-5">
            <DialogHeader className="gap-3 text-right sm:text-right">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{sourceLabel}</Badge>
                {job.industry ? <Badge variant="secondary">{job.industry}</Badge> : null}
                {job.workArrangement ? (
                  <Badge variant="secondary">{arrangementLabels[job.workArrangement] || job.workArrangement}</Badge>
                ) : null}
                {job.freshnessLabel ? <Badge variant="secondary">{job.freshnessLabel}</Badge> : null}
              </div>
              <DialogTitle className="text-right text-2xl leading-tight">{job.title}</DialogTitle>
              <DialogDescription className="text-right">
                פתחתי כאן את כל פרטי המשרה כדי שתוכל להחליט לפני מעבר לאתר החיצוני.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {job.company ? (
                <div className="rounded-xl border bg-card p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Building2 className="h-4 w-4 text-primary" />
                    חברה
                  </div>
                  <p className="font-medium">{job.company}</p>
                </div>
              ) : null}

              {job.location ? (
                <div className="rounded-xl border bg-card p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <MapPin className="h-4 w-4 text-primary" />
                    מיקום
                  </div>
                  <p className="font-medium">{job.location}</p>
                </div>
              ) : null}
            </div>

            <section className="rounded-xl border bg-card p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                למה המשרה מתאימה לך
              </div>
              {job.fitReasons && job.fitReasons.length > 0 ? (
                <div className="space-y-2">
                  {job.fitReasons.map((reason) => (
                    <div key={reason} className="rounded-lg bg-primary/5 px-3 py-2 text-sm">
                      {reason}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  לא נאספו עדיין סיבות מפורטות, אבל המשרה עברה את מסנני התפקיד, המיקום והתחום שלך.
                </p>
              )}
            </section>

            <section className="rounded-xl border bg-card p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <RefreshCw className="h-4 w-4 text-primary" />
                תיאור המשרה
              </div>
              {descriptionParts.length > 0 ? (
                <div className="space-y-3 text-sm leading-7 text-foreground">
                  {descriptionParts.map((part, index) => (
                    <p key={`${job.id}-${index}`}>{part}</p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">לא התקבל תיאור מלא מהמשרה החיצונית.</p>
              )}
            </section>
          </div>

          <DialogFooter className="border-t bg-background px-6 py-4 sm:justify-between sm:space-x-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              סגור
            </Button>
            <Button className="gap-2" onClick={() => onOpenJob(job)}>
              מעבר למשרה
              <ExternalLink className="h-4 w-4" />
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
