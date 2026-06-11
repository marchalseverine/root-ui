'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Spinner } from '@/components/ui';
import { apiFetch } from '@/lib/api/client';
import type { ArtifactType, ProjectDetail } from '@/lib/types';

export function ArtifactView({ type }: { type: ArtifactType }) {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ data: ProjectDetail }>(`/api/projects/${id}`)
      .then((r) => setProject(r.data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'));
  }, [id]);

  if (error)
    return (
      <p role="alert" className="font-body text-sm text-error">
        {error}
      </p>
    );
  if (!project)
    return (
      <div className="flex justify-center p-12">
        <Spinner size={24} />
      </div>
    );

  const artifact = project.latest_artifacts[type];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl uppercase text-white">{type}</h1>
        <Link
          href={`/projects/${id}`}
          className="font-body text-sm text-gray-400 hover:text-coral"
        >
          ← {project.name}
        </Link>
      </div>

      {!artifact ? (
        <p className="font-body text-sm text-gray-400">
          No approved {type} yet.
        </p>
      ) : (
        <>
          <p className="font-mono text-xs text-gray-400">
            {artifact.prompt_lang}
            {artifact.approved_at
              ? ` · approved ${new Date(artifact.approved_at).toLocaleString()}`
              : ''}
          </p>
          <div className="overflow-auto rounded-md border border-gray-200 bg-black p-4">
            <pre className="whitespace-pre-wrap break-words font-mono text-sm text-white">
              {artifact.content}
            </pre>
          </div>
        </>
      )}
    </div>
  );
}
