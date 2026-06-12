'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Spinner } from '@/components/ui';
import { ProjectCard } from '@/components/dashboard/ProjectCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { NewProjectModal } from '@/components/dashboard/NewProjectModal';
import { ImportProjectModal } from '@/components/dashboard/ImportProjectModal';
import { apiFetch } from '@/lib/api/client';
import type { Project, ProjectStatus } from '@/lib/types';

type Filter = Extract<ProjectStatus, 'active' | 'archived'>;

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const [filter, setFilter] = useState<Filter>('active');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const load = useCallback(async (status: Filter) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiFetch<{ data: Project[] }>(
        `/api/projects?status=${status}&limit=50`
      );
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-white">{t('title')}</h1>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setImportOpen(true)}>
            Import
          </Button>
          <Button onClick={() => setModalOpen(true)}>
            {t('newProject.button')}
          </Button>
        </div>
      </div>

      <div className="flex gap-2" role="tablist">
        {(['active', 'archived'] as Filter[]).map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={`rounded-sm px-3 py-1 font-body text-sm transition-colors ${
              filter === f
                ? 'bg-coral text-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {t(`filter.${f}`)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Spinner size={24} />
        </div>
      ) : error ? (
        <p role="alert" className="font-body text-sm text-error">
          {error}
        </p>
      ) : projects.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}

      <NewProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => load(filter)}
      />
      <ImportProjectModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
      />
    </div>
  );
}
