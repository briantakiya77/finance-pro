import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20260818150000_expand_recurring_frequencies_and_projection.sql'
  ),
  'utf-8'
);

describe('recurring frequency expansion migration', () => {
  it('expande as frequencias para semanal, mensal e anual sem recriar a tabela', () => {
    expect(migration).toContain("alter type public.recurring_transaction_frequency add value if not exists 'weekly';");
    expect(migration).toContain("alter type public.recurring_transaction_frequency add value if not exists 'yearly';");
    expect(migration).toContain('create or replace function public.recurring_period_floor');
    expect(migration).toContain('create or replace function public.advance_recurring_period');
  });

  it('centraliza o calculo da data agendada por frequencia', () => {
    expect(migration).toContain('create or replace function public.compute_recurring_scheduled_date');
    expect(migration).toContain("if p_frequency = 'weekly' then");
    expect(migration).toContain("if p_frequency = 'yearly' then");
    expect(migration).toContain('public.make_safe_date(');
  });

  it('gera compromissos futuros sem materializar anos de transacoes', () => {
    expect(migration).toContain('create or replace function public.list_recurring_commitment_window');
    expect(migration).toContain('v_safety_counter > 400');
    expect(migration).toContain('return next;');
  });

  it('mantem create e update de recorrencia com frequencia no banco', () => {
    expect(migration).toContain('drop function if exists public.create_recurring_transaction(');
    expect(migration).toContain('drop function if exists public.update_recurring_transaction(');
    expect(migration).toContain('p_frequency public.recurring_transaction_frequency');
    expect(migration).toContain('frequency = p_frequency');
  });

  it('preserva historico e limita mudanca de regra ao futuro quando a frequencia muda', () => {
    expect(migration).toContain('v_frequency_reset_floor := public.advance_recurring_period(');
    expect(migration).toContain("when p_frequency <> v_recurring.frequency then v_frequency_reset_floor");
    expect(migration).not.toMatch(/update_recurring_transaction[\s\S]*delete from public\.transactions/i);
  });

  it('continua idempotente por competencia em weekly monthly e yearly', () => {
    expect(migration).toContain('on conflict (recurring_transaction_id, reference_period) do nothing');
    expect(migration).toContain('while v_reference_period <= v_current_period loop');
    expect(migration).toContain('set last_generated_period = v_reference_period');
  });

  it('trata fevereiro, meses curtos e ancoragem semanal sem frontend como fonte da verdade', () => {
    expect(migration).toContain('extract(isodow from p_start_date)::integer');
    expect(migration).toContain('public.make_safe_date(');
    expect(migration).not.toContain('setInterval');
    expect(migration).not.toContain('useEffect');
  });

  it('alimenta projeção e compromissos futuros a partir da mesma regra server-side', () => {
    expect(migration).toContain("from public.list_recurring_commitment_window((current_date + 1), v_projection_end) rcw");
    expect(migration).toContain("from public.list_recurring_commitment_window((current_date + 1), v_horizon_end) rcw");
    expect(migration).toContain("'Previsto • Receita recorrente'");
    expect(migration).toContain("'Previsto • Despesa recorrente'");
  });
});
