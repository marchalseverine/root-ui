import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiError, unauthorized } from '@/lib/api/http';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  // RLS scopes every query to the owner. Projects exclude deleted (policy).
  const { data: projects, error: pe } = await supabase
    .from('projects')
    .select('stage, status');
  if (pe) return apiError('QUERY_FAILED', pe.message, 500);

  const projects_by_stage: Record<string, number> = {
    '1': 0,
    '2': 0,
    '3': 0,
    '4': 0,
    '5': 0,
    '6': 0,
  };
  let projects_active = 0;
  let projects_archived = 0;
  for (const p of projects ?? []) {
    const key = String(p.stage);
    if (key in projects_by_stage) projects_by_stage[key] += 1;
    if (p.status === 'active') projects_active += 1;
    else if (p.status === 'archived') projects_archived += 1;
  }
  const projects_total = (projects ?? []).length;

  const { data: tasks, error: te } = await supabase
    .from('tasks')
    .select('checked');
  if (te) return apiError('QUERY_FAILED', te.message, 500);
  const total = (tasks ?? []).length;
  const checked = (tasks ?? []).filter((t) => t.checked).length;
  const completion_pct =
    total > 0 ? Math.round((checked / total) * 1000) / 10 : 0;

  // generation_runs are included regardless of project status.
  const { data: runs, error: re } = await supabase
    .from('generation_runs')
    .select('status');
  if (re) return apiError('QUERY_FAILED', re.message, 500);
  const generation_runs = {
    total: (runs ?? []).length,
    completed: 0,
    failed: 0,
    cancelled: 0,
  };
  for (const r of runs ?? []) {
    if (r.status === 'completed') generation_runs.completed += 1;
    else if (r.status === 'failed') generation_runs.failed += 1;
    else if (r.status === 'cancelled') generation_runs.cancelled += 1;
  }

  return NextResponse.json({
    projects_by_stage,
    task_stats: { total, checked, completion_pct },
    generation_runs,
    projects_total,
    projects_active,
    projects_archived,
    generated_at: new Date().toISOString(),
  });
}
