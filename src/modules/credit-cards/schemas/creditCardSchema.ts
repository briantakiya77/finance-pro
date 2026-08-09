import { z } from 'zod';

import {
  creditCardBrandValues,
  creditCardColorValues
} from '@/modules/credit-cards/types/creditCards';
import { normalizeDecimalMoneyInput } from '@/shared/utils/money';

const decimalMoneySchema = z
  .string()
  .trim()
  .min(1, 'Informe o limite do cartao.')
  .transform((value) => normalizeDecimalMoneyInput(value))
  .refine((value) => /^\d+(\.\d{2})$/.test(value), 'Informe um valor monetario valido.')
  .refine((value) => value !== '0.00', 'O limite precisa ser maior que zero.');

const daySchema = z
  .string()
  .trim()
  .refine((value) => /^\d{1,2}$/.test(value), 'Informe um dia valido.')
  .transform((value) => Number(value))
  .refine((value) => value >= 1 && value <= 31, 'Informe um dia entre 1 e 31.');

export const creditCardFormSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do cartao.').max(120),
  bank: z.string().trim().min(2, 'Informe o banco emissor.').max(120),
  brand: z.enum(['', ...creditCardBrandValues]),
  lastFour: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || /^\d{4}$/.test(value),
      'Os ultimos 4 digitos sao invalidos.'
    ),
  limitAmount: decimalMoneySchema,
  closingDay: daySchema,
  dueDay: daySchema,
  color: z.enum(creditCardColorValues),
  isActive: z.boolean()
});

export const creditCardPurchaseSchema = z.object({
  creditCardId: z.string().uuid('Selecione um cartao.'),
  categoryId: z.string().uuid('Selecione uma categoria de despesa.'),
  description: z.string().trim().min(2, 'Informe a descricao.').max(160),
  amount: z
    .string()
    .trim()
    .min(1, 'Informe o valor.')
    .transform((value) => normalizeDecimalMoneyInput(value))
    .refine((value) => /^\d+(\.\d{2})$/.test(value), 'Informe um valor monetario valido.')
    .refine((value) => value !== '0.00', 'O valor precisa ser maior que zero.'),
  purchaseDate: z.string().min(1, 'Informe a data da compra.'),
  notes: z.string().max(1000, 'As observacoes devem ter no maximo 1000 caracteres.').default(''),
  purchaseMode: z.enum(['single', 'installment']),
  installmentCount: z.string().default('1')
}).superRefine((value, context) => {
  if (value.purchaseMode !== 'installment') {
    return;
  }

  if (!/^\d+$/.test(value.installmentCount)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['installmentCount'],
      message: 'Informe a quantidade de parcelas.'
    });
    return;
  }

  const count = Number(value.installmentCount);

  if (count < 2 || count > 60) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['installmentCount'],
      message: 'As parcelas devem ficar entre 2 e 60.'
    });
  }
});

export const creditCardPaymentSchema = z.object({
  accountId: z.string().uuid('Selecione a conta usada no pagamento.'),
  amount: z
    .string()
    .trim()
    .min(1, 'Informe o valor do pagamento.')
    .transform((value) => normalizeDecimalMoneyInput(value))
    .refine((value) => /^\d+(\.\d{2})$/.test(value), 'Informe um valor monetario valido.')
    .refine((value) => value !== '0.00', 'O valor precisa ser maior que zero.')
});
