'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Modal } from '@/components/ui';
import { apiFetch } from '@/lib/api/client';

export function ImportProjectModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [source, setSource] = useState<'github' | 'local'>('github');
  const [value, setValue] = useState('');
  const [importDocs, setImportDocs] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    setStatus('Ingesting codebase… (cloning / reading + building digest)');
    try {
      const { data } = await apiFetch<{ data: { id: string } }>(
        '/api/projects/import',
        {
          method: 'POST',
          body: JSON.stringify({
            name,
            source,
            value,
            import_docs: importDocs,
          }),
        }
      );
      router.push(`/projects/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
      setSubmitting(false);
      setStatus('');
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Import a project">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Input
          label="Project name"
          name="name"
          required
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className="flex items-center gap-2">
          <span className="font-body text-xs uppercase tracking-wide text-gray-400">
            Source
          </span>
          {(['github', 'local'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSource(s)}
              className={`rounded-sm px-2 py-1 font-body text-xs ${
                source === s
                  ? 'bg-coral text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {s === 'github' ? 'GitHub repo' : 'Local path'}
            </button>
          ))}
        </div>

        <Input
          label={source === 'github' ? 'Repository URL' : 'Absolute local path'}
          name="value"
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={
            source === 'github'
              ? 'https://github.com/you/repo'
              : '/Users/you/Documents/my-project'
          }
        />

        <label className="flex items-center gap-2 font-body text-sm text-white">
          <input
            type="checkbox"
            checked={importDocs}
            onChange={(e) => setImportDocs(e.target.checked)}
            className="accent-coral"
          />
          Also import existing PRD / spec / tasks docs (if present)
        </label>

        {status && (
          <p className="font-mono text-xs text-gray-400">{status}</p>
        )}
        {error && (
          <p role="alert" className="font-body text-sm text-error">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || !name.trim() || !value.trim()}>
            {submitting ? 'Importing…' : 'Import'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
