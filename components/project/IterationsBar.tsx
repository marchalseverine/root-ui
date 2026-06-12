'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import type { IterationSummary } from '@/lib/types';
import { NewIterationModal } from './NewIterationModal';

export function IterationsBar({
  projectId,
  iterations,
  currentId,
  onChanged,
}: {
  projectId: string;
  iterations: IterationSummary[];
  currentId: string | null;
  onChanged: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-body text-xs uppercase tracking-wide text-gray-400">
        Iterations
      </span>
      {iterations.map((it) => (
        <span
          key={it.id}
          title={it.change_request ?? undefined}
          className={`rounded-sm px-2 py-1 font-mono text-xs ${
            it.id === currentId
              ? 'bg-coral text-black'
              : 'border border-gray-200 text-gray-400'
          }`}
        >
          v{it.number}
        </span>
      ))}
      <Button variant="ghost" onClick={() => setModalOpen(true)}>
        + New iteration
      </Button>

      <NewIterationModal
        projectId={projectId}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={onChanged}
      />
    </div>
  );
}
