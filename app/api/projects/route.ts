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

  return NextResponse.json({
    data: data ?? [],
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
  return NextResponse.json({ data }, { status: 201 });
}
