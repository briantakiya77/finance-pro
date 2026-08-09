import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { assistantService } from '@/modules/ai/services/assistantService';
import type { AssistantChatRequest } from '@/modules/ai/types/assistant';

export const assistantConversationsQueryKey = ['ai', 'conversations'] as const;
export const assistantMessagesQueryKey = ['ai', 'messages'] as const;

export function useAssistantConversationsQuery(enabled: boolean) {
  return useQuery({
    enabled,
    queryKey: assistantConversationsQueryKey,
    queryFn: async () => {
      const result = await assistantService.listConversations();

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data ?? [];
    }
  });
}

export function useAssistantMessagesQuery(conversationId: string | null, enabled: boolean) {
  return useQuery({
    enabled: enabled && Boolean(conversationId),
    queryKey: [...assistantMessagesQueryKey, conversationId],
    queryFn: async () => {
      const result = await assistantService.listMessages(conversationId);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data ?? [];
    }
  });
}

export function useSendAssistantMessageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AssistantChatRequest) => {
      const result = await assistantService.sendMessage(payload);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: assistantConversationsQueryKey }),
        queryClient.invalidateQueries({
          queryKey: [...assistantMessagesQueryKey, data?.conversation.id]
        })
      ]);
    }
  });
}
