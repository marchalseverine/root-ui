import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client — bypasses RLS. SERVER-ONLY; never import into a
 * client component (the service-role key must never reach the browser).
 *
 * Use only for privileged writes that RLS cannot express, and always after
 * verifying ownership with the user-scoped client first. Example: soft-deleting
 * a project (setting status='deleted'), which the owner's own session is
 * forbidden to do by the spec's RLS policy.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
