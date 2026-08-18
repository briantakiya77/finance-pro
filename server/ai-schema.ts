import { z } from 'zod';

export const financialAssistantRequestSchema = z.object({
  conversationId: z.string().uuid().nullable().optional(),
  message: z
    .string()
    .trim()
    .min(1, 'message length invalid')
    .max(2000, 'message length invalid')
});

export const financialAssistantDataSchema = z.object({
  recommendation: z.string().trim().min(1).max(1200),
  simulation: z
    .object({
      installmentAmount: z.string().trim().optional(),
      installments: z.number().int().min(1).max(60).optional(),
      purchaseAmount: z.string().trim().optional(),
      safeToSpendAfter: z.string().trim().optional(),
      safeToSpendBefore: z.string().trim().optional()
    })
    .optional(),
  summary: z.string().trim().min(1).max(1200),
  insights: z.array(z.string().trim().min(1).max(300)).max(6),
  warnings: z.array(z.string().trim().min(1).max(300)).max(6)
});

export type FinancialAssistantData = z.infer<typeof financialAssistantDataSchema>;
export type FinancialAssistantRequestInput = z.infer<typeof financialAssistantRequestSchema>;
