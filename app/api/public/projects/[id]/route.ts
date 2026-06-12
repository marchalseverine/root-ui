import { createAnonClient } from '@/lib/supabase/anon';
import { notFound, ok } from '@/lib/api/http';

const ARTIFACT_TYPES = ['prd', 'spec', 'tasks'] as const;
type ArtifactType = (typeof ARTIFACT_TYPES)[number];

// Public, read-only demo route. The anon client + RLS enforce
// `is_demo = true AND status = 'active'`; anything else returns 404.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAnonClient();

  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error || !project) return notFound('Project not found');

  const { data: iteration } = await supabase
    .from('iterations')
    .select('*')
    .eq('id', project.current_iteration_id)
    .maybeSingle();

  const latest_artifacts: Record<ArtifactType, unknown> = {
    prd: null,
    spec: null,
    tasks: null,
  };
  if (iteration) {
    for (const type of ARTIFACT_TYPES) {
      const { data: artifact } = await supabase
        .from('artifacts')
        .select('id, content, approved_at, prompt_lang')
        .eq('iteration_id', iteration.id)
        .eq('type', type)
        .eq('approved', true)
        .order('approved_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      latest_artifacts[type] = artifact ?? null;
    }
  }

  const { count: total } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('iteration_id', iteration?.id ?? '');
  const { count: checked } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('iteration_id', iteration?.id ?? '')
    .eq('checked', true);

  const pipeline = iteration
    ? {
        stage: iteration.stage,
        gate_prd: iteration.gate_prd,
        gate_spec: iteration.gate_spec,
        gate_tasks: iteration.gate_tasks,
        gate_build: iteration.gate_build,
        gate_deploy: iteration.gate_deploy,
      }
    : {};

  return ok({
    ...project,
    ...pipeline,
    latest_artifacts,
    task_stats: { total: total ?? 0, checked: checked ?? 0 },
  });
}
