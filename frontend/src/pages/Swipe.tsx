import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { SwipeCard } from "@/components/swipe/SwipeCard";
import { SwipeActions } from "@/components/swipe/SwipeActions";
import { EmptyState } from "@/components/swipe/EmptyState";
import { MatchCelebration } from "@/components/swipe/MatchCelebration";
import { NaturalLanguageSearch, SearchFilters } from "@/components/swipe/NaturalLanguageSearch";
import { useSwipeProfiles, useSwipe } from "@/hooks/useSwipeProfiles";
import { useAuth } from "@/contexts/AuthContext";
import { MatchCardData } from "@/types";
import { Loader2, AlertTriangle } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";

function filterProfiles(profiles: MatchCardData[], filters: SearchFilters | null): MatchCardData[] {
  if (!filters) return profiles;

  return profiles.filter((profile) => {
    if (filters.position && profile.position) {
      if (!profile.position.toLowerCase().includes(filters.position.toLowerCase())) {
        return false;
      }
    }

    if (filters.location && profile.location) {
      if (!profile.location.toLowerCase().includes(filters.location.toLowerCase())) {
        return false;
      }
    }

    if (filters.days && filters.days.length > 0 && profile.availability?.days) {
      const hasMatchingDay = filters.days.some((day) =>
        profile.availability.days.map((profileDay) => profileDay.toLowerCase()).includes(day.toLowerCase())
      );
      if (!hasMatchingDay) return false;
    }

    if (filters.salaryMin && profile.salaryRange?.min) {
      if (profile.salaryRange.min < filters.salaryMin) return false;
    }

    if (filters.jobType && profile.jobType) {
      if (profile.jobType !== filters.jobType) return false;
    }

    return true;
  });
}

export default function Swipe() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { profiles, isLoading, isError, error, refetch } = useSwipeProfiles();
  const { like, pass, isLoading: isSwipeLoading } = useSwipe();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);
  const [showMatchCelebration, setShowMatchCelebration] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<MatchCardData | null>(null);
  const [lastMatchId, setLastMatchId] = useState<string | null>(null);
  const [searchFilters, setSearchFilters] = useState<SearchFilters | null>(null);

  const filteredProfiles = useMemo(() => filterProfiles(profiles, searchFilters), [profiles, searchFilters]);
  const currentProfile = filteredProfiles[currentIndex];
  const hasMoreProfiles = currentIndex < filteredProfiles.length;

  const handleLike = async () => {
    if (!currentProfile || isSwipeLoading) return;

    setDirection("right");

    try {
      const result = await like(currentProfile.id);

      setTimeout(() => {
        setDirection(null);
        setCurrentIndex((prev) => prev + 1);

        if (result.isMatch) {
          setMatchedProfile(currentProfile);
          setLastMatchId(result.matchId || null);
          setShowMatchCelebration(true);
          toast.success("נוצרה התאמה חדשה");
        }
      }, 300);
    } catch {
      toast.error("שגיאה בשליחת לייק");
      setDirection(null);
    }
  };

  const handlePass = async () => {
    if (!currentProfile || isSwipeLoading) return;

    setDirection("left");

    try {
      await pass(currentProfile.id);

      setTimeout(() => {
        setDirection(null);
        setCurrentIndex((prev) => prev + 1);
      }, 300);
    } catch {
      toast.error("שגיאה בשליחת הפעולה");
      setDirection(null);
    }
  };

  const handleRefresh = () => {
    setCurrentIndex(0);
    setSearchFilters(null);
    refetch();
  };

  const handleFiltersChange = (filters: SearchFilters | null) => {
    setSearchFilters(filters);
    setCurrentIndex(0);
  };

  const handleChatWithMatch = () => {
    setShowMatchCelebration(false);
    if (lastMatchId) {
      navigate(`/chat/${lastMatchId}`);
      return;
    }

    toast.error("הצ'אט עדיין לא זמין. אפשר לפתוח אותו ממסך ההתאמות.");
    navigate("/matches");
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex h-[80vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">מחפש פרופילים מתאימים...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (isError) {
    return (
      <AppLayout>
        <div className="flex h-[80vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4 px-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">שגיאה בטעינת הפרופילים</h2>
            <p className="max-w-sm text-muted-foreground">
              {error instanceof Error ? error.message : "לא הצלחנו לטעון את הפרופילים. נסו שוב."}
            </p>
            <button
              onClick={() => refetch()}
              className="rounded-lg bg-primary px-6 py-2 text-primary-foreground transition-colors hover:bg-primary/90"
            >
              נסו שוב
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto flex h-[calc(100dvh-9rem)] max-w-md flex-col p-4">
        <div className="mb-2 text-center">
          <h1 className="text-2xl font-bold text-foreground">גלו התאמות</h1>
          <p className="text-sm text-muted-foreground">החליקו ימינה לסימון עניין, שמאלה כדי לדלג.</p>
        </div>

        <div className="mb-3">
          <NaturalLanguageSearch onFiltersChange={handleFiltersChange} role={currentUser?.role || "worker"} />
        </div>

        <div className="relative flex-1">
          <AnimatePresence mode="popLayout">
            {hasMoreProfiles && currentProfile ? (
              <SwipeCard
                key={currentProfile.id}
                profile={currentProfile}
                direction={direction}
                onSwipeLeft={handlePass}
                onSwipeRight={handleLike}
              />
            ) : (
              <EmptyState onRefresh={handleRefresh} />
            )}
          </AnimatePresence>
        </div>

        {hasMoreProfiles && <SwipeActions onPass={handlePass} onLike={handleLike} disabled={isSwipeLoading} />}
      </div>

      <MatchCelebration
        isOpen={showMatchCelebration}
        matchedProfile={matchedProfile}
        currentUser={currentUser}
        onClose={() => setShowMatchCelebration(false)}
        onChat={handleChatWithMatch}
      />
    </AppLayout>
  );
}
