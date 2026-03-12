import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMessages, sendMessage as apiSendMessage } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Message } from "@/types";

const MESSAGES_POLL_MS = 2000;

export function useChatMessages(matchId: string) {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();

  const query = useQuery({
    queryKey: ["messages", matchId],
    queryFn: async () => getMessages(matchId),
    enabled: !!matchId,
    refetchInterval: MESSAGES_POLL_MS,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!currentUser?.profileId) {
        throw new Error("No profile");
      }

      return apiSendMessage(matchId, currentUser.profileId, content);
    },
    onSuccess: (message) => {
      queryClient.setQueryData<Message[] | undefined>(["messages", matchId], (existing) => {
        if (!existing) return [message];
        if (existing.some((item) => item.id === message.id)) return existing;
        return [...existing, message];
      });

      queryClient.invalidateQueries({ queryKey: ["messages", matchId] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["match"] });
    },
  });

  return {
    messages: query.data || [],
    isLoading: query.isLoading,
    sendMessage: sendMutation.mutateAsync,
    isSending: sendMutation.isPending,
  };
}
