import { z } from 'zod';

const sharedEnvShape = {
  VITE_SUPABASE_URL: z.string().trim().optional(),
  VITE_SUPABASE_ANON_KEY: z.string().trim().optional()
};

const productionEnvSchema = z.object({
  VITE_SUPABASE_URL: z.string().url('VITE_SUPABASE_URL deve ser uma URL valida em producao.'),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, 'VITE_SUPABASE_ANON_KEY e obrigatoria em producao.')
});

const nonProductionEnvSchema = z.object(sharedEnvShape);

type AppEnv = z.infer<typeof productionEnvSchema> | z.infer<typeof nonProductionEnvSchema>;

function warnMissingDevVariables(env: z.infer<typeof nonProductionEnvSchema>) {
  if (import.meta.env.MODE !== 'development') {
    return;
  }

  const missingVariables = Object.entries(env)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingVariables.length > 0) {
    console.warn(
      `[env] Variaveis opcionais ainda nao configuradas no desenvolvimento: ${missingVariables.join(', ')}.`
    );
  }
}

function parseEnvironment(): AppEnv {
  const rawEnv = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY
  };

  if (import.meta.env.PROD) {
    return productionEnvSchema.parse(rawEnv);
  }

  const parsedEnv = nonProductionEnvSchema.parse(rawEnv);
  warnMissingDevVariables(parsedEnv);

  return parsedEnv;
}

export const env = parseEnvironment();
