import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessages, sendMessage as apiSendMessage } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Message } from "@/types";

export function useChatMessages(matchId: string) {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();

  const query = useQuery({
    queryKey: ["messages", matchId],
    queryFn: async () => {
      return getMessages(matchId);
    },
    enabled: !!matchId,
    refetchInterval: 5000, // Poll every 5 seconds for new messages
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!currentUser?.profileId) throw new Error("No profile");

      return apiSendMessage(matchId, currentUser.profileId, content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", matchId] });
    },
  });

  return {
    messages: query.data,
    isLoading: query.isLoading,
    sendMessage: sendMutation.mutateAsync,
  };
}
