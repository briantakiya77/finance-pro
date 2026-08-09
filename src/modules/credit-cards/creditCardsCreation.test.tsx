import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requireSupabaseClient } from '@/integrations/supabase';
import { CreditCardFormModal } from '@/modules/credit-cards/components/CreditCardFormModal';
import { creditCardsService } from '@/modules/credit-cards/services/creditCardsService';
import type { CreditCardFormValues, CreditCardRow } from '@/modules/credit-cards/types/creditCards';
import { createMockSession, createMockUser, setMockSession } from '@/test/mocks/supabaseAuth';

const validCardValues: CreditCardFormValues = {
  bank: 'Nubank',
  brand: 'visa',
  closingDay: '10',
  color: '#8B5CF6',
  dueDay: '15',
  isActive: true,
  lastFour: '1234',
  limitAmount: '3000,00',
  name: 'Cartao principal'
};

beforeEach(() => {
  vi.mocked(requireSupabaseClient().from).mockClear();
});

function createInsertQueryMock(response: { data: CreditCardRow | null; error: Error | null }) {
  const query = {
    insert: vi.fn(() => query),
    select: vi.fn(() => query),
    single: vi.fn(async () => response)
  };

  return query;
}

describe('credit card creation', () => {
  it('obtem usuario autenticado e inclui user_id correto no insert', async () => {
    setMockSession(
      createMockSession({
        user: createMockUser({ id: 'user-card-1' })
      })
    );
    const insertedCard = {
      bank: 'Nubank',
      brand: 'visa',
      closing_day: 10,
      color: '#8B5CF6',
      created_at: '2026-08-09T00:00:00.000Z',
      deleted_at: null,
      due_day: 15,
      id: 'card-1',
      is_active: true,
      last_four: '1234',
      limit_amount: '3000.00',
      name: 'Cartao principal',
      updated_at: '2026-08-09T00:00:00.000Z',
      user_id: 'user-card-1'
    };
    const query = createInsertQueryMock({ data: insertedCard, error: null });
    const client = requireSupabaseClient();
    vi.mocked(client.from).mockReturnValue(query as never);

    const result = await creditCardsService.createCreditCard({
      ...validCardValues,
      user_id: 'malicious-user'
    } as CreditCardFormValues & { user_id: string });

    expect(result.error).toBeNull();
    expect(client.auth.getSession).toHaveBeenCalled();
    expect(client.from).toHaveBeenCalledWith('credit_cards');
    expect(query.insert).toHaveBeenCalledWith({
      bank: 'Nubank',
      brand: 'visa',
      closing_day: 10,
      color: '#8B5CF6',
      due_day: 15,
      is_active: true,
      last_four: '1234',
      limit_amount: '3000.00',
      name: 'Cartao principal',
      user_id: 'user-card-1'
    });
  });

  it('usuario nao autenticado nao executa insert', async () => {
    setMockSession(null);
    const client = requireSupabaseClient();

    const result = await creditCardsService.createCreditCard(validCardValues);

    expect(result.data).toBeNull();
    expect(result.error).toBe('Sua sessao expirou. Entre novamente para criar ou alterar cartoes.');
    expect(client.from).not.toHaveBeenCalled();
  });

  it('erro do insert gera erro sanitizado para a camada de UI', async () => {
    setMockSession(createMockSession());
    const query = createInsertQueryMock({
      data: null,
      error: new Error('new row violates row-level security policy for table "credit_cards"')
    });
    const client = requireSupabaseClient();
    vi.mocked(client.from).mockReturnValue(query as never);

    const result = await creditCardsService.createCreditCard(validCardValues);

    expect(result.data).toBeNull();
    expect(result.error).toBe('Sua sessao nao tem permissao para alterar este cartao.');
  });

  it('preserva RLS nas migrations de cartoes', () => {
    const migration = readFileSync(
      path.resolve(process.cwd(), 'supabase/migrations/20260808194000_create_credit_cards_core.sql'),
      'utf8'
    );

    expect(migration).toContain('alter table public.credit_cards enable row level security;');
    expect(migration).toContain('create policy "authenticated users can insert own credit cards"');
    expect(migration).toContain('with check ((select auth.uid()) = user_id)');
  });

  it('feedback da pagina separa sucesso e erro', () => {
    const page = readFileSync(
      path.resolve(process.cwd(), 'src/modules/credit-cards/pages/CreditCardsPage.tsx'),
      'utf8'
    );

    expect(page).toContain("variant: 'success'");
    expect(page).toContain("variant: 'danger'");
    expect(page).toContain('Cartao criado com sucesso.');
    expect(page).toContain('Nao foi possivel criar o cartao.');
    expect(page).toContain('<Toast variant={feedback.variant} title={feedback.title}>');
  });

  it('botao Criar cartao dispara submit com valores validos', async () => {
    const onSubmit = vi.fn();

    render(<CreditCardFormModal isSubmitting={false} onClose={vi.fn()} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByPlaceholderText('Cartao principal'), {
      target: { value: 'Cartao principal' }
    });
    fireEvent.change(screen.getByPlaceholderText('Nubank'), {
      target: { value: 'Nubank' }
    });
    fireEvent.change(screen.getByPlaceholderText('1234'), {
      target: { value: '1234' }
    });
    fireEvent.change(screen.getByPlaceholderText('0,00'), {
      target: { value: '3000,00' }
    });

    fireEvent.click(screen.getByRole('button', { name: 'Criar cartao' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          bank: 'Nubank',
          brand: '',
          closingDay: 10,
          color: '#8B5CF6',
          dueDay: 15,
          isActive: true,
          lastFour: '1234',
          limitAmount: '3000.00',
          name: 'Cartao principal'
        })
      );
    });
  });

  it('aceita os valores PICPAY e dispara submit com cartao ativo', async () => {
    const onSubmit = vi.fn();

    render(<CreditCardFormModal isSubmitting={false} onClose={vi.fn()} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByPlaceholderText('Cartao principal'), {
      target: { value: 'PICPAY PLATINUM' }
    });
    fireEvent.change(screen.getByPlaceholderText('Nubank'), {
      target: { value: 'PICPAY' }
    });
    fireEvent.change(screen.getByPlaceholderText('1234'), {
      target: { value: '7037' }
    });
    fireEvent.change(screen.getByPlaceholderText('0,00'), {
      target: { value: '2809' }
    });
    fireEvent.change(screen.getByPlaceholderText('10'), {
      target: { value: '03' }
    });
    fireEvent.change(screen.getByPlaceholderText('15'), {
      target: { value: '10' }
    });

    fireEvent.click(screen.getByRole('button', { name: 'Criar cartao' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          bank: 'PICPAY',
          brand: '',
          closingDay: 3,
          color: '#8B5CF6',
          dueDay: 10,
          isActive: true,
          lastFour: '7037',
          limitAmount: '2809.00',
          name: 'PICPAY PLATINUM'
        })
      );
    });
  });

  it('botao submit exibe feedback global e FieldError quando houver validacao', async () => {
    const onSubmit = vi.fn();

    render(<CreditCardFormModal isSubmitting={false} onClose={vi.fn()} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Criar cartao' }));

    expect(await screen.findByText('Revise os campos destacados antes de continuar.')).toBeTruthy();
    expect(await screen.findByText('Informe o nome do cartao.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
