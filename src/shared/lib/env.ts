import { z } from 'zod';

const frontendEnvSchema = z.object({
  VITE_SUPABASE_URL: z.string().trim().optional(),
  VITE_SUPABASE_ANON_KEY: z.string().trim().optional()
});

const productionEnvSchema = z.object({
  VITE_SUPABASE_URL: z.string().url('VITE_SUPABASE_URL deve ser uma URL valida em producao.'),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, 'VITE_SUPABASE_ANON_KEY e obrigatoria em producao.')
});

type FrontendEnv = z.infer<typeof frontendEnvSchema>;
type AppEnv = z.infer<typeof productionEnvSchema> | FrontendEnv;

const requiredSupabaseVariables = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] as const;

function getMissingSupabaseVariables(env: FrontendEnv) {
  return requiredSupabaseVariables.filter((key) => !env[key]);
}

function warnMissingDevVariables(env: FrontendEnv) {
  if (import.meta.env.MODE !== 'development') {
    return;
  }

  const missingVariables = getMissingSupabaseVariables(env);

  if (missingVariables.length > 0) {
    console.warn(
      `[env] Supabase ainda nao configurado no ambiente local. Defina ${missingVariables.join(', ')} no arquivo .env.local. Apenas VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY devem ser usadas no frontend.`
    );
  }
}

function normalizeFrontendEnv(env: FrontendEnv): FrontendEnv {
  return {
    VITE_SUPABASE_URL: env.VITE_SUPABASE_URL || undefined,
    VITE_SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY || undefined
  };
}

function parseEnvironment(): AppEnv {
  const rawEnv = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY
  };

  if (import.meta.env.PROD) {
    return productionEnvSchema.parse(rawEnv);
  }

  const parsedEnv = normalizeFrontendEnv(frontendEnvSchema.parse(rawEnv));
  warnMissingDevVariables(parsedEnv);

  return parsedEnv;
}

export const env = parseEnvironment();
export const hasSupabaseEnv = getMissingSupabaseVariables(env).length === 0;
