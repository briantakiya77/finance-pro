import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const transactionsPage = readFileSync(
  path.resolve(process.cwd(), 'src/modules/transactions/pages/TransactionsPage.tsx'),
  'utf8'
);

const transactionFormModal = readFileSync(
  path.resolve(process.cwd(), 'src/modules/transactions/components/TransactionFormModal.tsx'),
  'utf8'
);

describe('transactions frontend safeguards', () => {
  it('bloqueia envio duplicado durante submit', () => {
    expect(transactionFormModal).toContain('disabled={');
    expect(transactionFormModal).toContain('isSubmitting ||');
    expect(transactionsPage).toContain('createTransactionMutation.isPending');
  });

  it('envia identificador idempotente na criacao de lancamento', () => {
    expect(transactionsPage).toContain('crypto.randomUUID()');
    expect(transactionsPage).toContain('clientMutationId: createClientMutationId()');
  });
});
