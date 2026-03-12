import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRecruitment, scheduleInterview, updateInterview, updateRecruitment } from "@/lib/api";
import { RecruitmentPipeline, InterviewSchedule } from "@/types";

export function useRecruitment(matchId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["recruitment", matchId],
    queryFn: async () => getRecruitment(matchId),
    enabled: !!matchId,
    refetchInterval: 5000,
  });

  const updatePipelineMutation = useMutation({
    mutationFn: async (payload: Partial<Pick<RecruitmentPipeline, "stage" | "summary" | "nextStep" | "aiNotes" | "savedToTalent">>) =>
      updateRecruitment(matchId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment", matchId] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
  });

  const scheduleInterviewMutation = useMutation({
    mutationFn: async (payload: { scheduledFor: string; interviewType: InterviewSchedule["interviewType"]; location?: string; notes?: string }) =>
      scheduleInterview(matchId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment", matchId] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
  });

  const updateInterviewMutation = useMutation({
    mutationFn: ({ interviewId, status, notes }: { interviewId: string; status: InterviewSchedule["status"]; notes?: string }) =>
      updateInterview(interviewId, { status, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment", matchId] });
    },
  });

  return {
    pipeline: query.data?.pipeline || null,
    interviews: query.data?.interviews || [],
    canManage: query.data?.canManage || false,
    isLoading: query.isLoading,
    updatePipeline: updatePipelineMutation.mutateAsync,
    scheduleInterview: scheduleInterviewMutation.mutateAsync,
    updateInterviewStatus: updateInterviewMutation.mutateAsync,
  };
}
