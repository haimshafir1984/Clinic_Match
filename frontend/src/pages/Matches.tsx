import { AppLayout } from "@/components/layout/AppLayout";
import { useMatches } from "@/hooks/useMatches";
import { MatchCard } from "@/components/matches/MatchCard";
import { ExternalJobCard } from "@/components/matches/ExternalJobCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Users, ArrowLeft, Bookmark, BriefcaseBusiness, RefreshCw, SearchX } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTalentPool } from "@/hooks/useTalentPool";
import { useMarketJobs } from "@/hooks/useMarketJobs";
import { toast } from "sonner";
import { Match } from "@/types";

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
      {[1, 2, 3].map((item) => (
        <div key={item} className="rounded-lg border bg-card p-4">
          <Skeleton className="mb-3 h-5 w-2/3" />
          <Skeleton className="mb-2 h-4 w-1/2" />
          <Skeleton className="mb-2 h-4 w-1/3" />
          <Skeleton className="h-10 w-28" />
        </div>
      ))}
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

  const activeMatches = matches.filter((match) => !match.isClosed);
  const closedMatches = matches.filter((match) => match.isClosed);

  const handleSaveToTalentPool = async (match: Match) => {
    try {
      await saveToTalentPool({ candidateId: match.otherProfile.id, matchId: match.id, tags: [match.otherProfile.position || "מועמד/ת"] });
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

  const handleRefreshMarketJobs = async () => {
    try {
      await refreshFromSites();
      toast.success("רשימת המשרות מאתרים עודכנה");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "רענון המשרות מאתרים נכשל");
    }
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
      {activeMatches.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-medium text-muted-foreground">{`התאמות פעילות (${activeMatches.length})`}</h2>
          </div>
          <div className="space-y-3">
            {activeMatches.map((match, index) => (
              <motion.div key={match.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                <MatchCard match={match} canSave={isClinic} onSaveToTalentPool={handleSaveToTalentPool} />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {closedMatches.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">{`התאמות שנסגרו (${closedMatches.length})`}</h2>
          <div className="space-y-3 opacity-60">
            {closedMatches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </section>
      )}
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
        <Button variant="outline" size="sm" onClick={handleRefreshMarketJobs} disabled={marketJobsRefreshing} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${marketJobsRefreshing ? "animate-spin" : ""}`} />
          רענון
        </Button>
      </div>

      <div className="space-y-3">
        {marketJobs.map((job) => (
          <ExternalJobCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  );

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
            <div className="mb-2 flex items-center gap-2 text-sm font-medium"><Bookmark className="h-4 w-4 text-primary" />Talent Pool</div>
            <p className="text-sm text-muted-foreground">כרגע שמורים {talentPool.length} מועמדים לעבודה עתידית.</p>
          </div>
        ) : null}

        {matchesContent}

        {!isClinic ? (
          <section className="mt-8 space-y-4">
            <div className="flex items-center gap-2">
              <BriefcaseBusiness className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-medium text-muted-foreground">התאמות מאתרים</h2>
            </div>
            {marketJobsContent}
          </section>
        ) : null}
      </div>
    </AppLayout>
  );
}
