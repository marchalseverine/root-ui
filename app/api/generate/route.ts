import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentIteration, latestApprovedByType } from '@/lib/iterations';
import { apiError, notFound, unauthorized } from '@/lib/api/http';

const TYPES = ['prd', 'spec', 'tasks'] as const;
type GenType = (typeof TYPES)[number];

interface SSEMessage {
  event: string | null;
  data: Record<string, unknown> | null;
}

function parseSSE(raw: string): SSEMessage {
  let event: string | null = null;
  let dataStr = '';
  for (const line of raw.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) dataStr += line.slice(5).trim();
  }
  let data: Record<string, unknown> | null = null;
  try {
    data = dataStr ? JSON.parse(dataStr) : null;
  } catch {
    data = null;
  }
  return { event, data };
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('project_id');
  const type = searchParams.get('type') as GenType | null;
  if (!projectId || !type || !TYPES.includes(type)) {
    return apiError(
      'VALIDATION_ERROR',
      'project_id and type (prd|spec|tasks) are required',
      400
    );
  }

  // Pre-flight: project must exist (RLS hides others' / deleted).
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, description, prompt_language')
    .eq('id', projectId)
    .maybeSingle();
  if (!project) return notFound('Project not found');

  const iteration = await getCurrentIteration(supabase, projectId);
  if (!iteration) return apiError('NO_ITERATION', 'Project has no iteration', 400);

  const ready =
    type === 'prd'
      ? iteration.stage >= 1
      : type === 'spec'
        ? iteration.gate_prd
        : iteration.gate_spec;
  if (!ready) {
    return apiError('INVALID_STAGE', `Cannot generate ${type} yet`, 400);
  }

  // Pre-flight: no active run for this iteration+type.
  const { data: active } = await supabase
    .from('generation_runs')
    .select('id')
    .eq('iteration_id', iteration.id)
    .eq('type', type)
    .in('status', ['pending', 'streaming'])
    .limit(1)
    .maybeSingle();
  if (active) {
    return apiError(
      'GENERATION_IN_PROGRESS',
      'A generation is already in progress',
      409
    );
  }

  // Privileged writes from here on — ownership is verified above.
  const admin = createAdminClient();
  const { data: run, error: runErr } = await admin
    .from('generation_runs')
    .insert({
      project_id: projectId,
      iteration_id: iteration.id,
      type,
      status: 'streaming',
    })
    .select('id')
    .single();
  if (runErr || !run) {
    return apiError('RUN_FAILED', runErr?.message ?? 'Could not start run', 500);
  }
  const runId = run.id as string;

  // Context: project identity + this iteration's brief/change request +
  // the product's current approved artifacts (so a change request builds on
  // what already exists). For iteration 1, change_request is the initial brief.
  const context: Record<string, string> = {};
  if (project.name) context.project_name = project.name;
  context.brief = iteration.change_request ?? project.description ?? '';
  if (iteration.number > 1) {
    context.iteration = String(iteration.number);
    context.change_request = iteration.change_request ?? '';
    context.note =
      'This is a change request on an existing product. Integrate the requested ' +
      'features into the current artifacts below; keep what exists and mark what is new.';
  }
  const approved = await latestApprovedByType(supabase, projectId);
  for (const [t, content] of Object.entries(approved)) context[t] = content;

  // If the project was imported from a real codebase, ground generation in it.
  const { data: snapshot } = await supabase
    .from('codebase_snapshots')
    .select('summary, digest')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (snapshot) {
    context.codebase = String(snapshot.summary || snapshot.digest || '').slice(
      0,
      100_000
    );
    context.note =
      (context.note ? context.note + ' ' : '') +
      'A digest of the existing codebase is provided in `codebase`. Ground your ' +
      'output in the real code (existing structure, stack, modules); do not ' +
      'contradict or duplicate what already exists.';
  }

  const fastapiUrl = process.env.FASTAPI_BASE_URL ?? 'http://localhost:8000';
  const secret = process.env.INTERNAL_API_SECRET;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );

      let content = '';
      let model = 'unknown';
      let durationMs = 0;
      let errored = false;
      const startedAt = Date.now();

      try {
        const upstream = await fetch(`${fastapiUrl}/internal/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${secret}`,
          },
          body: JSON.stringify({
            project_id: projectId,
            type,
            prompt_language: project.prompt_language,
            context,
          }),
          signal: request.signal,
        });
        if (!upstream.ok || !upstream.body) {
          throw new Error(`FastAPI returned ${upstream.status}`);
        }

        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let done = false;
        while (!done) {
          const read = await reader.read();
          if (read.done) break;
          buffer += decoder.decode(read.value, { stream: true });
          let idx: number;
          while ((idx = buffer.indexOf('\n\n')) !== -1) {
            const { event, data } = parseSSE(buffer.slice(0, idx));
            buffer = buffer.slice(idx + 2);
            if (event === 'chunk') {
              const text = String(data?.text ?? '');
              content += text;
              send('chunk', { text });
            } else if (event === 'done') {
              model = String(data?.model ?? model);
              durationMs = Number(data?.duration_ms ?? Date.now() - startedAt);
            } else if (event === 'error') {
              errored = true;
              done = true;
              await admin
                .from('generation_runs')
                .update({
                  status: 'failed',
                  error_detail: String(data?.message ?? 'LLM error'),
                  completed_at: new Date().toISOString(),
                })
                .eq('id', runId);
              send('error', {
                message: String(data?.message ?? 'Generation failed'),
                code: String(data?.code ?? 'LLM_ERROR'),
                run_id: runId,
              });
              break;
            }
          }
        }

        if (errored) {
          controller.close();
          return;
        }

        // Success: persist artifact, complete the run.
        const { data: artifact } = await admin
          .from('artifacts')
          .insert({
            project_id: projectId,
            iteration_id: iteration.id,
            type,
            content,
            prompt_lang: project.prompt_language,
            model,
            generation_ms: durationMs,
          })
          .select('id')
          .single();
        await admin
          .from('generation_runs')
          .update({
            status: 'completed',
            artifact_id: artifact?.id ?? null,
            completed_at: new Date().toISOString(),
            duration_ms: durationMs,
          })
          .eq('id', runId);
        send('done', {
          artifact_id: artifact?.id ?? null,
          run_id: runId,
          duration_ms: durationMs,
        });
        controller.close();
      } catch (err) {
        // Client disconnect -> cancelled; anything else -> failed. No partial artifact.
        const aborted = request.signal.aborted;
        await admin
          .from('generation_runs')
          .update({
            status: aborted ? 'cancelled' : 'failed',
            error_detail: aborted ? null : String(err),
            completed_at: new Date().toISOString(),
          })
          .eq('id', runId);
        if (!aborted) {
          send('error', {
            message: String(err),
            code: 'STREAM_ERROR',
            run_id: runId,
          });
        }
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
