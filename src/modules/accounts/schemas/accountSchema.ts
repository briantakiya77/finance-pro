import { z } from 'zod';

import {
  accountColorValues,
  accountIconValues,
  accountTypeValues
} from '@/modules/accounts/types/accounts';

const moneyPattern = /^\d+(?:[.,]\d{1,2})?$/;

export const accountFormSchema = z.object({
  name: z.string().trim().min(2, 'Informe um nome com pelo menos 2 caracteres.'),
  bank: z.string().trim().min(2, 'Informe o banco da conta.'),
  type: z.enum(accountTypeValues),
  color: z.enum(accountColorValues),
  icon: z.enum(accountIconValues),
  initialBalance: z
    .string()
    .trim()
    .regex(moneyPattern, 'Informe um saldo inicial valido com ate 2 casas decimais.'),
  currentBalance: z
    .string()
    .trim()
    .regex(moneyPattern, 'Informe um saldo atual valido com ate 2 casas decimais.'),
  isActive: z.boolean(),
  isPrimary: z.boolean()
});
