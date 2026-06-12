import type { SupabaseClient } from '@supabase/supabase-js';
import type { Iteration } from '@/lib/types';

/** The project's active iteration (the one the pipeline currently operates on). */
export async function getCurrentIteration(
  supabase: SupabaseClient,
  projectId: string
): Promise<Iteration | null> {
  const { data: project } = await supabase
    .from('projects')
    .select('current_iteration_id')
    .eq('id', projectId)
    .maybeSingle();
  if (!project?.current_iteration_id) return null;

  const { data } = await supabase
    .from('iterations')
    .select('*')
    .eq('id', project.current_iteration_id)
    .maybeSingle();
  return (data as Iteration) ?? null;
}

/** Latest approved artifact content per type across the whole project (the
 * current state of the product), used as context when generating a new
 * iteration's artifacts. */
export async function latestApprovedByType(
  supabase: SupabaseClient,
  projectId: string
): Promise<Record<string, string>> {
  const { data } = await supabase
    .from('artifacts')
    .select('type, content, created_at')
    .eq('project_id', projectId)
    .eq('approved', true)
    .order('created_at', { ascending: false });
  const out: Record<string, string> = {};
  for (const a of (data as { type: string; content: string }[]) ?? []) {
    if (!(a.type in out)) out[a.type] = a.content;
  }
  return out;
}
