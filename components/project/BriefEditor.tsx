'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { apiFetch } from '@/lib/api/client';
import { DESCRIPTION_MAX, type Project } from '@/lib/types';

/**
 * Stage-1 brief editor. The brief lives in projects.description and is sent as
 * context to PRD generation. Save before generating so the PRD reflects it.
 */
export function BriefEditor({
  project,
  onSaved,
}: {
  project: Project;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(project.description ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await apiFetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ description: value }),
      });
      setSaved(true);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="brief"
        className="font-body text-xs uppercase tracking-wide text-gray-400"
      >
        Discovery brief — feeds PRD generation
      </label>
      <textarea
        id="brief"
        rows={10}
        maxLength={DESCRIPTION_MAX}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
        placeholder="Paste the discovery brief / context here…"
        className="rounded-md border border-gray-200 bg-gray-100 px-3 py-2 font-mono text-sm text-white focus:border-coral focus:outline-none focus:ring-2 focus:ring-coral"
      />
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save brief'}
        </Button>
        <span className="font-mono text-xs text-gray-400">
          {value.length} / {DESCRIPTION_MAX}
        </span>
        {saved && <span className="font-body text-xs text-success">Saved</span>}
        {error && <span className="font-body text-xs text-error">{error}</span>}
      </div>
    </div>
  );
}
