import { motion, PanInfo, useMotionValue, useTransform } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MarketJob } from "@/types";
import {
  BriefcaseBusiness,
  Building2,
  ExternalLink,
  MapPin,
  RefreshCw,
  Sparkles,
} from "lucide-react";

interface ExternalJobSwipeCardProps {
  job: MarketJob;
  direction: "left" | "right" | null;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onOpenDetails: () => void;
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

const arrangementLabels: Record<string, string> = {
  remote: "מרחוק",
  hybrid: "היברידי",
  onsite: "מהמשרד",
};

function getFitLabel(score: number | null | undefined) {
  if (score === null || score === undefined) return null;
  if (score >= 75) return "התאמה גבוהה";
  if (score >= 55) return "התאמה טובה";
  return "התאמה חלקית";
}

export function ExternalJobSwipeCard({
  job,
  direction,
  onSwipeLeft,
  onSwipeRight,
  onOpenDetails,
}: ExternalJobSwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const passOpacity = useTransform(x, [-100, 0], [1, 0]);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = typeof window !== "undefined" ? window.innerWidth * 0.22 : 100;
    if (info.offset.x > threshold) onSwipeRight();
    if (info.offset.x < -threshold) onSwipeLeft();
  };

  const variants = {
    initial: { scale: 0.96, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit:
      direction === "right"
        ? { x: 340, rotate: 16, opacity: 0 }
        : direction === "left"
          ? { x: -340, rotate: -16, opacity: 0 }
          : { opacity: 0 },
  };

  const sourceLabel = sourceLabels[job.source] || job.publisher || job.source;
  const jobTypeLabel = job.jobType ? jobTypeLabels[job.jobType] || job.jobType : null;
  const fitLabel = getFitLabel(job.matchScore);

  return (
    <motion.div
      className="absolute inset-0 touch-pan-y"
      style={{ x, rotate, touchAction: "pan-y" }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <motion.div
        className="absolute right-4 top-4 z-10 rotate-12 rounded-lg border-4 border-primary bg-primary px-4 py-2 text-sm font-bold text-primary-foreground sm:right-6 sm:top-6 sm:px-6 sm:text-xl"
        style={{ opacity: likeOpacity }}
      >
        פתח משרה
      </motion.div>
      <motion.div
        className="absolute left-4 top-4 z-10 -rotate-12 rounded-lg border-4 border-destructive bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground sm:left-6 sm:top-6 sm:px-6 sm:text-xl"
        style={{ opacity: passOpacity }}
      >
        דלג
      </motion.div>

      <Card className="flex h-full flex-col overflow-hidden rounded-xl border-0 shadow-2xl">
        <div className="relative flex min-h-[180px] items-center justify-center bg-gradient-to-br from-primary/15 via-accent/70 to-primary/5 p-5 sm:min-h-[190px] sm:p-6">
          <div className="w-full">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="bg-background/85 text-xs backdrop-blur">
                {sourceLabel}
              </Badge>
              {jobTypeLabel ? (
                <Badge variant="secondary" className="text-xs">
                  {jobTypeLabel}
                </Badge>
              ) : null}
              {job.workArrangement ? (
                <Badge variant="secondary" className="text-xs">
                  {arrangementLabels[job.workArrangement] || job.workArrangement}
                </Badge>
              ) : null}
              {fitLabel ? (
                <Badge variant="secondary" className="text-xs">
                  {fitLabel}
                </Badge>
              ) : null}
            </div>

            <h2 className="line-clamp-3 text-xl font-bold text-foreground sm:text-2xl">{job.title}</h2>
            {job.company ? (
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4 text-primary" />
                <span>{job.company}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <div className="space-y-3">
            {job.location ? (
              <div className="flex items-center gap-2 rounded-xl border border-primary/15 bg-primary/5 p-3">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{job.location}</span>
              </div>
            ) : null}

            {job.fitReasons && job.fitReasons.length > 0 ? (
              <div className="rounded-xl border border-primary/15 bg-primary/5 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4 text-primary" />
                  למה המשרה מתאימה לך
                </div>
                <div className="space-y-2">
                  {job.fitReasons.slice(0, 3).map((reason) => (
                    <p key={reason} className="text-sm text-muted-foreground">
                      {reason}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}

            {job.description ? (
              <div className="rounded-xl border border-primary/15 bg-primary/5 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <BriefcaseBusiness className="h-4 w-4 text-primary" />
                  תקציר המשרה
                </div>
                <p className="line-clamp-5 text-sm text-muted-foreground">{job.description}</p>
              </div>
            ) : null}
          </div>

          <div className="mt-auto space-y-3 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-3.5 w-3.5" />
                <span>{job.freshnessLabel || `נמשך מהאתר ב-${new Date(job.fetchedAt).toLocaleDateString("he-IL")}`}</span>
              </div>
              {job.matchScore !== null && job.matchScore !== undefined ? (
                <span className="font-medium text-foreground">{`ציון התאמה ${job.matchScore}%`}</span>
              ) : null}
            </div>

            <Button variant="outline" className="w-full gap-2" onClick={onOpenDetails}>
              פרטי משרה מלאים
              <ExternalLink className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3 text-sm text-muted-foreground">
              <ExternalLink className="h-4 w-4 text-primary" />
              <span>החלקה ימינה תפתח את המשרה באתר, שמאלה תעבור למשרה הבאה.</span>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
