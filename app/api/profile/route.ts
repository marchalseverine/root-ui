import { createClient } from '@/lib/supabase/server';
import { apiError, ok, unauthorized, validationError } from '@/lib/api/http';

const LOCALES = ['en', 'fr', 'es'];
const PROFILE_FIELDS = 'id, email, ui_language, role';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_FIELDS)
    .eq('id', user.id)
    .single();

  if (error || !data) return apiError('NOT_FOUND', 'Profile not found', 404);
  return ok(data);
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const body = (await request.json().catch(() => ({}))) as {
    ui_language?: unknown;
  };
  const ui_language = body.ui_language;
  if (typeof ui_language !== 'string' || !LOCALES.includes(ui_language)) {
    return validationError('ui_language must be one of en, fr, es', {
      ui_language: 'invalid',
    });
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ ui_language })
    .eq('id', user.id)
    .select(PROFILE_FIELDS)
    .single();

  if (error || !data)
    return apiError('UPDATE_FAILED', error?.message ?? 'Update failed', 500);
  return ok(data);
}
