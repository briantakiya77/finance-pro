import { Bot, Mic, Send, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import assistantAvatar from '@/assets/finance-assistant.jpg';
import {
  useAssistantConversationsQuery,
  useAssistantMessagesQuery,
  useSendAssistantMessageMutation
} from '@/modules/ai/queries/assistantQueries';
import {
  assistantQuickSuggestions,
  type AssistantStoredMessage,
  type PurchaseSimulation
} from '@/modules/ai/types/assistant';
import { Badge, Button, Card, IconButton, Input, RouteLoading, Toast } from '@/shared/components/ui';
import { cn } from '@/shared/utils/cn';
import { formatCurrency } from '@/shared/utils/money';

type AssistantPanelProps = {
  onClose: () => void;
};

const localPendingMessages: AssistantStoredMessage[] = [];

function SimulationCard({ simulation }: { simulation: PurchaseSimulation }) {
  return (
    <Card className="mt-3 p-4" tone="secondary">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-caption text-text-secondary">Simulacao de compra</p>
          <p className="mt-1 text-lg font-semibold text-text-primary">
            {formatCurrency(simulation.purchaseAmount)}
          </p>
        </div>
        <Badge
          variant={
            simulation.decisionScore === 'safe'
              ? 'success'
              : simulation.decisionScore === 'attention'
                ? 'warning'
                : 'danger'
          }
        >
          {simulation.decisionScore === 'not_feasible'
            ? 'Nao viavel'
            : simulation.decisionScore === 'risky'
              ? 'Risco'
              : simulation.decisionScore === 'attention'
                ? 'Atencao'
                : 'Seguro'}
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-control border border-border bg-background/60 px-3 py-3">
          <p className="text-caption text-text-secondary">Parcelamento</p>
          <p className="mt-1 font-semibold text-text-primary">{simulation.installmentAmountLabel}</p>
        </div>
        <div className="rounded-control border border-border bg-background/60 px-3 py-3">
          <p className="text-caption text-text-secondary">Menor saldo projetado</p>
          <p className="mt-1 font-semibold text-text-primary">
            {simulation.projectedLowestBalance
              ? formatCurrency(simulation.projectedLowestBalance)
              : 'Sem projecao'}
          </p>
        </div>
        <div className="rounded-control border border-border bg-background/60 px-3 py-3">
          <p className="text-caption text-text-secondary">Limite apos compra</p>
          <p className="mt-1 font-semibold text-text-primary">
            {simulation.availableLimitAfterPurchase
              ? formatCurrency(simulation.availableLimitAfterPurchase)
              : 'Sem cartao'}
          </p>
        </div>
        <div className="rounded-control border border-border bg-background/60 px-3 py-3">
          <p className="text-caption text-text-secondary">Economia apos compra</p>
          <p className="mt-1 font-semibold text-text-primary">
            {simulation.monthlySavingsAfterPurchase
              ? formatCurrency(simulation.monthlySavingsAfterPurchase)
              : 'Sem meta'}
          </p>
        </div>
      </div>
    </Card>
  );
}

export function AssistantPanel({ onClose }: AssistantPanelProps) {
  const [draft, setDraft] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [optimisticMessages, setOptimisticMessages] =
    useState<AssistantStoredMessage[]>(localPendingMessages);
  const [lastSimulation, setLastSimulation] = useState<PurchaseSimulation | null>(null);
  const conversationsQuery = useAssistantConversationsQuery(true);
  const conversations = conversationsQuery.data ?? [];
  const firstConversationId = conversations[0]?.id ?? null;

  useEffect(() => {
    setSelectedConversationId((current) => current ?? firstConversationId);
  }, [firstConversationId]);

  const messagesQuery = useAssistantMessagesQuery(selectedConversationId, true);
  const sendMessageMutation = useSendAssistantMessageMutation();
  const messages = useMemo(
    () => [...(messagesQuery.data ?? []), ...optimisticMessages],
    [messagesQuery.data, optimisticMessages]
  );

  async function sendMessage(message: string) {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return;
    }

    setDraft('');
    setLastSimulation(null);
    setOptimisticMessages([
      {
        content: trimmedMessage,
        conversation_id: selectedConversationId ?? 'pending',
        created_at: new Date().toISOString(),
        id: `pending-${Date.now()}`,
        role: 'user',
        user_id: 'current'
      }
    ]);

    try {
      const result = await sendMessageMutation.mutateAsync({
        conversationId: selectedConversationId,
        message: trimmedMessage
      });
      setSelectedConversationId(result?.conversation.id ?? selectedConversationId);
      setLastSimulation(result?.response.type === 'purchase_simulation' ? result.response.simulation ?? null : null);
      setOptimisticMessages([]);
    } catch {
      setOptimisticMessages([]);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/75 backdrop-blur-md xl:flex xl:justify-end">
      <aside className="ml-auto flex h-full w-full flex-col border-l border-border bg-surface shadow-elevated xl:max-w-[26rem]">
        <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-4">
          <div className="flex items-center gap-3">
            <img
              src={assistantAvatar}
              alt=""
              className="h-11 w-11 rounded-full border border-accent/50 object-cover shadow-glow"
            />
            <div>
              <p className="font-semibold text-text-primary">Maria</p>
              <p className="text-caption text-text-secondary">Assistente Finance Pro</p>
            </div>
          </div>
          <IconButton label="Fechar assistente" icon={<X size={18} />} onClick={onClose} />
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-5">
          {conversationsQuery.isLoading || messagesQuery.isLoading ? (
            <RouteLoading />
          ) : (
            <div className="space-y-4">
              {messages.length === 0 ? (
                <Card className="p-5" tone="secondary">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-accent-gradient-soft text-accent">
                      <Sparkles size={18} />
                    </span>
                    <div>
                      <p className="font-medium text-text-primary">Como posso ajudar?</p>
                      <p className="mt-2 text-sm text-text-secondary">
                        Posso analisar seus dados reais, explicar gastos e simular decisoes sem
                        alterar nada no sistema.
                      </p>
                    </div>
                  </div>
                </Card>
              ) : null}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-panel px-4 py-3 text-sm leading-relaxed',
                      message.role === 'user'
                        ? 'bg-accent-gradient text-text-primary'
                        : 'border border-border bg-surface-secondary text-text-primary'
                    )}
                  >
                    {message.content}
                  </div>
                </div>
              ))}

              {sendMessageMutation.isPending ? (
                <div className="flex justify-start">
                  <div className="rounded-panel border border-border bg-surface-secondary px-4 py-3 text-sm text-text-secondary">
                    Analisando dados financeiros...
                  </div>
                </div>
              ) : null}

              {lastSimulation ? <SimulationCard simulation={lastSimulation} /> : null}
            </div>
          )}
        </div>

        <div className="border-t border-border px-4 py-4">
          {sendMessageMutation.isError ? (
            <Toast variant="danger" title="Assistente indisponivel">
              {sendMessageMutation.error.message}
            </Toast>
          ) : null}

          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {assistantQuickSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="shrink-0 rounded-full border border-border bg-surface-secondary px-3 py-2 text-caption text-text-secondary transition hover:border-accent/40 hover:text-text-primary"
                onClick={() => sendMessage(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>

          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage(draft);
            }}
          >
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Digite sua mensagem..."
              maxLength={1200}
            />
            <Button type="button" variant="ghost" size="icon" title="Voz sera ativada em etapa futura" disabled>
              <Mic size={18} />
            </Button>
            <Button type="submit" size="icon" disabled={sendMessageMutation.isPending}>
              {sendMessageMutation.isPending ? <Bot size={18} /> : <Send size={18} />}
            </Button>
          </form>
        </div>
      </aside>
    </div>
  );
}
