import { createClient } from '@supabase/supabase-js';

import type { Database } from '../src/integrations/supabase/types.js';
import type { ServerConfig } from './config.js';

type AuthenticatedClient = ReturnType<typeof createClient<Database>>;

export type AuthenticatedRequestContext = {
  client: AuthenticatedClient;
  token: string;
  userId: string;
};

export function getBearerToken(authorizationHeader: string | undefined) {
  const match = authorizationHeader?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

export async function createAuthenticatedSupabaseContext(
  config: ServerConfig,
  authorizationHeader: string | undefined
): Promise<AuthenticatedRequestContext> {
  const token = getBearerToken(authorizationHeader);

  if (!token) {
    throw new Error('authenticated user required');
  }

  const client = createClient<Database>(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Client-Info': 'finance-pro-ai-server'
      }
    }
  });

  const { data, error } = await client.auth.getUser(token);

  if (error || !data.user?.id) {
    throw new Error('authenticated user required');
  }

  return {
    client,
    token,
    userId: data.user.id
  };
}
