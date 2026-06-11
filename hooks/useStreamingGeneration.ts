'use client';

import { useCallback, useRef, useState } from 'react';
import type { ArtifactType } from '@/lib/types';

export type StreamStatus = 'idle' | 'streaming' | 'done' | 'error';

/**
 * Drives an EventSource against GET /api/generate, accumulating chunk text and
 * tracking run/artifact ids. Closing the source server-side marks the run
 * cancelled, so `cancel()` just closes the connection.
 */
export function useStreamingGeneration(
  projectId: string,
  type: ArtifactType
) {
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [artifactId, setArtifactId] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const close = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
  }, []);

  const cancel = useCallback(() => {
    close();
    setStatus((s) => (s === 'streaming' ? 'idle' : s));
  }, [close]);

  const start = useCallback(() => {
    close();
    setContent('');
    setError(null);
    setArtifactId(null);
    setRunId(null);
    setStatus('streaming');

    const es = new EventSource(
      `/api/generate?project_id=${encodeURIComponent(projectId)}&type=${type}`
    );
    esRef.current = es;

    es.addEventListener('chunk', (e) => {
      try {
        const d = JSON.parse((e as MessageEvent).data);
        setContent((c) => c + (d.text ?? ''));
      } catch {
        // ignore malformed chunk
      }
    });
    es.addEventListener('done', (e) => {
      try {
        const d = JSON.parse((e as MessageEvent).data);
        setArtifactId(d.artifact_id ?? null);
        setRunId(d.run_id ?? null);
      } catch {
        // ignore
      }
      setStatus('done');
      close();
    });
    es.addEventListener('error', (e) => {
      let message = 'Generation failed';
      const data = (e as MessageEvent).data;
      if (data) {
        try {
          const d = JSON.parse(data);
          if (d?.message) message = d.message;
          if (d?.run_id) setRunId(d.run_id);
        } catch {
          // transport error without payload
        }
      }
      setError(message);
      setStatus('error');
      close();
    });
  }, [projectId, type, close]);

  return { start, cancel, content, status, runId, artifactId, error };
}
