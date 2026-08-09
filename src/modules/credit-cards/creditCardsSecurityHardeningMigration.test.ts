import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const baseMigration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260808194000_create_credit_cards_core.sql'),
  'utf-8'
);

const hardeningMigration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20260809093000_harden_credit_card_helper_functions.sql'
  ),
  'utf-8'
);

describe('credit cards security hardening migration', () => {
  it('revoga execute dos helpers internos para public e authenticated', () => {
    expect(hardeningMigration).toContain(
      'revoke execute on function public.refresh_credit_card_invoice_status(uuid) from public, anon, authenticated;'
    );
    expect(hardeningMigration).toContain(
      'revoke execute on function public.ensure_credit_card_invoice(uuid, uuid, date, smallint, smallint) from public, anon, authenticated;'
    );
    expect(hardeningMigration).toContain(
      'revoke execute on function public.credit_card_utilized_amount(uuid) from public, anon, authenticated;'
    );
    expect(hardeningMigration).toContain(
      'revoke execute on function public.assert_credit_card_matches_user(uuid, uuid) from public, anon, authenticated;'
    );
    expect(hardeningMigration).toContain(
      'revoke execute on function public.assert_credit_card_invoice_matches_user(uuid, uuid) from public, anon, authenticated;'
    );
    expect(hardeningMigration).toContain(
      'revoke execute on function public.assert_credit_card_invoice_matches_card(uuid, uuid) from public, anon, authenticated;'
    );
  });

  it('impede usuario A de alterar status da fatura de B por helper privilegiado', () => {
    expect(hardeningMigration).toContain("v_user_id uuid := (select auth.uid())");
    expect(hardeningMigration).toContain("raise exception 'authenticated user required'");
    expect(hardeningMigration).toContain('where id = p_invoice_id');
    expect(hardeningMigration).toContain('and user_id = v_user_id');
    expect(hardeningMigration).toContain("raise exception 'invoice not found for current user'");
  });

  it('impede usuario A de criar fatura para usuario B', () => {
    expect(hardeningMigration).toContain('if p_user_id is distinct from v_user_id then');
    expect(hardeningMigration).toContain("raise exception 'cannot create invoice for another user'");
    expect(hardeningMigration).toContain('where id = p_credit_card_id');
    expect(hardeningMigration).toContain('and user_id = v_user_id');
  });

  it('impede usuario A de consultar limite utilizado do cartao de B por helper privilegiado', () => {
    expect(hardeningMigration).toContain(
      "if not public.assert_credit_card_matches_user(v_user_id, p_credit_card_id) then"
    );
    expect(hardeningMigration).toContain("raise exception 'credit card not found for current user'");
    expect(hardeningMigration).toContain('and i.user_id = v_user_id');
  });

  it('mantem expostas apenas as quatro rpcs financeiras necessarias ao frontend', () => {
    expect(hardeningMigration).toContain(
      'grant execute on function public.create_credit_card_purchase(uuid, uuid, text, numeric, date, text, uuid) to authenticated;'
    );
    expect(hardeningMigration).toContain(
      'grant execute on function public.update_credit_card_purchase(uuid, uuid, uuid, text, numeric, date, text) to authenticated;'
    );
    expect(hardeningMigration).toContain(
      'grant execute on function public.soft_delete_credit_card_purchase(uuid) to authenticated;'
    );
    expect(hardeningMigration).toContain(
      'grant execute on function public.pay_credit_card_invoice(uuid, uuid, numeric, uuid) to authenticated;'
    );
  });

  it('mantem compras e pagamentos idempotentes', () => {
    expect(baseMigration).toContain('credit_card_transactions_user_mutation_unique');
    expect(baseMigration).toContain('credit_card_invoice_payments_user_mutation_unique');
    expect(baseMigration).toContain('on conflict (user_id, client_mutation_id) do nothing');
  });

  it('mantem rls protegendo selects entre usuarios', () => {
    expect(baseMigration).toContain(
      'create policy "authenticated users can select own active credit cards"'
    );
    expect(baseMigration).toContain('create policy "authenticated users can select own invoices"');
    expect(baseMigration).toContain(
      'create policy "authenticated users can select own credit card purchases"'
    );
    expect(baseMigration).toContain(
      'create policy "authenticated users can select own invoice payments"'
    );
  });
});
