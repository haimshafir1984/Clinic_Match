import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { importMarketJobs as importMarketJobsApi, searchMarketJobs as searchMarketJobsApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";

function cleanFilter(value: string | null | undefined) {
  return value && value.trim() ? value.trim() : undefined;
}

// Map industry English key to Hebrew label for fallback query
const INDUSTRY_HEBREW: Record<string, string> = {
  insurance: "ביטוח",
  communication: "תקשורת",
  retail: "קמעונאות",
  hospitality: "אירוח",
  technology: "טכנולוגיה",
  healthcare: "רפואה",
};

export function useMarketJobs() {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const { data: profile } = useProfile();
  const hasAutoRefreshed = useRef(false);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);

  const filters = useMemo(() => {
    // Bug 2 fix: try more profile fields for the query
    const profilePosition =
      cleanFilter(profile?.required_position) ||
      cleanFilter(profile?.positions?.[0]) ||
      cleanFilter(profile?.position);

    const profileLocation =
      cleanFilter(profile?.preferred_area) ||
      cleanFilter(profile?.city) ||
      cleanFilter(currentUser?.location);

    const industryKey = cleanFilter(currentUser?.industry);
    const profileIndustry = industryKey;

    // If position is missing, fall back to industry in Hebrew as a broad query
    const effectiveQuery =
      profilePosition ||
      (industryKey ? INDUSTRY_HEBREW[industryKey] || industryKey : undefined);

    if (!effectiveQuery && !profileLocation) {
      console.warn("[useMarketJobs] All filters are empty — market jobs search will be broad");
    }

    const profileJobType = cleanFilter(profile?.job_type);

    return {
      query: effectiveQuery,
      location: profileLocation,
      industry: profileIndustry,
      jobType: profileJobType,
      limit: 20,
    };
  }, [
    currentUser?.industry,
    currentUser?.location,
    profile?.city,
    profile?.job_type,
    profile?.position,
    profile?.positions,
    profile?.preferred_area,
    profile?.required_position,
  ]);

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
    onSuccess: (result) => {
      queryClient.setQueryData(queryKey, result.jobs || []);
      setImportWarnings((result.warnings || []).map((w) => w.message));
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
    importWarnings,
    error: jobsQuery.error || refreshMutation.error || null,
  };
}