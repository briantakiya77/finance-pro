import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20260809113000_create_installments_and_recurring_core.sql'
  ),
  'utf-8'
);

describe('recurring transactions migration', () => {
  it('cria tabelas, enums e vinculos da recorrencia', () => {
    expect(migration).toContain("create type public.recurring_transaction_frequency as enum ('monthly');");
    expect(migration).toContain(
      "create type public.recurring_transaction_status as enum ('active', 'paused', 'cancelled');"
    );
    expect(migration).toContain('create table public.recurring_transactions');
    expect(migration).toContain('create table public.recurring_transaction_occurrences');
    expect(migration).toContain('add column recurring_transaction_id uuid');
    expect(migration).toContain('add column recurrence_period date');
  });

  it('mantem frequencia mensal extensivel sem ativar outros modos agora', () => {
    expect(migration).toContain("frequency public.recurring_transaction_frequency not null default 'monthly'");
    expect(migration).toContain("where user_id = v_user_id\n      and status = 'active'\n      and frequency = 'monthly'");
  });

  it('nao altera saldo ao criar a definicao da recorrencia', () => {
    expect(migration).toContain('create or replace function public.create_recurring_transaction');
    expect(migration).not.toMatch(
      /create or replace function public\.create_recurring_transaction[\s\S]*current_balance = current_balance/i
    );
  });

  it('gera transaction real so quando a competencia vence', () => {
    expect(migration).toContain('create or replace function public.generate_due_recurring_transactions()');
    expect(migration).toContain('if v_scheduled_date > current_date then');
    expect(migration).toContain('v_transaction := public.create_recurring_generated_transaction(');
    expect(migration).toContain('insert into public.recurring_transaction_occurrences');
  });

  it('evita duplicidade por competencia e por mutation deterministica', () => {
    expect(migration).toContain('create unique index recurring_transaction_occurrences_period_unique');
    expect(migration).toContain('create unique index transactions_recurring_period_unique');
    expect(migration).toContain("public.uuid_from_text(p_recurring_transaction_id::text || ':' || p_reference_period::text)");
    expect(migration).toContain('on conflict (user_id, client_mutation_id) do nothing');
  });

  it('faz despesa reduzir saldo e receita aumentar saldo ao gerar transaction', () => {
    expect(migration).toContain('v_signed_amount := public.transaction_signed_amount(p_type, p_amount);');
    expect(migration).toContain('current_balance = current_balance + v_signed_amount');
  });

  it('trata corretamente dia 31 em meses menores', () => {
    expect(migration).toContain('create or replace function public.compute_monthly_scheduled_date');
    expect(migration).toContain('public.make_safe_date(');
  });

  it('pausa impede novas geracoes sem apagar historico', () => {
    expect(migration).toContain('create or replace function public.pause_recurring_transaction');
    expect(migration).toContain("set status = 'paused'");
    expect(migration).not.toMatch(
      /create or replace function public\.pause_recurring_transaction[\s\S]*delete from public\.transactions/i
    );
  });

  it('retomada nao duplica meses pausados', () => {
    expect(migration).toContain('create or replace function public.resume_recurring_transaction');
    expect(migration).toContain('last_generated_period = greatest');
    expect(migration).toContain('v_resume_floor :=');
  });

  it('cancelamento preserva historico e impede novas geracoes', () => {
    expect(migration).toContain('create or replace function public.cancel_recurring_transaction');
    expect(migration).toContain("set status = 'cancelled'");
    expect(migration).not.toMatch(
      /create or replace function public\.cancel_recurring_transaction[\s\S]*delete from public\./i
    );
  });

  it('respeita end_date e ownership de conta e categoria', () => {
    expect(migration).toContain('if p_end_date is not null and p_end_date < p_start_date then');
    expect(migration).toContain('if v_recurring.end_date is not null and v_scheduled_date > v_recurring.end_date then');
    expect(migration).toContain('assert_account_matches_user');
    expect(migration).toContain('assert_category_matches_user_and_type');
  });

  it('protege leitura entre usuarios com rls e grants controlados', () => {
    expect(migration).toContain('alter table public.recurring_transactions enable row level security;');
    expect(migration).toContain(
      'alter table public.recurring_transaction_occurrences enable row level security;'
    );
    expect(migration).toContain('create policy "authenticated users can select own recurring transactions"');
    expect(migration).toContain(
      'create policy "authenticated users can select own recurring transaction occurrences"'
    );
  });
});
