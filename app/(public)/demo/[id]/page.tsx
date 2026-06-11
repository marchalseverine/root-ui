'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, Spinner } from '@/components/ui';
import { DemoBanner } from '@/components/project/DemoBanner';
import { PipelineView } from '@/components/project/PipelineView';
import { apiFetch } from '@/lib/api/client';
import type { ArtifactType, ProjectDetail } from '@/lib/types';

export default function DemoPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ data: ProjectDetail }>(`/api/public/projects/${id}`)
      .then((r) => setProject(r.data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Not found'));
  }, [id]);

  return (
    <div className="min-h-screen">
      <DemoBanner />
      <header className="px-6 py-4">
        <span className="font-heading text-xl font-bold text-white">root_</span>
      </header>

      <main className="mx-auto max-w-4xl px-6 pb-12">
        {error ? (
          <p role="alert" className="font-body text-sm text-error">
            {error}
          </p>
        ) : !project ? (
          <div className="flex justify-center p-12">
            <Spinner size={24} />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <h1 className="font-heading text-2xl text-white">{project.name}</h1>
            <PipelineView project={project} />
            {(['prd', 'spec', 'tasks'] as ArtifactType[]).map((type) => {
              const artifact = project.latest_artifacts[type];
              if (!artifact) return null;
              return (
                <Card key={type} className="flex flex-col gap-2">
                  <p className="font-heading text-sm uppercase text-coral">
                    {type}
                  </p>
                  <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words font-mono text-sm text-white">
                    {artifact.content}
                  </pre>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
