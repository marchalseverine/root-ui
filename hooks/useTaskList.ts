'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api/client';
import type { Task, TaskStats } from '@/lib/types';

/** Task list with optimistic toggle + rollback on error. */
export function useTaskList(projectId: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats>({ total: 0, checked: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const r = await apiFetch<{ data: Task[]; stats: TaskStats }>(
        `/api/projects/${projectId}/tasks`
      );
      setTasks(r.data);
      setStats(r.stats);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const toggleTask = useCallback(
    async (
      taskId: string,
      checked: boolean
    ): Promise<{ gate_build: boolean } | null> => {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, checked } : t))
      );
      setStats((prev) => ({
        ...prev,
        checked: prev.checked + (checked ? 1 : -1),
      }));
      try {
        const res = await apiFetch<{
          project_stats: { gate_build: boolean };
        }>(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          body: JSON.stringify({ checked }),
        });
        return { gate_build: res.project_stats.gate_build };
      } catch {
        // rollback
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, checked: !checked } : t))
        );
        setStats((prev) => ({
          ...prev,
          checked: prev.checked + (checked ? -1 : 1),
        }));
        return null;
      }
    },
    []
  );

  return { tasks, stats, toggleTask, isLoading, reload };
}
