import { useQuery } from "@tanstack/react-query";
import { getProfileHighlights } from "@/lib/api";

export function useProfileHighlights(profileId?: string | null) {
  return useQuery({
    queryKey: ["profile-highlights", profileId],
    queryFn: async () => getProfileHighlights(profileId || ""),
    enabled: !!profileId,
  });
}
