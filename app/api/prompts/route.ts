import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiError, unauthorized } from '@/lib/api/http';

const PROMPTS_DIR = path.join(process.cwd(), 'fastapi-service', 'prompts');
const TYPES = ['prd', 'spec', 'tasks', 'tests'] as const;
const LOCALES = ['en', 'fr', 'es'];

function resolveLocale(url: string): string {
  const requested = new URL(url).searchParams.get('locale');
  return requested && LOCALES.includes(requested) ? requested : 'en';
}

// Read the per-language generation prompt templates straight from disk (the same
// files FastAPI reads at generation time), so this works without the generation
// service running. Falls back to the English template if a locale file is missing.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const locale = resolveLocale(request.url);
  try {
    const entries = await Promise.all(
      TYPES.map(async (t) => {
        const localized = await fs
          .readFile(path.join(PROMPTS_DIR, `${t}.${locale}.txt`), 'utf-8')
          .catch(() => null);
        const content =
          localized ??
          (await fs
            .readFile(path.join(PROMPTS_DIR, `${t}.en.txt`), 'utf-8')
            .catch(() => ''));
        return [t, content] as const;
      })
    );
    return NextResponse.json({ data: Object.fromEntries(entries), locale });
  } catch (e) {
    return apiError(
      'PROMPTS_READ_FAILED',
      e instanceof Error ? e.message : 'Could not read prompts',
      500
    );
  }
}
