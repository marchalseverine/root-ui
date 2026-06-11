'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Card, Spinner } from '@/components/ui';
import { apiFetch } from '@/lib/api/client';

interface Metrics {
  projects_by_stage: Record<string, number>;
  task_stats: { total: number; checked: number; completion_pct: number };
  generation_runs: {
    total: number;
    completed: number;
    failed: number;
    cancelled: number;
  };
  projects_total: number;
  projects_active: number;
  projects_archived: number;
  generated_at: string;
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="font-mono text-2xl text-coral">{value}</span>
      <span className="font-body text-xs uppercase tracking-wide text-gray-400">
        {label}
      </span>
    </Card>
  );
}

export default function MetricsPage() {
  const tm = useTranslations('metrics');
  const tp = useTranslations('pipeline');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<Metrics>('/api/metrics');
      setMetrics(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  function exportCsv() {
    if (!metrics) return;
    const rows = [
      ['metric', 'value'],
      ['projects_total', metrics.projects_total],
      ['projects_active', metrics.projects_active],
      ['projects_archived', metrics.projects_archived],
      ['tasks_total', metrics.task_stats.total],
      ['tasks_checked', metrics.task_stats.checked],
      ['completion_pct', metrics.task_stats.completion_pct],
      ['runs_total', metrics.generation_runs.total],
      ['runs_completed', metrics.generation_runs.completed],
      ['runs_failed', metrics.generation_runs.failed],
      ['runs_cancelled', metrics.generation_runs.cancelled],
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    navigator.clipboard?.writeText(csv);
  }

  if (error)
    return (
      <p role="alert" className="font-body text-sm text-error">
        {error}
      </p>
    );
  if (!metrics)
    return (
      <div className="flex justify-center p-12">
        <Spinner size={24} />
      </div>
    );

  const maxStage = Math.max(1, ...Object.values(metrics.projects_by_stage));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-white">{tm('title')}</h1>
        <Button variant="ghost" onClick={exportCsv}>
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label={tm('projectsActive')} value={metrics.projects_active} />
        <MetricCard
          label={tm('tasksCompleted')}
          value={`${metrics.task_stats.checked}/${metrics.task_stats.total}`}
        />
        <MetricCard
          label={tm('completionPct')}
          value={`${metrics.task_stats.completion_pct}%`}
        />
        <MetricCard label={tm('generationRuns')} value={metrics.generation_runs.total} />
      </div>

      <Card className="flex flex-col gap-3">
        <p className="font-body text-xs uppercase tracking-wide text-gray-400">
          {tm('byStage')}
        </p>
        {Object.entries(metrics.projects_by_stage).map(([stage, count]) => (
          <div key={stage} className="flex items-center gap-3">
            <span className="w-20 font-mono text-xs text-gray-400">
              {tp(`stages.${stage}` as 'stages.1')}
            </span>
            <div className="h-3 flex-1 overflow-hidden rounded-sm bg-gray-200">
              <div
                className="h-full bg-coral"
                style={{ width: `${(count / maxStage) * 100}%` }}
              />
            </div>
            <span className="w-6 text-right font-mono text-xs text-white">
              {count}
            </span>
          </div>
        ))}
      </Card>

      <p className="font-body text-xs text-gray-400">
        {new Date(metrics.generated_at).toLocaleString()}
      </p>
    </div>
  );
}
