import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { getAnalytics } from "@/lib/api";

export function useAnalytics() {
  const { currentUser } = useAuth();

  return useQuery({
    queryKey: ["analytics", currentUser?.profileId],
    queryFn: async () => {
      if (!currentUser) {
        throw new Error("No user");
      }
      return getAnalytics(currentUser);
    },
    enabled: !!currentUser?.profileId,
  });
}
