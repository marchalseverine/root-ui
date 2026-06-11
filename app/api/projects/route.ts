import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiError, unauthorized } from '@/lib/api/http';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

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
