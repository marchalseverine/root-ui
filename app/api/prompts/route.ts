import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiError, unauthorized } from '@/lib/api/http';

const FASTAPI = process.env.FASTAPI_BASE_URL ?? 'http://localhost:8000';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  try {
    const res = await fetch(`${FASTAPI}/internal/prompts`, {
      headers: { Authorization: `Bearer ${process.env.INTERNAL_API_SECRET}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`FastAPI ${res.status}`);
    const data = await res.json();
    return NextResponse.json({ data });
  } catch {
    return apiError('FASTAPI_UNAVAILABLE', 'Prompt service unavailable', 502);
  }
}
