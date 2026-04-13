import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bookmark,
  BriefcaseBusiness,
  Heart,
  RefreshCw,
  SearchX,
  Users,
} from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { MatchCard } from "@/components/matches/MatchCard";
import { ExternalJobSwipeCard } from "@/components/matches/ExternalJobSwipeCard";
import { SwipeActions } from "@/components/swipe/SwipeActions";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useMarketJobs } from "@/hooks/useMarketJobs";
import { useMatches } from "@/hooks/useMatches";
import { useTalentPool } from "@/hooks/useTalentPool";
import { MarketJob, Match } from "@/types";

function MatchesSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((item) => (
        <div key={item} className="flex items-center gap-4 rounded-lg border bg-card p-4">
          <Skeleton className="h-14 w-14 flex-shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-10 w-10 flex-shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function ExternalJobsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-card p-4">
        <Skeleton className="mb-2 h-5 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="rounded-2xl border bg-card/40 p-4">
        <Skeleton className="h-[560px] rounded-xl" />
        <div className="mt-4 flex justify-center gap-6">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-20 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default function Matches() {
  const { currentUser } = useAuth();
  const { matches, isLoading } = useMatches();
  const { talentPool, saveToTalentPool } = useTalentPool();
  const {
    jobs: marketJobs,
    isLoading: marketJobsLoading,
    isRefreshing: marketJobsRefreshing,
    refreshFromSites,
    filters,
    importWarnings,
    error: marketJobsError,
  } = useMarketJobs();

  const isClinic = currentUser?.role === "clinic";
  const [externalJobIndex, setExternalJobIndex] = useState(0);
  const [externalSwipeDirection, setExternalSwipeDirection] = useState<"left" | "right" | null>(null);

  const activeMatches = matches.filter((match) => !match.isClosed);
  const closedMatches = matches.filter((match) => match.isClosed);
  const currentExternalJob = marketJobs[externalJobIndex];
  const hasMoreExternalJobs = externalJobIndex < marketJobs.length;

  useEffect(() => {
    setExternalJobIndex(0);
    setExternalSwipeDirection(null);
  }, [marketJobs.length, filters.query, filters.location, filters.industry, filters.jobType]);

  const handleSaveToTalentPool = async (match: Match) => {
    try {
      await saveToTalentPool({
        candidateId: match.otherProfile.id,
        matchId: match.id,
        tags: [match.otherProfile.position || "מועמד/ת"],
      });
      toast.success("המועמד/ת נשמרו ל-Talent Pool");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "שמירה ל-Talent Pool נכשלה");
    }
  };

  const marketJobsWarnings = importWarnings.length > 0 ? (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <div className="mb-1 font-medium">חלק ממקורות החיפוש לא החזירו תוצאות כרגע</div>
      <div className="space-y-1">
        {importWarnings.map((warning) => (
          <p key={warning}>{warning}</p>
        ))}
      </div>
    </div>
  ) : null;

  const resetExternalJobsFlow = () => {
    setExternalJobIndex(0);
    setExternalSwipeDirection(null);
  };

  const handleRefreshMarketJobs = async () => {
    try {
      resetExternalJobsFlow();
      await refreshFromSites();
      toast.success("רשימת המשרות מאתרים עודכנה");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "רענון המשרות מאתרים נכשל");
    }
  };

  const advanceExternalJob = () => {
    setTimeout(() => {
      setExternalSwipeDirection(null);
      setExternalJobIndex((prev) => prev + 1);
    }, 260);
  };

  const openExternalJob = (job: MarketJob) => {
    if (typeof window !== "undefined") {
      window.open(job.applyUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleExternalJobLike = () => {
    if (!currentExternalJob) return;

    setExternalSwipeDirection("right");
    openExternalJob(currentExternalJob);
    advanceExternalJob();
  };

  const handleExternalJobPass = () => {
    if (!currentExternalJob) return;

    setExternalSwipeDirection("left");
    advanceExternalJob();
  };

  const matchesContent = isLoading ? (
    <MatchesSkeleton />
  ) : activeMatches.length === 0 && closedMatches.length === 0 ? (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-16 text-center">
      <motion.div
        className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 3 }}
      >
        <Heart className="h-12 w-12 text-primary" />
      </motion.div>

      <h3 className="mb-2 text-xl font-semibold">עדיין אין לך התאמות</h3>
      <p className="mx-auto mb-8 max-w-xs text-muted-foreground">
        המשיכו לסמן עניין בפרופילים מתאימים. ברגע ששני הצדדים מסמנים לייק, ההתאמה תופיע כאן.
      </p>

      <Link to="/swipe">
        <Button className="gap-2">
          חזרה לגילוי פרופילים
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </Link>
    </motion.div>
  ) : (
    <div className="space-y-6">
      {activeMatches.length > 0 ? (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-medium text-muted-foreground">{`התאמות פעילות (${activeMatches.length})`}</h2>
          </div>
          <div className="space-y-3">
            {activeMatches.map((match, index) => (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <MatchCard match={match} canSave={isClinic} onSaveToTalentPool={handleSaveToTalentPool} />
              </motion.div>
            ))}
          </div>
        </section>
      ) : null}

      {closedMatches.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">{`התאמות שנסגרו (${closedMatches.length})`}</h2>
          <div className="space-y-3 opacity-60">
            {closedMatches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );

  const marketJobsContent = marketJobsLoading ? (
    <ExternalJobsSkeleton />
  ) : marketJobs.length === 0 ? (
    <div className="py-16 text-center">
      <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
        <SearchX className="h-10 w-10 text-primary" />
      </div>
      <h3 className="mb-2 text-xl font-semibold">עדיין לא נמצאו משרות חיצוניות</h3>
      <p className="mx-auto mb-6 max-w-sm text-muted-foreground">
        נחפש לפי הפרופיל שלך באתרים חיצוניים. אפשר לרענן כדי למשוך משרות חדשות לפי התפקיד, המיקום וסוג העבודה שלך.
      </p>
      <Button onClick={handleRefreshMarketJobs} disabled={marketJobsRefreshing} className="gap-2">
        <RefreshCw className={`h-4 w-4 ${marketJobsRefreshing ? "animate-spin" : ""}`} />
        חפש משרות מאתרים
      </Button>
      {marketJobsError instanceof Error ? (
        <p className="mt-4 text-sm text-destructive">{marketJobsError.message}</p>
      ) : null}
      {marketJobsWarnings ? <div className="mt-4 text-start">{marketJobsWarnings}</div> : null}
    </div>
  ) : (
    <div className="space-y-4">
      {marketJobsWarnings}

      <div className="flex items-start justify-between gap-4 rounded-xl border bg-card p-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm font-medium">
            <BriefcaseBusiness className="h-4 w-4 text-primary" />
            התאמות מאתרים
          </div>
          <p className="text-sm text-muted-foreground">
            {`נמצאו ${marketJobs.length} משרות חיצוניות לפי ${filters.query || "הפרופיל שלך"}${filters.location ? ` באזור ${filters.location}` : ""}.`}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshMarketJobs}
          disabled={marketJobsRefreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${marketJobsRefreshing ? "animate-spin" : ""}`} />
          רענון
        </Button>
      </div>

      <div className="rounded-2xl border bg-card/40 p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">{`משרה ${Math.min(externalJobIndex + 1, marketJobs.length)} מתוך ${marketJobs.length}`}</p>
            <p className="text-xs text-muted-foreground">החלקה ימינה תפתח את עמוד המשרה, שמאלה תדלג למשרה הבאה.</p>
          </div>
        </div>

        <div className="relative h-[560px]">
          <AnimatePresence mode="popLayout">
            {hasMoreExternalJobs && currentExternalJob ? (
              <ExternalJobSwipeCard
                key={currentExternalJob.id}
                job={currentExternalJob}
                direction={externalSwipeDirection}
                onSwipeLeft={handleExternalJobPass}
                onSwipeRight={handleExternalJobLike}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed bg-background/70 px-6 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <BriefcaseBusiness className="h-8 w-8 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">סיימת לעבור על המשרות שמצאנו</h3>
                <p className="mb-5 max-w-sm text-sm text-muted-foreground">
                  אפשר לרענן כדי למשוך משרות חדשות מאתרים, או לחזור ללשונית ההתאמות במערכת.
                </p>
                <Button onClick={handleRefreshMarketJobs} disabled={marketJobsRefreshing} className="gap-2">
                  <RefreshCw className={`h-4 w-4 ${marketJobsRefreshing ? "animate-spin" : ""}`} />
                  מצא משרות נוספות
                </Button>
              </div>
            )}
          </AnimatePresence>
        </div>

        {hasMoreExternalJobs ? (
          <SwipeActions
            onPass={handleExternalJobPass}
            onLike={handleExternalJobLike}
            disabled={marketJobsRefreshing}
          />
        ) : null}
      </div>
    </div>
  );

  const workerTabs = !isClinic ? (
    <Tabs defaultValue="system" className="mt-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="system">התאמות במערכת</TabsTrigger>
        <TabsTrigger value="external">התאמות מאתרים</TabsTrigger>
      </TabsList>
      <TabsContent value="system">{matchesContent}</TabsContent>
      <TabsContent value="external">{marketJobsContent}</TabsContent>
    </Tabs>
  ) : null;

  return (
    <AppLayout>
      <div className="mx-auto max-w-md p-4 pb-24">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">ההתאמות שלי</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoading
              ? "טוען התאמות..."
              : activeMatches.length > 0
                ? `יש לך ${activeMatches.length} התאמות פעילות`
                : "עדיין אין התאמות. ממשיכים לגלות פרופילים."}
          </p>
        </div>

        {isClinic ? (
          <div className="mb-4 rounded-xl border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Bookmark className="h-4 w-4 text-primary" />
              Talent Pool
            </div>
            <p className="text-sm text-muted-foreground">כרגע שמורים {talentPool.length} מועמדים לעבודה עתידית.</p>
          </div>
        ) : null}

        {isClinic ? matchesContent : workerTabs}
      </div>
    </AppLayout>
  );
}
