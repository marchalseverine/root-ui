import { createClient } from '@/lib/supabase/server';
import { notFound, ok, unauthorized } from '@/lib/api/http';

const ARTIFACT_TYPES = ['prd', 'spec', 'tasks'] as const;
type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  // RLS restricts to the owner's non-deleted projects, so another user's
  // project simply returns no row -> 404 (no 403, no information leakage).
  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error || !project) return notFound('Project not found');

  const latest_artifacts: Record<ArtifactType, unknown> = {
    prd: null,
    spec: null,
    tasks: null,
  };
  for (const type of ARTIFACT_TYPES) {
    const { data: artifact } = await supabase
      .from('artifacts')
      .select('id, content, approved_at, prompt_lang')
      .eq('project_id', id)
      .eq('type', type)
      .eq('approved', true)
      .order('approved_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    latest_artifacts[type] = artifact ?? null;
  }

  const { count: total } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', id);
  const { count: checked } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', id)
    .eq('checked', true);

  return ok({
    ...project,
    latest_artifacts,
    task_stats: { total: total ?? 0, checked: checked ?? 0 },
  });
}
