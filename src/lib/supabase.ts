import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/** False when the build has no Supabase credentials. The data layer uses this
 *  to skip network calls entirely rather than firing requests at a
 *  placeholder host and waiting for DNS to fail on every page. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey && supabaseKey !== 'placeholder');

// Deliberately not wrapped in import.meta.env.DEV: Vite replaces that with
// `false` in a production build and drops the block, which is exactly the
// environment where a missing variable is hardest to notice. The storefront
// still renders from local seed data, so nothing looks broken -- this is the
// only signal that it is not talking to the database.
if (!isSupabaseConfigured) {
  console.warn(
    '[supabase] No VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in this build. ' +
      'Serving local seed data; sign-in and password reset are disabled. ' +
      'Set both variables in Vercel (Production AND Preview) and redeploy.',
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
);
