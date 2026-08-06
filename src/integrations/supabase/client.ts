import { createClient } from '@supabase/supabase-js';

import { env } from '@/shared/lib/env';
import type { Database } from '@/integrations/supabase/types';

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient<Database>(supabaseUrl, supabaseAnonKey) : null;

export const isSupabaseConfigured = supabase !== null;
