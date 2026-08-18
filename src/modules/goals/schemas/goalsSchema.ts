import { z } from 'zod';

import { normalizeDecimalMoneyInput } from '@/shared/utils/money';

function moneyField(label: string) {
  return z
    .string()
    .trim()
    .transform((value) => normalizeDecimalMoneyInput(value))
    .refine((value) => /^\d+(\.\d{2})?$/.test(value), {
      message: `${label} deve ser positivo com ate duas casas decimais.`
    });
}

export const financialGoalFormSchema = z.object({
  currentAmount: moneyField('Valor atual'),
  name: z
    .string()
    .trim()
    .min(2, 'Nome da meta deve ter ao menos 2 caracteres.')
    .max(160, 'Nome da meta pode ter no maximo 160 caracteres.'),
  notes: z.string().trim().max(1000, 'Observacao pode ter no maximo 1000 caracteres.'),
  targetAmount: moneyField('Valor da meta'),
  targetDate: z.string().trim(),
  targetMonths: z.enum(['', '3', '6', '9', '12']),
  type: z.enum(['general', 'emergency_fund', 'purchase', 'investment'])
});

export const goalProgressSchema = z.object({
  accountId: z.string().trim(),
  amount: moneyField('Valor do aporte'),
  contributionDate: z.string().trim().min(1, 'Informe a data do aporte.'),
  description: z.string().trim().max(240, 'Descricao pode ter no maximo 240 caracteres.')
});
