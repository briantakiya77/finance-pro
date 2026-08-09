import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const serverFiles = [
  'server/ai-orchestrator.ts',
  'server/financial-context.ts',
  'server/purchase-simulator.ts',
  'server/supabase.ts'
].map((file) => readFileSync(resolve(process.cwd(), file), 'utf-8'));

const frontendFiles = ['src/modules/ai/services/assistantService.ts'].map((file) =>
  readFileSync(resolve(process.cwd(), file), 'utf-8')
);

describe('AI assistant security boundaries', () => {
  it('nao usa service role nem chave de IA no frontend', () => {
    expect(frontendFiles.join('\n')).not.toMatch(/SERVICE_ROLE|service_role/i);
    expect(frontendFiles.join('\n')).not.toContain('AI_API_KEY');
    expect(serverFiles.join('\n')).not.toMatch(/process\.env\.[A-Z_]*SERVICE_ROLE/i);
  });

  it('nao aceita user_id arbitrario vindo do cliente', () => {
    expect(serverFiles.join('\n')).not.toMatch(/body\.user_id|request\.user_id|p_user_id/i);
    expect(readFileSync(resolve(process.cwd(), 'server/supabase.ts'), 'utf-8')).toContain(
      'client.auth.getUser(token)'
    );
  });

  it('bloqueia SQL livre e nao expoe tools de escrita financeira', () => {
    const orchestrator = readFileSync(resolve(process.cwd(), 'server/ai-orchestrator.ts'), 'utf-8');

    expect(orchestrator).toContain('request not allowed');
    expect(orchestrator).not.toContain('create_transaction');
    expect(orchestrator).not.toContain('delete_transaction');
    expect(orchestrator).not.toContain('pay_invoice');
    expect(orchestrator).not.toContain('transfer_money');
    expect(orchestrator).not.toContain('update_budget');
  });

  it('valida ownership de cartao e categoria pela sessao autenticada', () => {
    const simulator = readFileSync(resolve(process.cwd(), 'server/purchase-simulator.ts'), 'utf-8');

    expect(simulator).toContain(".from('credit_cards')");
    expect(simulator).toContain(".eq('id', input.cardId)");
    expect(simulator).toContain(".from('categories')");
    expect(simulator).toContain(".eq('type', 'expense')");
    expect(simulator).not.toContain('user_id: input');
  });
});
