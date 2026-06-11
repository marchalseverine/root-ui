'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Input, Modal } from '@/components/ui';
import { apiFetch } from '@/lib/api/client';
import type { Locale, Project } from '@/lib/types';

const LOCALES: Locale[] = ['en', 'fr', 'es'];

export function NewProjectModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (project: Project) => void;
}) {
  const t = useTranslations('dashboard.newProject');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState<Locale>('en');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { data } = await apiFetch<{ data: Project }>('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name,
          description: description || undefined,
          prompt_language: language,
        }),
      });
      onCreated(data);
      setName('');
      setDescription('');
      setLanguage('en');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t('title')}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Input
          label={t('nameLabel')}
          name="name"
          required
          maxLength={120}
          placeholder={t('namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="flex flex-col gap-1">
          <label
            htmlFor="description"
            className="font-body text-xs font-medium uppercase tracking-wide text-gray-400"
          >
            {t('descriptionLabel')}
          </label>
          <textarea
            id="description"
            name="description"
            maxLength={500}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-md border border-gray-200 bg-gray-100 px-3 py-2 font-body text-sm text-white focus:border-coral focus:outline-none focus:ring-2 focus:ring-coral"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="language"
            className="font-body text-xs font-medium uppercase tracking-wide text-gray-400"
          >
            {t('languageLabel')}
          </label>
          <select
            id="language"
            name="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value as Locale)}
            className="rounded-md border border-gray-200 bg-gray-100 px-3 py-2 font-body text-sm text-white focus:border-coral focus:outline-none focus:ring-2 focus:ring-coral"
          >
            {LOCALES.map((l) => (
              <option key={l} value={l}>
                {l.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        {error && (
          <p role="alert" className="font-body text-sm text-error">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button type="submit" disabled={submitting || !name.trim()}>
            {t('create')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
