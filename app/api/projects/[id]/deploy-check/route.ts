import { createClient } from '@/lib/supabase/server';
import { getCurrentIteration } from '@/lib/iterations';
import { apiError, notFound, ok, unauthorized } from '@/lib/api/http';

interface DeployCheckResult {
  passed: boolean;
  checks: Array<{ name: string; passed: boolean; message: string | null }>;
  summary: string;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!project) return notFound('Project not found');

  const iteration = await getCurrentIteration(supabase, id);
  if (!iteration) return apiError('NO_ITERATION', 'Project has no iteration', 400);

  if (!iteration.gate_build) {
    return apiError('BUILD_NOT_COMPLETE', 'All tasks must be checked first', 400);
  }

  const { count: total } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('iteration_id', iteration.id);
  const { count: checked } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('iteration_id', iteration.id)
    .eq('checked', true);

  const payload = {
    task_stats: { total: total ?? 0, checked: checked ?? 0 },
    prd_approved: iteration.gate_prd,
    spec_approved: iteration.gate_spec,
    tasks_artifact_exists: iteration.gate_tasks,
  };

  const fastapiUrl = process.env.FASTAPI_BASE_URL ?? 'http://localhost:8000';
  let result: DeployCheckResult;
  try {
    const res = await fetch(`${fastapiUrl}/internal/deploy-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.INTERNAL_API_SECRET}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`FastAPI ${res.status}`);
    result = (await res.json()) as DeployCheckResult;
  } catch {
    return apiError('FASTAPI_UNAVAILABLE', 'Deploy check service unavailable', 502);
  }

  const checkedAt = new Date().toISOString();
  const detail = { checks: result.checks, summary: result.summary };

  // Cache the result on the project; advance the gate/stage on the iteration.
  await supabase
    .from('projects')
    .update({
      last_deploy_check_at: checkedAt,
      last_deploy_check_passed: result.passed,
      last_deploy_check_detail: detail,
    })
    .eq('id', id);

  if (result.passed) {
    await supabase
      .from('iterations')
      .update({ gate_deploy: true, stage: 6 })
      .eq('id', iteration.id);
  }

  return ok({
    passed: result.passed,
    checked_at: checkedAt,
    detail,
    project,
  });
}
