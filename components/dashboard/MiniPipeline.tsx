import { STAGE_COUNT } from '@/lib/types';

/** Horizontal row of 6 stage dots: completed (coral), current (white), pending (gray). */
export function MiniPipeline({ stage }: { stage: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`Stage ${stage} of ${STAGE_COUNT}`}>
      {Array.from({ length: STAGE_COUNT }, (_, i) => {
        const n = i + 1;
        const state =
          n < stage ? 'bg-coral' : n === stage ? 'bg-white' : 'bg-gray-200';
        return <span key={n} className={`h-1.5 w-6 rounded-sm ${state}`} />;
      })}
    </div>
  );
}
