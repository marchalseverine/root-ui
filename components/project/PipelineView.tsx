'use client';

import { useTranslations } from 'next-intl';
import { STAGE_COUNT } from '@/lib/types';
import type { Project } from '@/lib/types';

const GATE_KEYS: (keyof Project)[] = [
  'gate_prd',
  'gate_spec',
  'gate_tasks',
  'gate_build',
  'gate_deploy',
];

/** 6-stage horizontal stepper with gate lock indicators between stages. */
export function PipelineView({ project }: { project: Project }) {
  const tp = useTranslations('pipeline');

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      {Array.from({ length: STAGE_COUNT }, (_, i) => {
        const n = i + 1;
        const completed = n < project.stage;
        const current = n === project.stage;
        const dot = completed
          ? 'bg-coral text-black'
          : current
            ? 'border-2 border-white text-white animate-pulse'
            : 'bg-gray-200 text-gray-400';
        const gatePassed = i > 0 ? Boolean(project[GATE_KEYS[i - 1]]) : true;
        return (
          <div key={n} className="flex items-center gap-1">
            {i > 0 && (
              <span
                title={gatePassed ? tp('gate.unlocked') : tp('gate.locked')}
                className={`text-xs ${gatePassed ? 'text-coral' : 'text-gray-400'}`}
              >
                {gatePassed ? '─' : '⊘'}
              </span>
            )}
            <div className="flex flex-col items-center gap-1">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-md font-mono text-xs ${dot}`}
              >
                {completed ? '✓' : n}
              </span>
              <span className="font-body text-[10px] uppercase tracking-wide text-gray-400">
                {tp(`stages.${n}` as 'stages.1')}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
