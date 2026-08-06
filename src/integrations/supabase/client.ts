import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { env } from '@/shared/lib/env';
import type { Database } from '@/integrations/supabase/types';

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

type AppSupabaseClient = SupabaseClient<Database>;

let supabaseClient: AppSupabaseClient | null = null;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

function createSupabaseSingleton() {
  if (!isSupabaseConfigured) {
    return null;
  }

  if (supabaseClient) {
    return supabaseClient;
  }

  const configuredUrl = supabaseUrl as string;
  const configuredAnonKey = supabaseAnonKey as string;

  supabaseClient = createClient<Database>(configuredUrl, configuredAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'X-Client-Info': 'finance-pro-web'
      }
    }
  });

  return supabaseClient;
}

export const supabase = createSupabaseSingleton();

export function getSupabaseClient() {
  return supabase;
}

export function requireSupabaseClient() {
  const client = getSupabaseClient();

  if (!client) {
    throw new Error(
      'Supabase nao configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY antes de usar a integracao.'
    );
  }

  return client;
}

export const supabaseServices = {
  auth() {
    return requireSupabaseClient().auth;
  },
  database() {
    return requireSupabaseClient();
  },
  storage() {
    return requireSupabaseClient().storage;
  },
  functions() {
    return requireSupabaseClient().functions;
  }
};
