'use client';

import { useState } from 'react';
import { Badge, Button, Input } from '@/components/ui';
import { apiFetch } from '@/lib/api/client';
import type { Project } from '@/lib/types';

export function ProjectHeader({
  project,
  onUpdated,
}: {
  project: Project;
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await apiFetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name, description }),
      });
      setEditing(false);
      onUpdated();
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-3">
        <Input
          label="Name"
          name="name"
          value={name}
          maxLength={120}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label="Description"
          name="description"
          value={description}
          maxLength={500}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="flex gap-2">
          <Button onClick={save} disabled={saving || !name.trim()}>
            Save
          </Button>
          <Button variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-2xl text-white">{project.name}</h1>
          <Badge variant={project.status === 'archived' ? 'pending' : 'active'}>
            {project.status}
          </Badge>
        </div>
        {project.description && (
          <p className="font-body text-sm text-gray-400">{project.description}</p>
        )}
      </div>
      {!project.is_demo && (
        <Button variant="ghost" onClick={() => setEditing(true)}>
          Edit
        </Button>
      )}
    </div>
  );
}
