import { createClient } from '@/lib/supabase/server';
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

  if (!project.gate_build) {
    return apiError('BUILD_NOT_COMPLETE', 'All tasks must be checked first', 400);
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

  const payload = {
    task_stats: { total: total ?? 0, checked: checked ?? 0 },
    prd_approved: project.gate_prd,
    spec_approved: project.gate_spec,
    tasks_artifact_exists: project.gate_tasks,
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

  const update: Record<string, unknown> = {
    last_deploy_check_at: checkedAt,
    last_deploy_check_passed: result.passed,
    last_deploy_check_detail: detail,
  };
  if (result.passed) {
    update.gate_deploy = true;
    update.stage = 6;
  }

  const { data: updated } = await supabase
    .from('projects')
    .update(update)
    .eq('id', id)
    .select('*')
    .maybeSingle();

  return ok({
    passed: result.passed,
    checked_at: checkedAt,
    detail,
    project: updated ?? project,
  });
}
