import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/** False when the build has no Supabase credentials. The data layer uses this
 *  to skip network calls entirely rather than firing requests at a
 *  placeholder host and waiting for DNS to fail on every page. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey && supabaseKey !== 'placeholder');

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
);
