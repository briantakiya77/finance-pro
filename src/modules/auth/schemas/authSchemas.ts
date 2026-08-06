import { z } from 'zod';

export const authCredentialsSchema = z.object({
  email: z.string().trim().email('Informe um e-mail valido.'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.')
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().email('Informe um e-mail valido.')
});

export const updatePasswordSchema = z.object({
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.')
});
