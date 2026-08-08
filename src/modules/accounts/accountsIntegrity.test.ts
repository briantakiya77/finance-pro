import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const accountService = readFileSync(
  path.resolve(process.cwd(), 'src/modules/accounts/services/accountsService.ts'),
  'utf8'
);

const accountFormModal = readFileSync(
  path.resolve(process.cwd(), 'src/modules/accounts/components/AccountFormModal.tsx'),
  'utf8'
);

describe('accounts integrity protections', () => {
  it('nao envia current_balance livremente ao editar conta', () => {
    expect(accountService).toContain('current_balance: normalizedInitialBalance');
    expect(accountService).not.toContain('return mapFormValuesToInsert(values);');
  });

  it('bloqueia edicao manual do saldo atual no formulario', () => {
    expect(accountFormModal).toContain('readOnly');
    expect(accountFormModal).toContain('Saldo atual e controlado pelo sistema');
  });
});
