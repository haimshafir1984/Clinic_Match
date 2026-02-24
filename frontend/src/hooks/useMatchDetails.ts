import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { getMatches, closeMatch as apiCloseMatch } from "@/lib/api";
import { Match } from "@/types";

export function useMatchDetails(matchId: string) {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();

  const query = useQuery({
    queryKey: ["match", matchId],
    queryFn: async (): Promise<Match | null> => {
      if (!currentUser?.profileId) return null;

      // Get all matches and find the specific one
      const matches = await getMatches(currentUser);
      const match = matches.find((m) => m.id === matchId);
      return match || null;
    },
    enabled: !!matchId && !!currentUser?.profileId,
  });

  const closeMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser?.profileId) throw new Error("No profile");
      await apiCloseMatch(matchId, currentUser.profileId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
  });

  return {
    match: query.data,
    isLoading: query.isLoading,
    closeMatch: closeMutation.mutateAsync,
  };
}
