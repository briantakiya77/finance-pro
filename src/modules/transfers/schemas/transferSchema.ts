import { z } from 'zod';

export const transferFormSchema = z
  .object({
    fromAccountId: z.string().uuid('Selecione a conta de origem.'),
    toAccountId: z.string().uuid('Selecione a conta de destino.'),
    amount: z
      .string()
      .trim()
      .min(1, 'Informe o valor da transferencia.')
      .refine((value) => /^\d+([.,]\d{1,2})?$/.test(value), {
        message: 'Informe um valor positivo com ate duas casas decimais.'
      }),
    description: z.string().trim().max(160, 'A descricao deve ter no maximo 160 caracteres.'),
    transferDate: z
      .string()
      .trim()
      .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), {
        message: 'Informe uma data valida.'
      })
  })
  .refine((value) => value.fromAccountId !== value.toAccountId, {
    message: 'A conta de origem deve ser diferente da conta de destino.',
    path: ['toAccountId']
  });
