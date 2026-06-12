import { createClient } from '@/lib/supabase/server';
import { apiError, ok, unauthorized, validationError } from '@/lib/api/http';
import { ingestCodebase } from '@/lib/ingest/codebase';
import { parseTasksFromMarkdown } from '@/lib/tasks/parser';

const LOCALES = ['en', 'fr', 'es'];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const body = (await request.json().catch(() => ({}))) as {
    name?: unknown;
    source?: unknown;
    value?: unknown;
    prompt_language?: unknown;
    import_docs?: unknown;
  };

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const source = body.source === 'github' || body.source === 'local' ? body.source : null;
  const value = typeof body.value === 'string' ? body.value.trim() : '';
  const promptLanguage =
    typeof body.prompt_language === 'string' &&
    LOCALES.includes(body.prompt_language)
      ? body.prompt_language
      : 'en';
  const importDocs = body.import_docs === true;

  const fields: Record<string, string> = {};
  if (!name) fields.name = 'Name is required';
  if (!source) fields.source = 'source must be github or local';
  if (!value) fields.value = source === 'github' ? 'Repo URL required' : 'Path required';
  if (Object.keys(fields).length > 0) {
    return validationError('Invalid import data', fields);
  }

  // Ingest the codebase (clone / read fs). Server-side, local-tool context.
  let result;
  try {
    result = await ingestCodebase({ kind: source!, value });
  } catch (e) {
    return apiError(
      'INGEST_FAILED',
      e instanceof Error ? e.message : 'Could not ingest codebase',
      400
    );
  }

  // Create the project + iteration #1.
  const { data: project, error: projErr } = await supabase
    .from('projects')
    .insert({
      owner_id: user.id,
      name,
      prompt_language: promptLanguage,
      import_source: result.source,
    })
    .select('id')
    .single();
  if (projErr || !project) {
    return apiError('INSERT_FAILED', projErr?.message ?? 'Insert failed', 500);
  }

  const { data: iteration, error: itErr } = await supabase
    .from('iterations')
    .insert({ project_id: project.id, number: 1, change_request: null })
    .select('id')
    .single();
  if (itErr || !iteration) {
    return apiError('INSERT_FAILED', itErr?.message ?? 'Insert failed', 500);
  }
  await supabase
    .from('projects')
    .update({ current_iteration_id: iteration.id })
    .eq('id', project.id);

  // Store the codebase snapshot.
  await supabase.from('codebase_snapshots').insert({
    project_id: project.id,
    source: result.source,
    ref: result.ref,
    digest: result.digest,
    file_count: result.fileCount,
    truncated: result.truncated,
  });

  // Optionally import existing root_ docs as approved artifacts of iteration 1.
  const importedDocs: string[] = [];
  if (importDocs) {
    const now = new Date().toISOString();
    const gateUpdate: Record<string, unknown> = {};
    let stage = 1;

    for (const type of ['prd', 'spec', 'tasks'] as const) {
      const content = result.docs[type];
      if (!content) continue;

      const { data: artifact } = await supabase
        .from('artifacts')
        .insert({
          project_id: project.id,
          iteration_id: iteration.id,
          type,
          content,
          prompt_lang: promptLanguage,
          model: 'import',
          approved: true,
          approved_at: now,
        })
        .select('id')
        .single();
      importedDocs.push(type);

      if (type === 'prd') {
        gateUpdate.gate_prd = true;
        stage = Math.max(stage, 2);
      } else if (type === 'spec') {
        gateUpdate.gate_prd = true;
        gateUpdate.gate_spec = true;
        stage = Math.max(stage, 3);
      } else if (type === 'tasks') {
        gateUpdate.gate_prd = true;
        gateUpdate.gate_spec = true;
        gateUpdate.gate_tasks = true;
        stage = Math.max(stage, 4);
        const parsed = parseTasksFromMarkdown(content);
        if (parsed.tasks.length > 0 && artifact) {
          await supabase.from('tasks').insert(
            parsed.tasks.map((t, i) => ({
              project_id: project.id,
              iteration_id: iteration.id,
              artifact_id: artifact.id,
              position: i + 1,
              label: t.label,
              section: t.section,
              checked: t.initialChecked,
            }))
          );
        }
      }
    }

    if (Object.keys(gateUpdate).length > 0) {
      await supabase
        .from('iterations')
        .update({ ...gateUpdate, stage })
        .eq('id', iteration.id);
    }
  }

  return ok(
    {
      id: project.id,
      file_count: result.fileCount,
      truncated: result.truncated,
      imported_docs: importedDocs,
    },
    201
  );
}
