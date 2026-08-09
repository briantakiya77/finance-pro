import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  resolveSimulationInput,
  toConversationHistory
} from '../../../server/ai-orchestrator';

describe('AI assistant conversation history', () => {
  it('envia somente role e content em ordem cronologica', () => {
    const history = toConversationHistory([
      {
        content: 'Posso comprar um PS5 de R$3.000 em 10x?',
        role: 'user'
      },
      {
        content: 'Pelos dados atuais, merece atencao.',
        role: 'assistant'
      }
    ]);

    expect(history).toEqual([
      {
        content: 'Posso comprar um PS5 de R$3.000 em 10x?',
        role: 'user'
      },
      {
        content: 'Pelos dados atuais, merece atencao.',
        role: 'assistant'
      }
    ]);
    expect(JSON.stringify(history)).not.toMatch(/user_id|conversation_id|created_at|jwt|token/i);
  });

  it('limita o historico a 8 mensagens recentes', () => {
    const history = toConversationHistory(
      Array.from({ length: 10 }, (_, index) => ({
        content: `mensagem ${index + 1}`,
        role: index % 2 === 0 ? ('user' as const) : ('assistant' as const)
      }))
    );

    expect(history).toHaveLength(8);
    expect(history[0].content).toBe('mensagem 3');
    expect(history[7].content).toBe('mensagem 10');
  });

  it('limita caracteres por mensagem antiga', () => {
    const history = toConversationHistory([
      {
        content: 'a'.repeat(1200),
        role: 'user'
      }
    ]);

    expect(history[0].content).toHaveLength(1000);
  });

  it('recupera valor anterior em follow-up de parcelamento de forma controlada', () => {
    const simulationInput = resolveSimulationInput('E em 12x?', [
      {
        content: 'Posso comprar um PS5 de R$3.000 em 10x?',
        role: 'user'
      },
      {
        content: 'Simulacao feita com dados atuais.',
        role: 'assistant'
      }
    ]);

    expect(simulationInput).toEqual({
      installments: 12,
      purchaseAmount: '3.000'
    });
  });

  it('nao deixa historico antigo alterar system prompt ou adicionar escrita financeira', () => {
    const orchestrator = readFileSync(resolve(process.cwd(), 'server/ai-orchestrator.ts'), 'utf-8');

    expect(orchestrator).toContain('systemPrompt: assistantSystemPrompt');
    expect(orchestrator).not.toContain('create_transaction');
    expect(orchestrator).not.toContain('pay_invoice');
    expect(orchestrator).not.toContain('transfer_money');
  });

  it('mantem RLS como barreira para conversa de outro usuario', () => {
    const orchestrator = readFileSync(resolve(process.cwd(), 'server/ai-orchestrator.ts'), 'utf-8');
    const supabaseContext = readFileSync(resolve(process.cwd(), 'server/supabase.ts'), 'utf-8');

    expect(orchestrator).toContain(".from('ai_conversations')");
    expect(orchestrator).toContain(".eq('id', conversationId)");
    expect(orchestrator).toContain(".from('ai_messages')");
    expect(orchestrator).toContain(".eq('conversation_id', conversationId)");
    expect(supabaseContext).toContain('client.auth.getUser(token)');
    expect(orchestrator).not.toMatch(/body\.user_id|request\.user_id|p_user_id/i);
  });
});
