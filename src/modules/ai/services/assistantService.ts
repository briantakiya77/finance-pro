import { requireSupabaseClient } from '@/integrations/supabase';
import type {
  AssistantChatRequest,
  AssistantChatResponse,
  AssistantConversation,
  AssistantStoredMessage
} from '@/modules/ai/types/assistant';

export type AssistantMutationResult<T> = {
  data: T | null;
  error: string | null;
};

const defaultAssistantError =
  'Nao consegui acessar a assistente agora. Seus dados financeiros continuam seguros e o restante do Finance Pro esta disponivel.';

function mapAssistantError(error: unknown) {
  if (error instanceof Error) {
    return error.message || defaultAssistantError;
  }

  return defaultAssistantError;
}

function createAssistantErrorResult<T>(error: unknown): AssistantMutationResult<T> {
  return {
    data: null,
    error: mapAssistantError(error)
  };
}

export const assistantService = {
  async listConversations(): Promise<AssistantMutationResult<AssistantConversation[]>> {
    try {
      const { data, error } = await requireSupabaseClient()
        .from('ai_conversations')
        .select('*')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error) {
        return createAssistantErrorResult(error);
      }

      return {
        data: data ?? [],
        error: null
      };
    } catch (error) {
      return createAssistantErrorResult(error);
    }
  },

  async listMessages(
    conversationId: string | null
  ): Promise<AssistantMutationResult<AssistantStoredMessage[]>> {
    if (!conversationId) {
      return {
        data: [],
        error: null
      };
    }

    try {
      const { data, error } = await requireSupabaseClient()
        .from('ai_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(40);

      if (error) {
        return createAssistantErrorResult(error);
      }

      return {
        data: data ?? [],
        error: null
      };
    } catch (error) {
      return createAssistantErrorResult(error);
    }
  },

  async sendMessage(payload: AssistantChatRequest): Promise<AssistantMutationResult<AssistantChatResponse>> {
    try {
      const { data: sessionData, error: sessionError } = await requireSupabaseClient().auth.getSession();

      if (sessionError || !sessionData.session?.access_token) {
        throw sessionError ?? new Error('Sua sessao expirou. Entre novamente para usar a assistente.');
      }

      const response = await fetch('/api/ai/chat', {
        body: JSON.stringify(payload),
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
          'Content-Type': 'application/json'
        },
        method: 'POST'
      });

      const body = (await response.json()) as AssistantChatResponse | { error?: string };

      if (!response.ok) {
        throw new Error('error' in body ? body.error : defaultAssistantError);
      }

      return {
        data: body as AssistantChatResponse,
        error: null
      };
    } catch (error) {
      return createAssistantErrorResult(error);
    }
  }
};
