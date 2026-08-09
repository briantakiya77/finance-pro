import { z } from 'zod';

import { normalizeDecimalMoneyInput } from '@/shared/utils/money';

const moneyMessage = 'Informe um valor valido com ate duas casas decimais.';

function moneyField(label: string, { allowEmpty = false }: { allowEmpty?: boolean } = {}) {
  return z
    .string()
    .trim()
    .transform((value) => normalizeDecimalMoneyInput(value))
    .refine((value) => (allowEmpty && value === '') || /^\d+(\.\d{2})?$/.test(value), {
      message: allowEmpty ? `${label} ${moneyMessage.toLowerCase()}` : `${label} ${moneyMessage.toLowerCase()}`
    });
}

export const planningBudgetSchema = z.object({
  categoryId: z.string().uuid('Categoria invalida.'),
  categoryName: z.string(),
  budgetAmount: moneyField('Orcamento da categoria', { allowEmpty: true })
});

export const planningFormSchema = z.object({
  expectedIncome: moneyField('Receita esperada', { allowEmpty: true }),
  notes: z.string().trim().max(1000, 'Observacao pode ter no maximo 1000 caracteres.'),
  savingsTarget: moneyField('Meta de economia'),
  spendingLimit: moneyField('Limite de gastos', { allowEmpty: true }),
  categoryBudgets: z.array(planningBudgetSchema)
});
