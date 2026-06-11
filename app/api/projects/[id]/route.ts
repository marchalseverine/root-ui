import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  apiError,
  notFound,
  ok,
  unauthorized,
  validationError,
} from '@/lib/api/http';

const ARTIFACT_TYPES = ['prd', 'spec', 'tasks'] as const;
type ArtifactType = (typeof ARTIFACT_TYPES)[number];

const LOCALES = ['en', 'fr', 'es'];
const FORBIDDEN_FIELDS = [
  'stage',
  'gate_prd',
  'gate_spec',
  'gate_tasks',
  'gate_build',
  'gate_deploy',
  'is_demo',
  'owner_id',
  'id',
];

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  const forbidden = FORBIDDEN_FIELDS.filter((f) => f in body);
  if (forbidden.length > 0) {
    return validationError(
      `Forbidden fields: ${forbidden.join(', ')}`,
      Object.fromEntries(forbidden.map((f) => [f, 'not allowed']))
    );
  }

  const update: Record<string, unknown> = {};
  const fields: Record<string, string> = {};

  if ('name' in body) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) fields.name = 'Name is required';
    else if (name.length > 120) fields.name = 'Name must be 1–120 characters';
    else update.name = name;
  }
  if ('description' in body) {
    if (body.description === null) update.description = null;
    else if (typeof body.description !== 'string')
      fields.description = 'Description must be a string';
    else if (body.description.length > 500)
      fields.description = 'Description must be at most 500 characters';
    else update.description = body.description;
  }
  if ('prompt_language' in body) {
    if (
      typeof body.prompt_language !== 'string' ||
      !LOCALES.includes(body.prompt_language)
    )
      fields.prompt_language = 'Must be one of en, fr, es';
    else update.prompt_language = body.prompt_language;
  }
  if ('status' in body) {
    // Only the active -> archived transition is allowed here.
    if (body.status !== 'archived')
      fields.status = 'Only the active -> archived transition is allowed';
    else update.status = 'archived';
  }

  if (Object.keys(fields).length > 0) {
    return validationError('Invalid project data', fields);
  }
  if (Object.keys(update).length === 0) {
    return validationError('No updatable fields provided');
  }

  const { data, error } = await supabase
    .from('projects')
    .update(update)
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) return apiError('UPDATE_FAILED', error.message, 500);
  if (!data) return notFound('Project not found');
  return ok(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  // RLS hides already-deleted (and non-owned) rows, so a missing row here
  // means "not found" — including a second DELETE on the same id.
  const { data: existing } = await supabase
    .from('projects')
    .select('id')
    .eq('id', id)
    .maybeSingle();
  if (!existing) return notFound('Project not found');

  // Ownership is verified above via the user-scoped client. The soft-delete
  // itself must use the service role: the spec's RLS policy forbids the owner's
  // own session from setting status='deleted' (the new row fails the policy's
  // `status != 'deleted'` predicate).
  const { error } = await createAdminClient()
    .from('projects')
    .update({ status: 'deleted' })
    .eq('id', id);
  if (error) return apiError('DELETE_FAILED', error.message, 500);

  return NextResponse.json({ success: true });
}
