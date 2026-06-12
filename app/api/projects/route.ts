import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiError, unauthorized, validationError } from '@/lib/api/http';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const LOCALES = ['en', 'fr', 'es'];

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const status =
    searchParams.get('status') === 'archived' ? 'archived' : 'active';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(searchParams.get('limit')) || DEFAULT_LIMIT)
  );
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, count, error } = await supabase
    .from('projects')
    .select('*', { count: 'exact' })
    .eq('owner_id', user.id)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) return apiError('QUERY_FAILED', error.message, 500);

  // Overlay each project's stage/gates from its current iteration.
  const projects = data ?? [];
  const iterationIds = projects
    .map((p) => p.current_iteration_id)
    .filter((id): id is string => !!id);
  const iterById: Record<string, { stage: number }> = {};
  if (iterationIds.length > 0) {
    const { data: iters } = await supabase
      .from('iterations')
      .select('id, stage')
      .in('id', iterationIds);
    for (const it of iters ?? []) iterById[it.id] = { stage: it.stage };
  }
  const withStage = projects.map((p) => ({
    ...p,
    stage: p.current_iteration_id
      ? (iterById[p.current_iteration_id]?.stage ?? p.stage)
      : p.stage,
  }));

  return NextResponse.json({
    data: withStage,
    pagination: { page, limit, total: count ?? 0 },
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const body = (await request.json().catch(() => ({}))) as {
    name?: unknown;
    description?: unknown;
    prompt_language?: unknown;
  };

  const fields: Record<string, string> = {};

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) fields.name = 'Name is required';
  else if (name.length > 120) fields.name = 'Name must be 1–120 characters';

  let description: string | null = null;
  if (body.description != null) {
    if (typeof body.description !== 'string') {
      fields.description = 'Description must be a string';
    } else if (body.description.length > 20000) {
      fields.description = 'Description must be at most 20000 characters';
    } else {
      description = body.description;
    }
  }

  const prompt_language = body.prompt_language ?? 'en';
  if (typeof prompt_language !== 'string' || !LOCALES.includes(prompt_language)) {
    fields.prompt_language = 'Must be one of en, fr, es';
  }

  if (Object.keys(fields).length > 0) {
    return validationError('Invalid project data', fields);
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({ owner_id: user.id, name, description, prompt_language })
    .select('*')
    .single();

  if (error || !data) {
    return apiError('INSERT_FAILED', error?.message ?? 'Insert failed', 500);
  }

  // Every project starts with iteration #1 (the initial build from the brief).
  const { data: iteration, error: itErr } = await supabase
    .from('iterations')
    .insert({ project_id: data.id, number: 1, change_request: description })
    .select('id')
    .single();
  if (itErr || !iteration) {
    return apiError('INSERT_FAILED', itErr?.message ?? 'Insert failed', 500);
  }
  await supabase
    .from('projects')
    .update({ current_iteration_id: iteration.id })
    .eq('id', data.id);

  return NextResponse.json(
    { data: { ...data, current_iteration_id: iteration.id } },
    { status: 201 }
  );
}
