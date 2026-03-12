import { AppLayout } from "@/components/layout/AppLayout";
import { useMatches } from "@/hooks/useMatches";
import { MatchCard } from "@/components/matches/MatchCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Users, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

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

export default function Matches() {
  const { matches, isLoading } = useMatches();

  const activeMatches = matches.filter((match) => !match.isClosed);
  const closedMatches = matches.filter((match) => match.isClosed);

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

        {isLoading ? (
          <MatchesSkeleton />
        ) : activeMatches.length === 0 && closedMatches.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-16 text-center"
          >
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
                  <h2 className="text-sm font-medium text-muted-foreground">
                    {`התאמות פעילות (${activeMatches.length})`}
                  </h2>
                </div>
                <div className="space-y-3">
                  {activeMatches.map((match, index) => (
                    <motion.div
                      key={match.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <MatchCard match={match} />
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {closedMatches.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                  {`התאמות שנסגרו (${closedMatches.length})`}
                </h2>
                <div className="space-y-3 opacity-60">
                  {closedMatches.map((match) => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
