import { createClient } from '@supabase/supabase-js';

/**
 * Anonymous Supabase client (anon key, no session). Requests run as the `anon`
 * role, so RLS only exposes public/demo data. Used by the public demo routes.
 */
export function createAnonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
