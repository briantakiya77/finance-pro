import { z } from 'zod';

import { normalizeDecimalMoneyInput } from '@/shared/utils/money';

const decimalMoneySchema = z
  .string()
  .trim()
  .min(1, 'Informe o valor.')
  .transform((value) => normalizeDecimalMoneyInput(value))
  .refine((value) => /^\d+(\.\d{2})$/.test(value), 'Informe um valor monetario valido.')
  .refine((value) => value !== '0.00', 'O valor precisa ser maior que zero.');

const dayOfMonthSchema = z
  .string()
  .trim()
  .min(1, 'Informe o dia do mes.')
  .refine((value) => /^\d{1,2}$/.test(value), 'Informe um dia valido.')
  .transform((value) => Number(value))
  .refine((value) => value >= 1 && value <= 31, 'Informe um dia entre 1 e 31.');

export const recurringTransactionSchema = z
  .object({
    accountId: z.string().uuid('Selecione uma conta.'),
    categoryId: z.string().uuid('Selecione uma categoria.'),
    type: z.enum(['income', 'expense']),
    frequency: z.enum(['weekly', 'monthly', 'yearly']),
    description: z.string().trim().min(2, 'Informe a descricao.').max(160),
    amount: decimalMoneySchema,
    dayOfMonth: z.string().trim().default(''),
    startDate: z.string().min(1, 'Informe a data inicial.'),
    endDate: z.string().default(''),
    notes: z.string().max(1000, 'As observacoes devem ter no maximo 1000 caracteres.').default('')
  })
  .superRefine((value, context) => {
    if (value.frequency !== 'weekly') {
      const parsedDay = dayOfMonthSchema.safeParse(value.dayOfMonth);

      if (!parsedDay.success) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['dayOfMonth'],
          message: parsedDay.error.issues[0]?.message ?? 'Informe o dia do mes.'
        });
      }
    }

    if (!value.endDate) {
      return;
    }

    if (value.endDate < value.startDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'A data final precisa ser igual ou posterior a inicial.'
      });
    }
  })
  .transform((value) => ({
    ...value,
    dayOfMonth:
      value.frequency === 'weekly'
        ? Number(value.startDate.slice(-2))
        : Number(value.dayOfMonth)
  }));
