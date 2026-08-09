import { describe, expect, it } from 'vitest';

import {
  formatMonthInputValue,
  getProgressPercentage,
  getUsageTone,
  normalizeReferenceMonthInput
} from '@/modules/planning/services/planningService';

describe('planningService helpers', () => {
  it('normaliza competencia para o primeiro dia do mes', () => {
    expect(normalizeReferenceMonthInput('2026-08')).toBe('2026-08-01');
    expect(normalizeReferenceMonthInput('2026-08-22')).toBe('2026-08-01');
  });

  it('mantem porcentagem de progresso com duas casas', () => {
    expect(getProgressPercentage('650.00', '1000.00')).toBe(65);
    expect(getProgressPercentage('2700.00', '2300.00')).toBeCloseTo(117.39, 2);
  });

  it('retorna tom visual coerente com o status do orcamento', () => {
    expect(getUsageTone('within_limit')).toBe('success');
    expect(getUsageTone('near_limit')).toBe('warning');
    expect(getUsageTone('above_limit')).toBe('danger');
  });

  it('preserva o valor de input month no formato yyyy-mm', () => {
    expect(formatMonthInputValue('2026-08-01')).toBe('2026-08');
  });
});
