'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Card, Spinner } from '@/components/ui';
import { ProjectHeader } from '@/components/project/ProjectHeader';
import { PipelineView } from '@/components/project/PipelineView';
import { StagePanel } from '@/components/project/StagePanel';
import { IterationsBar } from '@/components/project/IterationsBar';
import { apiFetch } from '@/lib/api/client';
import type { ProjectDetail } from '@/lib/types';

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const tp = useTranslations('pipeline');
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await apiFetch<{ data: ProjectDetail }>(
        `/api/projects/${id}`
      );
      setProject(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading)
    return (
      <div className="flex justify-center p-12">
        <Spinner size={24} />
      </div>
    );
  if (error || !project)
    return (
      <p role="alert" className="font-body text-sm text-error">
        {error ?? 'Not found'}
      </p>
    );

  return (
    <div className="flex flex-col gap-6">
      <ProjectHeader project={project} onUpdated={load} />
      <IterationsBar
        projectId={id}
        iterations={project.iterations}
        currentId={project.current_iteration?.id ?? null}
        onChanged={load}
      />
      <PipelineView project={project} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_240px]">
        <Card className="flex flex-col gap-4">
          <h2 className="font-heading text-lg text-white">
            v{project.current_iteration?.number ?? 1} ·{' '}
            {tp(`stages.${project.stage}` as 'stages.1')}
          </h2>
          <StagePanel
            project={project}
            iteration={project.current_iteration}
            onAdvance={load}
          />
        </Card>

        <aside className="flex flex-col gap-3">
          <Card className="flex flex-col gap-2">
            <p className="font-body text-xs uppercase tracking-wide text-gray-400">
              Tasks
            </p>
            <p className="font-mono text-sm text-white">
              {project.task_stats.checked} / {project.task_stats.total}
            </p>
          </Card>
          {project.import_source && (
            <Card className="flex flex-col gap-1">
              <p className="font-body text-xs uppercase tracking-wide text-gray-400">
                Codebase
              </p>
              <p
                className="truncate font-mono text-xs text-coral"
                title={project.import_source}
              >
                {project.import_source.startsWith('github:')
                  ? '⎇ ' + project.import_source.slice(7)
                  : '⌂ ' + project.import_source.slice(6)}
              </p>
            </Card>
          )}
          <Card className="flex flex-col gap-1">
            <p className="font-body text-xs uppercase tracking-wide text-gray-400">
              Artifacts
            </p>
            {(['prd', 'spec', 'tasks'] as const).map((t) => (
              <span key={t} className="font-mono text-xs">
                {project.latest_artifacts[t] ? (
                  <Link href={`/projects/${id}/${t}`} className="text-coral hover:underline">
                    {t} ✓
                  </Link>
                ) : (
                  <span className="text-gray-400">{t} —</span>
                )}
              </span>
            ))}
          </Card>
        </aside>
      </div>
    </div>
  );
}
