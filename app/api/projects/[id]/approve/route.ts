import { createClient } from '@/lib/supabase/server';
import { apiError, notFound, ok, unauthorized } from '@/lib/api/http';
import { parseTasksFromMarkdown } from '@/lib/tasks/parser';

const TYPES = ['prd', 'spec', 'tasks'] as const;
type ArtifactType = (typeof TYPES)[number];

// Target stage after approving each artifact type.
const TARGET_STAGE: Record<ArtifactType, number> = { prd: 2, spec: 3, tasks: 4 };

interface Project {
  id: string;
  stage: number;
  gate_prd: boolean;
  gate_spec: boolean;
  gate_tasks: boolean;
}

function readiness(type: ArtifactType, p: Project): boolean {
  if (type === 'prd') return p.stage >= 1 && !p.gate_prd;
  if (type === 'spec') return p.gate_prd && !p.gate_spec;
  return p.gate_spec && !p.gate_tasks; // tasks
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const body = (await request.json().catch(() => ({}))) as { type?: unknown };
  if (typeof body.type !== 'string' || !TYPES.includes(body.type as ArtifactType)) {
    return apiError('VALIDATION_ERROR', 'type must be prd, spec, or tasks', 400);
  }
  const type = body.type as ArtifactType;

  const { data: project } = await supabase
    .from('projects')
    .select('id, stage, gate_prd, gate_spec, gate_tasks')
    .eq('id', id)
    .maybeSingle();
  if (!project) return notFound('Project not found');

  if (!readiness(type, project as Project)) {
    return apiError(
      'INVALID_STAGE',
      `Cannot approve ${type} at the current stage`,
      400
    );
  }

  // Latest unapproved artifact of this type.
  const { data: artifact } = await supabase
    .from('artifacts')
    .select('id, content')
    .eq('project_id', id)
    .eq('type', type)
    .eq('approved', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!artifact) {
    return apiError('NO_ARTIFACT', `No unapproved ${type} artifact to approve`, 400);
  }

  // For tasks, parse the markdown first — reject an empty checklist.
  let parsed: ReturnType<typeof parseTasksFromMarkdown> | null = null;
  if (type === 'tasks') {
    parsed = parseTasksFromMarkdown(artifact.content ?? '');
    if (parsed.tasks.length === 0) {
      return apiError('EMPTY_TASK_LIST', 'The tasks artifact has no checkboxes', 400);
    }
  }

  // Approve the artifact (partial unique index guarantees one approved/type).
  const { error: approveErr } = await supabase
    .from('artifacts')
    .update({ approved: true, approved_at: new Date().toISOString() })
    .eq('id', artifact.id);
  if (approveErr) {
    return apiError('APPROVE_FAILED', approveErr.message, 409);
  }

  // Replace tasks when approving a tasks artifact.
  if (type === 'tasks' && parsed) {
    await supabase.from('tasks').delete().eq('project_id', id);
    const rows = parsed.tasks.map((t, i) => ({
      project_id: id,
      artifact_id: artifact.id,
      position: i + 1,
      label: t.label,
      section: t.section,
      checked: t.initialChecked,
    }));
    const { error: insertErr } = await supabase.from('tasks').insert(rows);
    if (insertErr) return apiError('TASK_INSERT_FAILED', insertErr.message, 500);
  }

  // Advance the gate + stage.
  const { data: updated, error: projErr } = await supabase
    .from('projects')
    .update({
      [`gate_${type}`]: true,
      stage: Math.max(project.stage, TARGET_STAGE[type]),
    })
    .eq('id', id)
    .select('*')
    .single();
  if (projErr || !updated) {
    return apiError('UPDATE_FAILED', projErr?.message ?? 'Update failed', 500);
  }

  return ok({ ...updated, artifact_id: artifact.id });
}
