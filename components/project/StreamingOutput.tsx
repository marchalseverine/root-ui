'use client';

import { Button } from '@/components/ui';
import type { StreamStatus } from '@/hooks/useStreamingGeneration';

export function StreamingOutput({
  content,
  status,
  error,
  onCancel,
  onRetry,
}: {
  content: string;
  status: StreamStatus;
  error: string | null;
  onCancel?: () => void;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div
        aria-live="polite"
        className="max-h-[50vh] overflow-auto rounded-md border border-gray-200 bg-black p-4 font-mono text-sm text-white"
      >
        <pre className="whitespace-pre-wrap break-words">
          {content}
          {status === 'streaming' && (
            <span className="animate-pulse text-coral">▋</span>
          )}
        </pre>
      </div>

      {status === 'streaming' && onCancel && (
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      )}

      {status === 'error' && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-error p-3">
          <span className="font-body text-sm text-error">{error}</span>
          {onRetry && (
            <Button variant="ghost" onClick={onRetry}>
              Retry
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
