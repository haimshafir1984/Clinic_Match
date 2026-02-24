import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { getMatches } from "@/lib/api";

export function useMatches() {
  const { currentUser } = useAuth();

  const query = useQuery({
    queryKey: ["matches", currentUser?.profileId],
    queryFn: async () => {
      if (!currentUser) return [];
      return getMatches(currentUser);
    },
    enabled: !!currentUser?.profileId,
  });

  return {
    matches: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
