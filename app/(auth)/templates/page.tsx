'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Spinner } from '@/components/ui';
import { apiFetch } from '@/lib/api/client';

const TYPES = ['prd', 'spec', 'tasks'] as const;
type PromptType = (typeof TYPES)[number];

function PromptEditor({
  type,
  initial,
}: {
  type: PromptType;
  initial: string;
}) {
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await apiFetch(`/api/prompts/${type}`, {
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
    <Card className="flex flex-col gap-3">
      <h2 className="font-heading text-lg uppercase text-coral">{type}</h2>
      <textarea
        rows={14}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
        className="rounded-md border border-gray-200 bg-black px-3 py-2 font-mono text-xs text-white focus:border-coral focus:outline-none focus:ring-2 focus:ring-coral"
      />
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        {saved && <span className="font-body text-xs text-success">Saved</span>}
        {error && <span className="font-body text-xs text-error">{error}</span>}
      </div>
    </Card>
  );
}

export default function TemplatesPage() {
  const [prompts, setPrompts] = useState<Record<PromptType, string> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ data: Record<PromptType, string> }>('/api/prompts')
      .then((r) => setPrompts(r.data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl text-white">Prompt templates</h1>
        <p className="font-body text-sm text-gray-400">
          System prompts that shape PRD / spec / tasks generation. Saved to the
          generation service.
        </p>
      </div>

      {error ? (
        <p role="alert" className="font-body text-sm text-error">
          {error}
        </p>
      ) : !prompts ? (
        <div className="flex justify-center p-12">
          <Spinner size={24} />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {TYPES.map((t) => (
            <PromptEditor key={t} type={t} initial={prompts[t] ?? ''} />
          ))}
        </div>
      )}
    </div>
  );
}
