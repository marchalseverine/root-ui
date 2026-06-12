import { createClient } from '@/lib/supabase/server';
import { apiError, notFound, ok, unauthorized, validationError } from '@/lib/api/http';

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

  const { data: project } = await supabase
    .from('projects')
    .select('id, current_iteration_id')
    .eq('id', id)
    .maybeSingle();
  if (!project) return notFound('Project not found');

  const { data } = await supabase
    .from('iterations')
    .select('*')
    .eq('project_id', id)
    .order('number', { ascending: true });

  return ok({
    iterations: data ?? [],
    current_iteration_id: project.current_iteration_id,
  });
}

export async function POST(
  request: Request,
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
    .select('id')
    .eq('id', id)
    .maybeSingle();
  if (!project) return notFound('Project not found');

  const body = (await request.json().catch(() => ({}))) as {
    change_request?: unknown;
  };
  const changeRequest =
    typeof body.change_request === 'string' ? body.change_request.trim() : '';
  if (!changeRequest) {
    return validationError('change_request is required', {
      change_request: 'required',
    });
  }
  if (changeRequest.length > 20000) {
    return validationError('change_request must be at most 20000 characters');
  }

  // Next iteration number.
  const { data: last } = await supabase
    .from('iterations')
    .select('number')
    .eq('project_id', id)
    .order('number', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextNumber = (last?.number ?? 0) + 1;

  const { data: iteration, error } = await supabase
    .from('iterations')
    .insert({
      project_id: id,
      number: nextNumber,
      change_request: changeRequest,
    })
    .select('*')
    .single();
  if (error || !iteration) {
    return apiError('INSERT_FAILED', error?.message ?? 'Insert failed', 500);
  }

  await supabase
    .from('projects')
    .update({ current_iteration_id: iteration.id })
    .eq('id', id);

  return ok(iteration, 201);
}
