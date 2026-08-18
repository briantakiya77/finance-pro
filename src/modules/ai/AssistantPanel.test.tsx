import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AssistantPanel } from '@/modules/ai/components/AssistantPanel';

const useAssistantConversationsQuery = vi.fn();
const useAssistantMessagesQuery = vi.fn();
const useSendAssistantMessageMutation = vi.fn();

vi.mock('@/modules/ai/queries/assistantQueries', () => ({
  useAssistantConversationsQuery: (...args: unknown[]) => useAssistantConversationsQuery(...args),
  useAssistantMessagesQuery: (...args: unknown[]) => useAssistantMessagesQuery(...args),
  useSendAssistantMessageMutation: (...args: unknown[]) => useSendAssistantMessageMutation(...args)
}));

describe('AssistantPanel', () => {
  it('envia mensagem com Enter e bloqueia submit duplicado durante loading', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({
      conversation: { id: 'conv-1' },
      response: {
        data: {
          recommendation: 'Acompanhe o orcamento.',
          summary: 'Voce ainda pode gastar R$ 500,00.',
          insights: ['Seu maior gasto esta em alimentacao.'],
          warnings: []
        },
        message: 'Voce ainda pode gastar R$ 500,00.',
        type: 'financial_assistant'
      }
    });

    useAssistantConversationsQuery.mockReturnValue({ data: [], isLoading: false });
    useAssistantMessagesQuery.mockReturnValue({ data: [], isLoading: false });
    useSendAssistantMessageMutation.mockReturnValue({
      error: null,
      isError: false,
      isPending: false,
      mutateAsync
    });

    render(<AssistantPanel onClose={() => undefined} />);

    const textarea = screen.getByLabelText('Pergunta para a assistente financeira');
    fireEvent.change(textarea, { target: { value: 'Quanto ainda posso gastar este mes?' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        conversationId: null,
        message: 'Quanto ainda posso gastar este mes?'
      });
    });

    expect(screen.getByText('Analise estruturada')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Enviar' }).hasAttribute('disabled')).toBe(true);
  });

  it('mostra erro amigavel e permite retry', async () => {
    const mutateAsync = vi.fn().mockRejectedValue(new Error('Nao foi possivel concluir a analise agora.'));

    useAssistantConversationsQuery.mockReturnValue({ data: [], isLoading: false });
    useAssistantMessagesQuery.mockReturnValue({ data: [], isLoading: false });
    useSendAssistantMessageMutation.mockReturnValue({
      error: new Error('Nao foi possivel concluir a analise agora.'),
      isError: true,
      isPending: false,
      mutateAsync
    });

    render(<AssistantPanel onClose={() => undefined} />);

    const textarea = screen.getByLabelText('Pergunta para a assistente financeira');
    fireEvent.change(textarea, { target: { value: 'Analise meu mes financeiro' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText('Assistente indisponivel')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeTruthy();
  });
});
