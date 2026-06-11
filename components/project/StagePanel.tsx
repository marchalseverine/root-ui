'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Card, Spinner } from '@/components/ui';
import { apiFetch } from '@/lib/api/client';
import { useStreamingGeneration } from '@/hooks/useStreamingGeneration';
import { useTaskList } from '@/hooks/useTaskList';
import type { ArtifactType, Project } from '@/lib/types';
import { StreamingOutput } from './StreamingOutput';
import { BriefEditor } from './BriefEditor';

function GenerationPhase({
  project,
  type,
  onAdvance,
}: {
  project: Project;
  type: ArtifactType;
  onAdvance: () => void;
}) {
  const tg = useTranslations('generation');
  const { start, cancel, content, status, error } = useStreamingGeneration(
    project.id,
    type
  );
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);

  async function approve() {
    setApproving(true);
    setApproveError(null);
    try {
      await apiFetch(`/api/projects/${project.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ type }),
      });
      onAdvance();
    } catch (e) {
      setApproveError(e instanceof Error ? e.message : 'Error');
    } finally {
      setApproving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {status === 'idle' ? (
        <Button onClick={start}>{tg('generate', { type: type.toUpperCase() })}</Button>
      ) : (
        <StreamingOutput
          content={content}
          status={status}
          error={error}
          onCancel={cancel}
          onRetry={start}
        />
      )}
      {status === 'done' && (
        <div className="flex gap-2">
          <Button onClick={approve} disabled={approving}>
            {tg('approve')}
          </Button>
          <Button variant="ghost" onClick={start}>
            {tg('regenerate')}
          </Button>
        </div>
      )}
      {approveError && (
        <p role="alert" className="font-body text-sm text-error">
          {approveError}
        </p>
      )}
    </div>
  );
}

function BuildPhase({
  project,
  onAdvance,
}: {
  project: Project;
  onAdvance: () => void;
}) {
  const tt = useTranslations('tasks');
  const { tasks, stats, toggleTask, isLoading } = useTaskList(project.id);

  async function onToggle(id: string, checked: boolean) {
    const res = await toggleTask(id, checked);
    if (res?.gate_build) onAdvance();
  }

  if (isLoading) return <Spinner size={20} />;

  const pct =
    stats.total > 0 ? Math.round((stats.checked / stats.total) * 100) : 0;

  // group by section preserving order
  const groups: { section: string | null; items: typeof tasks }[] = [];
  for (const task of tasks) {
    const last = groups[groups.length - 1];
    if (last && last.section === task.section) last.items.push(task);
    else groups.push({ section: task.section, items: [task] });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm text-white">
          {tt('progress', { checked: stats.checked, total: stats.total })}
        </span>
        <div className="h-2 flex-1 overflow-hidden rounded-sm bg-gray-200">
          <div className="h-full bg-coral" style={{ width: `${pct}%` }} />
        </div>
      </div>
      {tasks.length === 0 ? (
        <p className="font-body text-sm text-gray-400">{tt('empty')}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((g, gi) => (
            <div key={gi} className="flex flex-col gap-1">
              {g.section && (
                <p className="font-body text-xs uppercase tracking-wide text-gray-400">
                  {g.section}
                </p>
              )}
              {g.items.map((task) => (
                <label
                  key={task.id}
                  className="flex cursor-pointer items-start gap-2 font-body text-sm text-white"
                >
                  <input
                    type="checkbox"
                    checked={task.checked}
                    onChange={(e) => onToggle(task.id, e.target.checked)}
                    className="mt-0.5 accent-coral"
                  />
                  <span className={task.checked ? 'text-gray-400 line-through' : ''}>
                    {task.label}
                  </span>
                </label>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface DeployResult {
  passed: boolean;
  detail: {
    checks: Array<{ name: string; passed: boolean; message: string | null }>;
    summary: string;
  };
}

function DeployPhase({
  project,
  onAdvance,
}: {
  project: Project;
  onAdvance: () => void;
}) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<DeployResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    try {
      const { data } = await apiFetch<{ data: DeployResult }>(
        `/api/projects/${project.id}/deploy-check`,
        { method: 'POST', body: '{}' }
      );
      setResult(data);
      if (data.passed) onAdvance();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Button onClick={run} disabled={running}>
        {running ? 'Running…' : 'Run deploy check'}
      </Button>
      {error && (
        <p role="alert" className="font-body text-sm text-error">
          {error}
        </p>
      )}
      {result && (
        <Card className="flex flex-col gap-2">
          <p
            className={`font-heading text-lg ${result.passed ? 'text-success' : 'text-error'}`}
          >
            {result.passed ? '✓ PASS' : '✗ FAIL'} — {result.detail.summary}
          </p>
          <ul className="flex flex-col gap-1 font-mono text-xs">
            {result.detail.checks.map((c) => (
              <li key={c.name} className={c.passed ? 'text-success' : 'text-error'}>
                {c.passed ? '✓' : '✗'} {c.name}
                {c.message ? ` — ${c.message}` : ''}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function DonePhase({ project }: { project: Project }) {
  const shareUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/demo/${project.id}` : '';
  return (
    <Card className="flex flex-col gap-2">
      <p className="font-heading text-lg text-success">✓ Pipeline complete</p>
      <p className="font-body text-sm text-gray-400">
        All stages validated and the deploy check passed.
      </p>
      {project.is_demo && (
        <p className="font-mono text-xs text-coral break-all">{shareUrl}</p>
      )}
    </Card>
  );
}

export function StagePanel({
  project,
  onAdvance,
}: {
  project: Project;
  onAdvance: () => void;
}) {
  if (!project.gate_prd)
    return (
      <div className="flex flex-col gap-6">
        <BriefEditor project={project} onSaved={onAdvance} />
        <GenerationPhase project={project} type="prd" onAdvance={onAdvance} />
      </div>
    );
  if (!project.gate_spec)
    return <GenerationPhase project={project} type="spec" onAdvance={onAdvance} />;
  if (!project.gate_tasks)
    return <GenerationPhase project={project} type="tasks" onAdvance={onAdvance} />;
  if (!project.gate_build)
    return <BuildPhase project={project} onAdvance={onAdvance} />;
  if (!project.gate_deploy)
    return <DeployPhase project={project} onAdvance={onAdvance} />;
  return <DonePhase project={project} />;
}
