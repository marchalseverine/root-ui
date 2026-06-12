'use client';

import { useState } from 'react';
import { Button, Modal } from '@/components/ui';
import { apiFetch } from '@/lib/api/client';
import { DESCRIPTION_MAX } from '@/lib/types';

export function NewIterationModal({
  projectId,
  open,
  onClose,
  onCreated,
}: {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [changeRequest, setChangeRequest] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch(`/api/projects/${projectId}/iterations`, {
        method: 'POST',
        body: JSON.stringify({ change_request: changeRequest }),
      });
      setChangeRequest('');
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New iteration">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <p className="font-body text-sm text-gray-400">
          Describe the features the client wants to add. The pipeline restarts
          for this iteration and builds on the current product (its approved
          PRD/spec/tasks are sent as context). You can paste a meeting
          transcript.
        </p>
        <textarea
          rows={8}
          required
          maxLength={DESCRIPTION_MAX}
          value={changeRequest}
          onChange={(e) => setChangeRequest(e.target.value)}
          placeholder="e.g. Add user authentication, a dark mode toggle, and CSV export…"
          className="rounded-md border border-gray-200 bg-gray-100 px-3 py-2 font-mono text-sm text-white focus:border-coral focus:outline-none focus:ring-2 focus:ring-coral"
        />
        {error && (
          <p role="alert" className="font-body text-sm text-error">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || !changeRequest.trim()}>
            Start iteration
          </Button>
        </div>
      </form>
    </Modal>
  );
}
