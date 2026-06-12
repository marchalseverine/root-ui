import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentIteration } from '@/lib/iterations';
import { apiError, notFound, unauthorized } from '@/lib/api/http';

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

  // 404 for missing / non-owned project (RLS hides others' projects).
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', id)
    .maybeSingle();
  if (!project) return notFound('Project not found');

  const iteration = await getCurrentIteration(supabase, id);

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('iteration_id', iteration?.id ?? '')
    .order('position', { ascending: true });
  if (error) return apiError('QUERY_FAILED', error.message, 500);

  const tasks = data ?? [];
  const checked = tasks.filter((t) => t.checked).length;

  return NextResponse.json({
    data: tasks,
    stats: { total: tasks.length, checked },
  });
}
