import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { saveToTalentPool, getTalentPool } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export function useTalentPool() {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();

  const query = useQuery({
    queryKey: ["talent-pool", currentUser?.profileId],
    queryFn: async () => {
      if (!currentUser) return [];
      return getTalentPool(currentUser);
    },
    enabled: currentUser?.role === "clinic" && !!currentUser.profileId,
  });

  const saveMutation = useMutation({
    mutationFn: ({ candidateId, matchId, tags, notes }: { candidateId: string; matchId: string; tags?: string[]; notes?: string }) =>
      saveToTalentPool(candidateId, matchId, { tags, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["talent-pool"] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
  });

  return {
    talentPool: query.data || [],
    isLoading: query.isLoading,
    saveToTalentPool: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  };
}
