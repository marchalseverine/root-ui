import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiError, unauthorized } from '@/lib/api/http';

const PROMPTS_DIR = path.join(process.cwd(), 'fastapi-service', 'prompts');
const TYPES = ['prd', 'spec', 'tasks'] as const;

// Read the generation prompt templates straight from disk (same files the
// FastAPI service reads at generation time), so this screen works without the
// generation service running.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  try {
    const entries = await Promise.all(
      TYPES.map(async (t) => {
        const file = path.join(PROMPTS_DIR, `${t}.txt`);
        const content = await fs.readFile(file, 'utf-8').catch(() => '');
        return [t, content] as const;
      })
    );
    return NextResponse.json({ data: Object.fromEntries(entries) });
  } catch (e) {
    return apiError(
      'PROMPTS_READ_FAILED',
      e instanceof Error ? e.message : 'Could not read prompts',
      500
    );
  }
}
