import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { classifySimulation } from '../../../server/purchase-simulator';
import { addMoney, splitInstallments } from '../../../server/money';

function sum(values: string[]) {
  return values.reduce((total, value) => addMoney(total, value), '0.00');
}

describe('purchase simulator deterministic math', () => {
  it('rateia R$ 3.000 em 10x fechando a soma exata', () => {
    const installments = splitInstallments('3000.00', 10);

    expect(installments).toHaveLength(10);
    expect(installments.every((value) => value === '300.00')).toBe(true);
    expect(sum(installments)).toBe('3000.00');
  });

  it('rateia R$ 100 em 3x distribuindo centavos sem perda', () => {
    const installments = splitInstallments('100.00', 3);

    expect(installments).toEqual(['33.34', '33.33', '33.33']);
    expect(sum(installments)).toBe('100.00');
  });

  it('rateia R$ 1.000 em 7x fechando a soma exata', () => {
    const installments = splitInstallments('1000.00', 7);

    expect(installments).toEqual(['142.86', '142.86', '142.86', '142.86', '142.86', '142.85', '142.85']);
    expect(sum(installments)).toBe('1000.00');
  });

  it('classifica limite insuficiente como not_feasible', () => {
    expect(
      classifySimulation({
        feasibleByLimit: false,
        lowestProjectedBalance: '1000.00',
        monthlySavingsAfterPurchase: '500.00',
        planningRemaining: '500.00'
      })
    ).toBe('not_feasible');
  });

  it('classifica estouro de planejamento como risky', () => {
    expect(
      classifySimulation({
        feasibleByLimit: true,
        lowestProjectedBalance: '1000.00',
        monthlySavingsAfterPurchase: '500.00',
        planningRemaining: '-1.00'
      })
    ).toBe('risky');
  });

  it('mantem simulate_purchase sem escritas financeiras diretas', () => {
    const simulator = readFileSync(resolve(process.cwd(), 'server/purchase-simulator.ts'), 'utf-8');

    expect(simulator).not.toContain('.insert(');
    expect(simulator).not.toContain('.update(');
    expect(simulator).not.toContain('.delete(');
    expect(simulator).not.toContain('create_credit_card_purchase');
    expect(simulator).not.toContain('pay_credit_card_invoice');
  });
});
