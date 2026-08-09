export type ServerConfig = {
  aiApiKey?: string;
  aiModel: string;
  aiProvider: 'gemini' | 'mock' | 'openai';
  aiRateLimitPerMinute: number;
  aiRequestTimeoutMs: number;
  nodeEnv: string;
  port: number;
  supabaseAnonKey: string;
  supabaseUrl: string;
};

function getNumberEnv(name: string, fallback: number) {
  const value = process.env[name];
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getProvider(value: string | undefined): ServerConfig['aiProvider'] {
  if (value === 'openai' || value === 'gemini') {
    return value;
  }

  return 'mock';
}

export function getServerConfig(): ServerConfig {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required on the server.');
  }

  const aiProvider = getProvider(process.env.AI_PROVIDER);

  return {
    aiApiKey: process.env.AI_API_KEY,
    aiModel:
      process.env.AI_MODEL ??
      (aiProvider === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4.1-mini'),
    aiProvider,
    aiRateLimitPerMinute: getNumberEnv('AI_RATE_LIMIT_PER_MINUTE', 10),
    aiRequestTimeoutMs: getNumberEnv('AI_REQUEST_TIMEOUT_MS', 12000),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: getNumberEnv('PORT', 3000),
    supabaseAnonKey,
    supabaseUrl
  };
}
