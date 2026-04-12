import { useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { importMarketJobs as importMarketJobsApi, searchMarketJobs as searchMarketJobsApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";

function cleanFilter(value: string | null | undefined) {
  return value && value.trim() ? value.trim() : undefined;
}

export function useMarketJobs() {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const { data: profile } = useProfile();
  const hasAutoRefreshed = useRef(false);

  const filters = useMemo(() => {
    const profilePosition = cleanFilter(profile?.position) || cleanFilter(profile?.positions?.[0]);
    const profileLocation = cleanFilter(profile?.preferred_area) || cleanFilter(profile?.city) || cleanFilter(currentUser?.location);
    const profileIndustry = cleanFilter(currentUser?.industry);
    const profileJobType = cleanFilter(profile?.job_type);

    return {
      query: profilePosition,
      location: profileLocation,
      industry: profileIndustry,
      jobType: profileJobType,
      limit: 20,
    };
  }, [currentUser?.industry, currentUser?.location, profile?.city, profile?.job_type, profile?.position, profile?.positions, profile?.preferred_area]);

  const queryKey = [
    "market-jobs",
    currentUser?.profileId,
    filters.query || "",
    filters.location || "",
    filters.industry || "",
    filters.jobType || "",
  ];

  const isEnabled = currentUser?.role === "worker" && !!currentUser?.profileId;

  const jobsQuery = useQuery({
    queryKey,
    queryFn: async () => searchMarketJobsApi(filters),
    enabled: isEnabled,
    staleTime: 1000 * 60 * 10,
  });

  const refreshMutation = useMutation({
    mutationFn: async () => importMarketJobsApi(filters),
    onSuccess: (jobs) => {
      queryClient.setQueryData(queryKey, jobs);
    },
  });

  useEffect(() => {
    if (!isEnabled || jobsQuery.isLoading || refreshMutation.isPending || hasAutoRefreshed.current) {
      return;
    }

    if ((jobsQuery.data || []).length === 0) {
      hasAutoRefreshed.current = true;
      refreshMutation.mutate();
    }
  }, [isEnabled, jobsQuery.data, jobsQuery.isLoading, refreshMutation]);

  return {
    jobs: jobsQuery.data || [],
    isLoading: jobsQuery.isLoading,
    isRefreshing: refreshMutation.isPending,
    refetch: jobsQuery.refetch,
    refreshFromSites: refreshMutation.mutateAsync,
    filters,
    error: jobsQuery.error || refreshMutation.error || null,
  };
}
