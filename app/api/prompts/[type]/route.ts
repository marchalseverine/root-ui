import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiError, unauthorized, validationError } from '@/lib/api/http';

const FASTAPI = process.env.FASTAPI_BASE_URL ?? 'http://localhost:8000';
const TYPES = ['prd', 'spec', 'tasks'];

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  if (!TYPES.includes(type)) {
    return validationError('type must be prd, spec, or tasks');
  }
  const body = (await request.json().catch(() => ({}))) as { content?: unknown };
  if (typeof body.content !== 'string') {
    return validationError('content must be a string', { content: 'required' });
  }

  try {
    const res = await fetch(`${FASTAPI}/internal/prompts/${type}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.INTERNAL_API_SECRET}`,
      },
      body: JSON.stringify({ content: body.content }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`FastAPI ${res.status}`);
    return NextResponse.json({ data: await res.json() });
  } catch {
    return apiError('FASTAPI_UNAVAILABLE', 'Prompt service unavailable', 502);
  }
}
