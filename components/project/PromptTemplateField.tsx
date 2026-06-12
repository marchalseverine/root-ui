'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui';
import { apiFetch } from '@/lib/api/client';
import type { ArtifactType } from '@/lib/types';

/**
 * Inline, collapsible editor for the generation prompt template of a given type.
 * Embedded in each stage's generation panel so the template can be tweaked right
 * before generating. Edits persist to the same template the dedicated /templates
 * page edits.
 */
export function PromptTemplateField({ type }: { type: ArtifactType }) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoaded(false);
    apiFetch<{ data: Record<string, string> }>(`/api/prompts?locale=${locale}`)
      .then((r) => setValue(r.data[type] ?? ''))
      .catch(() => setError('Could not load template'))
      .finally(() => setLoaded(true));
  }, [type, locale]);

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await apiFetch(`/api/prompts/${type}?locale=${locale}`, {
        method: 'PUT',
        body: JSON.stringify({ content: value }),
      });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-md border border-gray-200">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 font-body text-xs uppercase tracking-wide text-gray-400 hover:text-white"
      >
        <span>{open ? '▾' : '▸'}</span>
        <span>
          Prompt template ({type} · {locale.toUpperCase()})
        </span>
      </button>
      {open && (
        <div className="flex flex-col gap-2 border-t border-gray-200 p-3">
          {!loaded ? (
            <span className="font-mono text-xs text-gray-400">Loading…</span>
          ) : (
            <>
              <textarea
                rows={10}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setSaved(false);
                }}
                className="rounded-md border border-gray-200 bg-black px-3 py-2 font-mono text-xs text-white focus:border-coral focus:outline-none focus:ring-2 focus:ring-coral"
              />
              <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={save} disabled={saving}>
                  {saving ? 'Saving…' : 'Save template'}
                </Button>
                {saved && (
                  <span className="font-body text-xs text-success">Saved</span>
                )}
                {error && (
                  <span className="font-body text-xs text-error">{error}</span>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
