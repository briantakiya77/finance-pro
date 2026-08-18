import { describe, expect, it } from 'vitest';

import { addDecimalMoney, formatCurrencyInput, normalizeDecimalMoneyInput } from '@/shared/utils/money';

describe('money utils', () => {
  it('normaliza valor monetario como string decimal segura', () => {
    expect(normalizeDecimalMoneyInput('1.234,56')).toBe('1234.56');
    expect(normalizeDecimalMoneyInput('100')).toBe('100.00');
    expect(normalizeDecimalMoneyInput('45,9')).toBe('45.90');
    expect(normalizeDecimalMoneyInput('R$ 1.250,90')).toBe('1250.90');
  });

  it('mantem precisao decimal sem usar float como fonte de verdade', () => {
    expect(addDecimalMoney('0.10', '0.20')).toBe('0.30');
    expect(addDecimalMoney('1000.55', '99.45')).toBe('1100.00');
  });

  it('formata a entrada monetaria para BRL sem distorcer o valor', () => {
    expect(formatCurrencyInput('1250,90')).toBe('R$ 1.250,90');
    expect(formatCurrencyInput('R$ 89,50')).toBe('R$ 89,50');
  });
});
