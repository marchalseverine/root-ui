import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  apiError,
  notFound,
  unauthorized,
  validationError,
} from '@/lib/api/http';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const body = (await request.json().catch(() => ({}))) as { checked?: unknown };
  if (typeof body.checked !== 'boolean') {
    return validationError('checked must be a boolean', {
      checked: 'required boolean',
    });
  }
  const checked = body.checked;

  // RLS hides tasks of non-owned projects, so a missing task -> 404.
  const { data: task } = await supabase
    .from('tasks')
    .select('id, project_id')
    .eq('id', taskId)
    .maybeSingle();
  if (!task) return notFound('Task not found');

  const { data: project } = await supabase
    .from('projects')
    .select('id, is_demo, gate_build')
    .eq('id', task.project_id)
    .maybeSingle();
  if (!project) return notFound('Task not found');
  if (project.is_demo) {
    return apiError('DEMO_PROJECT', 'Demo project tasks are read-only', 403);
  }

  const { data: updated, error } = await supabase
    .from('tasks')
    .update({ checked, checked_at: checked ? new Date().toISOString() : null })
    .eq('id', taskId)
    .select('*')
    .single();
  if (error || !updated) {
    return apiError('UPDATE_FAILED', error?.message ?? 'Update failed', 500);
  }

  const { count: total } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', task.project_id);
  const { count: checkedCount } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', task.project_id)
    .eq('checked', true);

  // gate_build is forward-only: set true when every task is checked; never
  // reverts once set (per spec — Sévi advances via the deploy check, not here).
  let gate_build = project.gate_build;
  if (!gate_build && (total ?? 0) > 0 && checkedCount === total) {
    await supabase
      .from('projects')
      .update({ gate_build: true })
      .eq('id', task.project_id);
    gate_build = true;
  }

  return NextResponse.json({
    data: updated,
    project_stats: { total: total ?? 0, checked: checkedCount ?? 0, gate_build },
  });
}
