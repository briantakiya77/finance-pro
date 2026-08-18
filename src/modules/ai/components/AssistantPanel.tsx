import { Bot, RefreshCcw, Send, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import assistantAvatar from '@/assets/finance-assistant.jpg';
import {
  useAssistantConversationsQuery,
  useAssistantMessagesQuery,
  useSendAssistantMessageMutation
} from '@/modules/ai/queries/assistantQueries';
import {
  assistantQuickSuggestions,
  type AssistantStoredMessage,
  type AssistantStructuredResponse,
  type PurchaseSimulation
} from '@/modules/ai/types/assistant';
import { Badge, Button, Card, IconButton, RouteLoading, Textarea, Toast } from '@/shared/components/ui';
import { cn } from '@/shared/utils/cn';
import { formatCurrency } from '@/shared/utils/money';

type AssistantPanelProps = {
  onClose: () => void;
};

function SimulationCard({ simulation }: { simulation: PurchaseSimulation }) {
  return (
    <Card className="mt-4 p-4" tone="secondary">
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
          <p className="text-caption text-text-secondary">Capacidade segura antes</p>
          <p className="mt-1 font-semibold text-text-primary">
            {simulation.planningImpact.safeToSpendBeforePurchase
              ? formatCurrency(simulation.planningImpact.safeToSpendBeforePurchase)
              : 'Indisponivel'}
          </p>
        </div>
        <div className="rounded-control border border-border bg-background/60 px-3 py-3">
          <p className="text-caption text-text-secondary">Capacidade segura depois</p>
          <p className="mt-1 font-semibold text-text-primary">
            {simulation.planningImpact.safeToSpendAfterPurchase
              ? formatCurrency(simulation.planningImpact.safeToSpendAfterPurchase)
              : 'Indisponivel'}
          </p>
        </div>
        <div className="rounded-control border border-border bg-background/60 px-3 py-3">
          <p className="text-caption text-text-secondary">Menor saldo projetado</p>
          <p className="mt-1 font-semibold text-text-primary">
            {simulation.projectedLowestBalance
              ? formatCurrency(simulation.projectedLowestBalance)
              : 'Sem projecao'}
          </p>
        </div>
      </div>
    </Card>
  );
}

function AssistantStructuredCard({ response }: { response: AssistantStructuredResponse }) {
  return (
    <Card className="mt-4 p-4" tone="secondary">
      <p className="text-caption text-text-secondary">Analise estruturada</p>
      <p className="mt-2 text-sm font-medium text-text-primary">{response.data.summary}</p>
      <p className="mt-3 text-sm text-text-secondary">{response.data.recommendation}</p>

      {response.data.insights.length ? (
        <div className="mt-4">
          <p className="text-caption text-text-secondary">Insights</p>
          <ul className="mt-2 space-y-2 text-sm text-text-primary">
            {response.data.insights.map((insight) => (
              <li key={insight} className="rounded-control border border-border bg-background/60 px-3 py-2">
                {insight}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {response.data.warnings.length ? (
        <div className="mt-4">
          <p className="text-caption text-text-secondary">Alertas</p>
          <ul className="mt-2 space-y-2 text-sm text-danger">
            {response.data.warnings.map((warning) => (
              <li key={warning} className="rounded-control border border-danger/30 bg-danger/5 px-3 py-2">
                {warning}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {response.simulation ? <SimulationCard simulation={response.simulation} /> : null}
    </Card>
  );
}

export function AssistantPanel({ onClose }: AssistantPanelProps) {
  const [draft, setDraft] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [optimisticMessages, setOptimisticMessages] = useState<AssistantStoredMessage[]>([]);
  const [lastPayload, setLastPayload] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<AssistantStructuredResponse | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    const container = scrollContainerRef.current;

    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [messages.length, lastResponse, sendMessageMutation.isPending]);

  async function sendMessage(message: string) {
    const trimmedMessage = message.trim();

    if (!trimmedMessage || sendMessageMutation.isPending) {
      return;
    }

    setDraft('');
    setLastPayload(trimmedMessage);
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
      setLastResponse(result?.response ?? null);
      setOptimisticMessages([]);
    } catch {
      setOptimisticMessages([]);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/75 backdrop-blur-md xl:flex xl:justify-end">
      <aside className="ml-auto flex h-full w-full flex-col border-l border-border bg-surface shadow-elevated xl:max-w-[30rem]">
        <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-4">
          <div className="flex items-center gap-3">
            <img
              src={assistantAvatar}
              alt=""
              className="h-11 w-11 rounded-full border border-accent/50 object-cover shadow-glow"
            />
            <div>
              <p className="font-semibold text-text-primary">Assistente Financeira</p>
              <p className="text-caption text-text-secondary">Analise contextual do Finance Pro</p>
            </div>
          </div>
          <IconButton label="Fechar assistente" icon={<X size={18} />} onClick={onClose} />
        </header>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-5">
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
                        Eu interpreto seus dados financeiros reais, sem criar lancamentos e sem inventar numeros.
                      </p>
                    </div>
                  </div>
                </Card>
              ) : null}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[88%] rounded-panel px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
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
                    Analisando seu contexto financeiro...
                  </div>
                </div>
              ) : null}

              {lastResponse ? <AssistantStructuredCard response={lastResponse} /> : null}
            </div>
          )}
        </div>

        <div className="border-t border-border px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {sendMessageMutation.isError ? (
            <div className="space-y-3">
              <Toast variant="danger" title="Assistente indisponivel">
                {sendMessageMutation.error.message}
              </Toast>
              {lastPayload ? (
                <Button
                  type="button"
                  variant="secondary"
                  icon={<RefreshCcw size={16} />}
                  onClick={() => sendMessage(lastPayload)}
                >
                  Tentar novamente
                </Button>
              ) : null}
            </div>
          ) : null}

          {messages.length === 0 ? (
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
          ) : null}

          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage(draft);
            }}
          >
            <label className="sr-only" htmlFor="assistant-message">
              Pergunta para a assistente financeira
            </label>
            <Textarea
              id="assistant-message"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage(draft);
                }
              }}
              placeholder="Pergunte sobre seu mes financeiro, categorias, metas ou uma compra hipotetica..."
              maxLength={2000}
              rows={4}
            />

            <div className="flex items-center justify-between gap-3">
              <p className="text-caption text-text-secondary">{draft.trim().length}/2000</p>
              <Button
                type="submit"
                disabled={sendMessageMutation.isPending || !draft.trim()}
                icon={sendMessageMutation.isPending ? <Bot size={18} /> : <Send size={18} />}
              >
                {sendMessageMutation.isPending ? 'Analisando...' : 'Enviar'}
              </Button>
            </div>
          </form>
        </div>
      </aside>
    </div>
  );
}
