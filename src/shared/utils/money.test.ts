import { describe, expect, it } from 'vitest';

import { addDecimalMoney, normalizeDecimalMoneyInput } from '@/shared/utils/money';

describe('money utils', () => {
  it('normaliza valor monetario como string decimal segura', () => {
    expect(normalizeDecimalMoneyInput('1.234,56')).toBe('1234.56');
    expect(normalizeDecimalMoneyInput('100')).toBe('100.00');
    expect(normalizeDecimalMoneyInput('45,9')).toBe('45.90');
  });

  it('mantem precisao decimal sem usar float como fonte de verdade', () => {
    expect(addDecimalMoney('0.10', '0.20')).toBe('0.30');
    expect(addDecimalMoney('1000.55', '99.45')).toBe('1100.00');
  });
});
