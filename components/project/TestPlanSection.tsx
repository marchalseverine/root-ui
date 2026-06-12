'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button, Card } from '@/components/ui';
import { useStreamingGeneration } from '@/hooks/useStreamingGeneration';
import type { ProjectDetail } from '@/lib/types';
import { StreamingOutput } from './StreamingOutput';
import { PromptTemplateField } from './PromptTemplateField';

export function TestPlanSection({
  project,
  onChanged,
}: {
  project: ProjectDetail;
  onChanged: () => void;
}) {
  const { start, cancel, content, status, error } = useStreamingGeneration(
    project.id,
    'tests'
  );
  const hasTests = !!project.latest_artifacts.tests;
  const ready = project.gate_spec;

  useEffect(() => {
    if (status === 'done') onChanged();
  }, [status, onChanged]);

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg text-white">Test plan</h2>
        {hasTests && (
          <Link
            href={`/projects/${project.id}/tests`}
            className="font-body text-sm text-coral hover:underline"
          >
            View →
          </Link>
        )}
      </div>

      {!ready ? (
        <p className="font-body text-sm text-gray-400">
          Generate and approve the spec first — the test plan is generated from it.
        </p>
      ) : (
        <>
          <PromptTemplateField type="tests" />
          {status === 'idle' || status === 'done' ? (
            <Button onClick={start}>
              {hasTests ? 'Regenerate test plan' : 'Generate test plan'}
            </Button>
          ) : (
            <StreamingOutput
              content={content}
              status={status}
              error={error}
              onCancel={cancel}
              onRetry={start}
            />
          )}
        </>
      )}
    </Card>
  );
}
