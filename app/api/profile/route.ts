import { NextResponse } from 'next/server';

/**
 * STUB profile route (T10). Echoes the requested ui_language without touching
 * the DB. Replaced by the full DB-backed GET/PATCH implementation in T12.
 */
export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({}) as Record<string, unknown>);
  const ui_language = (body as { ui_language?: string }).ui_language;
  return NextResponse.json({ data: { ui_language } });
}
