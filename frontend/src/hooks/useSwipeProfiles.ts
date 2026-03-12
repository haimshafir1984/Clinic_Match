import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { getFeed, postSwipe } from "@/lib/api";
import { MatchCardData, SwipeType } from "@/types";
import { toast } from "sonner";

export function useSwipeProfiles() {
  const { currentUser } = useAuth();

  const query = useQuery({
    queryKey: ["swipe-profiles", currentUser?.profileId, currentUser?.role],
    queryFn: async () => {
      if (!currentUser) return [];
      return getFeed(currentUser);
    },
    enabled: !!currentUser?.profileId,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  return {
    profiles: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useSwipe() {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();

  const swipeMutation = useMutation({
    mutationFn: async ({ targetId, type }: { targetId: string; type: SwipeType }) => {
      if (!currentUser?.profileId) {
        throw new Error("לא מחובר/ת. צריך להתחבר מחדש.");
      }

      if (!targetId) {
        throw new Error("מזהה משתמש לא תקין.");
      }

      return postSwipe({
        swiperId: currentUser.profileId,
        swipedId: targetId,
        type,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["swipe-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
    onError: (error: Error) => {
      console.error("[useSwipe] Mutation error:", error);
      toast.error("ההתאמה נכשלה", {
        description: error.message || "אירעה שגיאה. נסה/י שוב.",
      });
    },
  });

  const like = async (targetId: string) => {
    const result = await swipeMutation.mutateAsync({ targetId, type: "LIKE" });
    return {
      isMatch: result.isMatch,
      matchId: result.matchId,
    };
  };

  const pass = async (targetId: string) => {
    await swipeMutation.mutateAsync({ targetId, type: "PASS" });
  };

  return {
    like,
    pass,
    isLoading: swipeMutation.isPending,
  };
}