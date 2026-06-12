import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiError, unauthorized, validationError } from '@/lib/api/http';

const PROMPTS_DIR = path.join(process.cwd(), 'fastapi-service', 'prompts');
const TYPES = ['prd', 'spec', 'tasks', 'tests'];
const LOCALES = ['en', 'fr', 'es'];

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
  const requested = new URL(request.url).searchParams.get('locale');
  const locale = requested && LOCALES.includes(requested) ? requested : 'en';

  const body = (await request.json().catch(() => ({}))) as { content?: unknown };
  if (typeof body.content !== 'string') {
    return validationError('content must be a string', { content: 'required' });
  }

  try {
    await fs.writeFile(
      path.join(PROMPTS_DIR, `${type}.${locale}.txt`),
      body.content,
      'utf-8'
    );
    return NextResponse.json({ data: { ok: true, type, locale } });
  } catch (e) {
    return apiError(
      'PROMPTS_WRITE_FAILED',
      e instanceof Error ? e.message : 'Could not write prompt',
      500
    );
  }
}
