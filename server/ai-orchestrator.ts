import type {
  AssistantChatRequest,
  AssistantChatResponse,
  AssistantConversation,
  AssistantStoredMessage
} from '../src/modules/ai/types/assistant.js';
import type { AIProvider } from './ai-provider.js';
import { FinancialContextService, selectToolsForMessage } from './financial-context.js';
import { parseSimulationInput, PurchaseSimulator } from './purchase-simulator.js';
import { assistantSystemPrompt } from './system-prompt.js';
import type { AuthenticatedRequestContext } from './supabase.js';

const maxMessageLength = 1200;
const maxRecentMessages = 8;

function buildTitle(message: string) {
  return message.trim().slice(0, 80) || 'Nova conversa';
}

function isSimulationMessage(message: string) {
  return /compr|posso|parcel|avista|à vista|a vista|simul/i.test(message);
}

async function ensureConversation(
  requestContext: AuthenticatedRequestContext,
  conversationId: string | null | undefined,
  message: string
) {
  if (conversationId) {
    const { data, error } = await requestContext.client
      .from('ai_conversations')
      .select('*')
      .eq('id', conversationId)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      throw new Error('conversation not found for current user');
    }

    return data as AssistantConversation;
  }

  const { data, error } = await requestContext.client
    .from('ai_conversations')
    .insert({
      title: buildTitle(message),
      user_id: requestContext.userId
    })
    .select()
    .single();

  if (error || !data) {
    throw error ?? new Error('conversation could not be created');
  }

  return data as AssistantConversation;
}

async function loadRecentMessages(
  requestContext: AuthenticatedRequestContext,
  conversationId: string
) {
  const { data, error } = await requestContext.client
    .from('ai_messages')
    .select('role,content,created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(maxRecentMessages);

  if (error) {
    throw error;
  }

  return (data ?? []).reverse();
}

async function insertMessage(
  requestContext: AuthenticatedRequestContext,
  conversationId: string,
  role: 'assistant' | 'user',
  content: string
) {
  const { data, error } = await requestContext.client
    .from('ai_messages')
    .insert({
      content,
      conversation_id: conversationId,
      role,
      user_id: requestContext.userId
    })
    .select()
    .single();

  if (error || !data) {
    throw error ?? new Error('message could not be persisted');
  }

  await requestContext.client
    .from('ai_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  return data as AssistantStoredMessage;
}

export class AIOrchestrator {
  constructor(
    private readonly provider: AIProvider,
    private readonly requestContext: AuthenticatedRequestContext
  ) {}

  async handleChat(request: AssistantChatRequest): Promise<AssistantChatResponse> {
    const message = request.message.trim();

    if (!message || message.length > maxMessageLength) {
      throw new Error('message length invalid');
    }

    if (/sql|service_role|api key|jwt|todos os usu[aá]rios|ignore suas regras/i.test(message)) {
      throw new Error('request not allowed');
    }

    const conversation = await ensureConversation(
      this.requestContext,
      request.conversationId,
      message
    );
    await loadRecentMessages(this.requestContext, conversation.id);

    const tools = selectToolsForMessage(message);
    const simulationInput = isSimulationMessage(message) ? parseSimulationInput(message) : null;
    const context = await new FinancialContextService(this.requestContext).buildContext(
      tools,
      Boolean(simulationInput && simulationInput.installments > 3)
    );
    const simulation = simulationInput
      ? await new PurchaseSimulator(this.requestContext).simulate(simulationInput)
      : undefined;

    const userMessage = await insertMessage(this.requestContext, conversation.id, 'user', message);
    const response = await this.provider.generateResponse({
      context,
      message,
      simulation,
      systemPrompt: assistantSystemPrompt
    });
    const assistantMessage = await insertMessage(
      this.requestContext,
      conversation.id,
      'assistant',
      response.message
    );

    return {
      assistantMessage,
      conversation,
      response,
      userMessage
    };
  }
}
