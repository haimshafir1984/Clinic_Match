import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { closeMatch as apiCloseMatch, getMatchDetails } from "@/lib/api";
import { Match } from "@/types";

export function useMatchDetails(matchId: string) {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();

  const query = useQuery({
    queryKey: ["match", currentUser?.profileId, matchId],
    queryFn: async (): Promise<Match | null> => {
      if (!currentUser?.profileId) return null;
      return getMatchDetails(currentUser.profileId, matchId);
    },
    enabled: !!matchId && !!currentUser?.profileId,
  });

  const closeMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser?.profileId) throw new Error("No profile");
      await apiCloseMatch(matchId, currentUser.profileId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", currentUser?.profileId, matchId] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
  });

  return {
    match: query.data,
    isLoading: query.isLoading,
    closeMatch: closeMutation.mutateAsync,
  };
}
