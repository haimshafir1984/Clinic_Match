import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { importMarketJobs as importMarketJobsApi, searchMarketJobs as searchMarketJobsApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";

function cleanFilter(value: string | null | undefined) {
  return value && value.trim() ? value.trim() : undefined;
}

const INDUSTRY_HEBREW: Record<string, string> = {
  insurance: "\u05d1\u05d9\u05d8\u05d5\u05d7",
  communication: "\u05ea\u05e7\u05e9\u05d5\u05e8\u05ea",
  retail: "\u05e7\u05de\u05e2\u05d5\u05e0\u05d0\u05d5\u05ea",
  hospitality: "\u05d0\u05d9\u05e8\u05d5\u05d7",
  technology: "\u05d8\u05db\u05e0\u05d5\u05dc\u05d5\u05d2\u05d9\u05d4",
  tech: "\u05d8\u05db\u05e0\u05d5\u05dc\u05d5\u05d2\u05d9\u05d4",
  healthcare: "\u05e8\u05e4\u05d5\u05d0\u05d4",
  medical: "\u05e8\u05e4\u05d5\u05d0\u05d4",
  education: "\u05d7\u05d9\u05e0\u05d5\u05da",
  construction: "\u05d1\u05e0\u05d9\u05d9\u05d4",
  daily: "\u05de\u05e9\u05e8\u05d5\u05ea \u05d9\u05d5\u05de\u05d9\u05d5\u05ea",
};

export function useMarketJobs() {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const { data: profile } = useProfile();
  const hasAutoRefreshed = useRef(false);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);

  const filters = useMemo(() => {
    const profilePosition =
      cleanFilter(profile?.required_position) ||
      cleanFilter(profile?.positions?.[0]) ||
      cleanFilter(profile?.position);

    const profileLocation =
      cleanFilter(profile?.preferred_area) ||
      cleanFilter(profile?.city) ||
      cleanFilter(currentUser?.location);

    const industryKey = cleanFilter(profile?.industry) || cleanFilter(currentUser?.industry);
    const effectiveQuery =
      profilePosition ||
      (industryKey ? INDUSTRY_HEBREW[industryKey] || industryKey : undefined);

    const profileJobType = cleanFilter(profile?.job_type);

    return {
      query: effectiveQuery,
      location: profileLocation,
      industry: industryKey,
      jobType: profileJobType,
      limit: 20,
    };
  }, [
    currentUser?.industry,
    currentUser?.location,
    profile?.city,
    profile?.industry,
    profile?.job_type,
    profile?.position,
    profile?.positions,
    profile?.preferred_area,
    profile?.required_position,
  ]);

  const filterSignature = JSON.stringify(filters);
  const queryKey = ["market-jobs", currentUser?.profileId, filterSignature];
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
      setImportWarnings(
        (result.warnings || []).map((warning) =>
          warning.source ? `${warning.source}: ${warning.message}` : warning.message
        )
      );
    },
  });

  useEffect(() => {
    hasAutoRefreshed.current = false;
    setImportWarnings([]);
  }, [filterSignature]);

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
