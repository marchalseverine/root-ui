'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Spinner } from '@/components/ui';
import { useTaskList } from '@/hooks/useTaskList';

export default function TasksPage() {
  const params = useParams<{ id: string }>();
  const tt = useTranslations('tasks');
  const { tasks, stats, toggleTask, isLoading } = useTaskList(params.id);

  if (isLoading)
    return (
      <div className="flex justify-center p-12">
        <Spinner size={24} />
      </div>
    );

  const pct =
    stats.total > 0 ? Math.round((stats.checked / stats.total) * 100) : 0;

  const groups: { section: string | null; items: typeof tasks }[] = [];
  for (const task of tasks) {
    const last = groups[groups.length - 1];
    if (last && last.section === task.section) last.items.push(task);
    else groups.push({ section: task.section, items: [task] });
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl text-white">{tt('title')}</h1>

      {tasks.length === 0 ? (
        <p className="font-body text-sm text-gray-400">{tt('empty')}</p>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-white">
              {tt('progress', { checked: stats.checked, total: stats.total })}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-sm bg-gray-200">
              <div className="h-full bg-coral" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="flex flex-col gap-4">
            {groups.map((g, gi) => (
              <div key={gi} className="flex flex-col gap-1">
                {g.section && (
                  <p className="font-body text-xs uppercase tracking-wide text-gray-400">
                    {g.section}
                  </p>
                )}
                {g.items.map((task) => (
                  <label
                    key={task.id}
                    className="flex cursor-pointer items-start gap-2 font-body text-sm text-white"
                  >
                    <input
                      type="checkbox"
                      checked={task.checked}
                      onChange={(e) => toggleTask(task.id, e.target.checked)}
                      className="mt-0.5 accent-coral"
                    />
                    <span
                      className={task.checked ? 'text-gray-400 line-through' : ''}
                    >
                      {task.label}
                    </span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
