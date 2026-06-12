-- Project import: a project can be created by importing an existing codebase
-- (GitHub repo or a local path) and/or existing root_ documents. The ingested
-- codebase is stored as a snapshot (digest) that conditions later generation.

-- Where the project was imported from (null = built from scratch).
ALTER TABLE public.projects ADD COLUMN import_source TEXT;

-- ---------------------------------------------------------------------------
-- codebase_snapshots — ingested digest of the real code (re-ingestable).
-- The current snapshot is the most recent row for the project.
-- ---------------------------------------------------------------------------
CREATE TABLE public.codebase_snapshots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  source      TEXT NOT NULL,          -- e.g. 'github:https://…' or 'local:/path'
  ref         TEXT,                   -- branch / commit / resolved path
  summary     TEXT,                   -- optional AI summary of the codebase
  digest      TEXT NOT NULL,          -- file tree + key files (capped)
  file_count  INTEGER NOT NULL DEFAULT 0,
  truncated   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_codebase_snapshots_project
  ON public.codebase_snapshots(project_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS — owner only (no anon: codebase digests may be sensitive).
-- ---------------------------------------------------------------------------
ALTER TABLE public.codebase_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "codebase: owner full access"
  ON public.codebase_snapshots FOR ALL
  USING (
    auth.uid() = (SELECT owner_id FROM public.projects WHERE id = project_id)
  )
  WITH CHECK (
    auth.uid() = (SELECT owner_id FROM public.projects WHERE id = project_id)
  );
