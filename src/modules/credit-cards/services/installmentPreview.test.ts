import { describe, expect, it } from 'vitest';

import { buildInstallmentPreview } from '@/modules/credit-cards/services/installmentPreview';

describe('buildInstallmentPreview', () => {
  it('mantem soma exata para 3000 em 10 parcelas', () => {
    const result = buildInstallmentPreview('3000', 10);

    expect(result.installments).toHaveLength(10);
    expect(result.installments.every((item) => item === '300.00')).toBe(true);
  });

  it('distribui centavos sem perder valor total em 100 dividido por 3', () => {
    const result = buildInstallmentPreview('100', 3);

    expect(result.installments).toEqual(['33.34', '33.33', '33.33']);
  });

  it('retorna preview vazio para parcelamento invalido', () => {
    const result = buildInstallmentPreview('abc', 1);

    expect(result.installments).toEqual([]);
  });
});
