import { z } from 'zod';

import { normalizeDecimalMoneyInput } from '@/shared/utils/money';

const decimalMoneySchema = z
  .string()
  .trim()
  .min(1, 'Informe o valor.')
  .transform((value) => normalizeDecimalMoneyInput(value))
  .refine((value) => /^\d+(\.\d{2})$/.test(value), 'Informe um valor monetario valido.')
  .refine((value) => value !== '0.00', 'O valor deve ser maior que zero.');

export const transactionFormSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: decimalMoneySchema,
  description: z.string().trim().min(2, 'Informe uma descricao.').max(160),
  accountId: z.string().uuid('Selecione uma conta.'),
  categoryId: z.string().uuid('Selecione uma categoria.').or(z.literal('')),
  transactionDate: z.string().min(1, 'Informe a data.'),
  notes: z.string().max(1000, 'As observacoes devem ter no maximo 1000 caracteres.').default('')
});
