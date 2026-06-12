-- Iterations: a project is a sequence of iterations. Iteration 1 is the initial
-- build (from the brief); later iterations are change requests that re-run the
-- pipeline conditioned on the product's current approved artifacts.
-- The pipeline state (stage + gates) moves to the iteration level.

-- ---------------------------------------------------------------------------
-- iterations table
-- ---------------------------------------------------------------------------
CREATE TABLE public.iterations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  number         SMALLINT NOT NULL,
  change_request TEXT,                 -- v1: initial brief; v2+: requested features
  stage          SMALLINT NOT NULL DEFAULT 1 CHECK (stage BETWEEN 1 AND 6),
  gate_prd       BOOLEAN NOT NULL DEFAULT false,
  gate_spec      BOOLEAN NOT NULL DEFAULT false,
  gate_tasks     BOOLEAN NOT NULL DEFAULT false,
  gate_build     BOOLEAN NOT NULL DEFAULT false,
  gate_deploy    BOOLEAN NOT NULL DEFAULT false,
  status         TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'archived')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, number)
);

CREATE INDEX idx_iterations_project ON public.iterations(project_id, number);

CREATE TRIGGER iterations_updated_at BEFORE UPDATE ON public.iterations
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ---------------------------------------------------------------------------
-- iteration_id on owned children (nullable for now; backfilled below)
-- ---------------------------------------------------------------------------
ALTER TABLE public.artifacts
  ADD COLUMN iteration_id UUID REFERENCES public.iterations(id) ON DELETE CASCADE;
ALTER TABLE public.tasks
  ADD COLUMN iteration_id UUID REFERENCES public.iterations(id) ON DELETE CASCADE;
ALTER TABLE public.generation_runs
  ADD COLUMN iteration_id UUID REFERENCES public.iterations(id) ON DELETE CASCADE;

ALTER TABLE public.projects
  ADD COLUMN current_iteration_id UUID REFERENCES public.iterations(id);

CREATE INDEX idx_artifacts_iteration ON public.artifacts(iteration_id, type);
CREATE INDEX idx_tasks_iteration ON public.tasks(iteration_id);

-- ---------------------------------------------------------------------------
-- Backfill: every existing project gets iteration #1 carrying its current
-- pipeline state, and its children are attached to it.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  p RECORD;
  it_id UUID;
BEGIN
  FOR p IN SELECT * FROM public.projects LOOP
    INSERT INTO public.iterations (
      project_id, number, change_request, stage,
      gate_prd, gate_spec, gate_tasks, gate_build, gate_deploy
    )
    VALUES (
      p.id, 1, p.description, p.stage,
      p.gate_prd, p.gate_spec, p.gate_tasks, p.gate_build, p.gate_deploy
    )
    RETURNING id INTO it_id;

    UPDATE public.projects SET current_iteration_id = it_id WHERE id = p.id;
    UPDATE public.artifacts SET iteration_id = it_id WHERE project_id = p.id;
    UPDATE public.tasks SET iteration_id = it_id WHERE project_id = p.id;
    UPDATE public.generation_runs SET iteration_id = it_id WHERE project_id = p.id;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- One approved artifact per (iteration, type) — was (project_id, type).
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS public.idx_artifacts_single_approved;
CREATE UNIQUE INDEX idx_artifacts_single_approved
  ON public.artifacts(iteration_id, type)
  WHERE approved = true;

-- ---------------------------------------------------------------------------
-- RLS (mirrors the artifacts/tasks policies)
-- ---------------------------------------------------------------------------
ALTER TABLE public.iterations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "iterations: owner full access"
  ON public.iterations FOR ALL
  USING (
    auth.uid() = (SELECT owner_id FROM public.projects WHERE id = project_id)
  )
  WITH CHECK (
    auth.uid() = (SELECT owner_id FROM public.projects WHERE id = project_id)
  );

CREATE POLICY "iterations: anon read demo"
  ON public.iterations FOR SELECT
  USING (
    auth.role() = 'anon'
    AND (SELECT is_demo FROM public.projects WHERE id = project_id) = true
  );
