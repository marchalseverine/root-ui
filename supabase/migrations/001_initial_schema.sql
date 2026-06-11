-- root-ui — initial schema (tech-spec §2)
-- Tables, indexes, and triggers/functions. RLS policies live in 002_rls_policies.sql.

-- ---------------------------------------------------------------------------
-- 2.1 profiles — extends auth.users (1-to-1)
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'operator'
                CHECK (role IN ('operator')),   -- extended later for 'contributor'
  ui_language TEXT NOT NULL DEFAULT 'en'
                CHECK (ui_language IN ('en', 'fr', 'es')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2.2 projects
-- ---------------------------------------------------------------------------
CREATE TABLE public.projects (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name             TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  description      TEXT CHECK (char_length(description) <= 500),
  stage            SMALLINT NOT NULL DEFAULT 1
                     CHECK (stage BETWEEN 1 AND 6),
  -- stage meanings: 1=Brief, 2=PRD, 3=Spec, 4=Tasks, 5=Build, 6=Deploy
  status           TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'archived', 'deleted')),
  is_demo          BOOLEAN NOT NULL DEFAULT false,
  prompt_language  TEXT NOT NULL DEFAULT 'en'
                     CHECK (prompt_language IN ('en', 'fr', 'es')),
  -- Gate flags — a stage is "passed" only when its gate = true
  gate_prd         BOOLEAN NOT NULL DEFAULT false,
  gate_spec        BOOLEAN NOT NULL DEFAULT false,
  gate_tasks       BOOLEAN NOT NULL DEFAULT false,
  gate_build       BOOLEAN NOT NULL DEFAULT false,
  gate_deploy      BOOLEAN NOT NULL DEFAULT false,
  -- Deploy check cache
  last_deploy_check_at     TIMESTAMPTZ,
  last_deploy_check_passed BOOLEAN,
  last_deploy_check_detail JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_owner_id ON public.projects(owner_id);
CREATE INDEX idx_projects_status   ON public.projects(status);
CREATE INDEX idx_projects_is_demo  ON public.projects(is_demo);

-- ---------------------------------------------------------------------------
-- 2.3 artifacts
-- ---------------------------------------------------------------------------
CREATE TABLE public.artifacts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('prd', 'spec', 'tasks')),
  content      TEXT NOT NULL,          -- full markdown output
  prompt_lang  TEXT NOT NULL CHECK (prompt_lang IN ('en', 'fr', 'es')),
  model        TEXT NOT NULL,          -- e.g. 'gpt-4o', 'claude-3-5-sonnet'
  approved     BOOLEAN NOT NULL DEFAULT false,
  approved_at  TIMESTAMPTZ,
  generation_ms INTEGER,               -- time-to-complete in ms (for metrics)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_artifacts_project_type ON public.artifacts(project_id, type, created_at DESC);

-- Only one approved = true per (project_id, type)
CREATE UNIQUE INDEX idx_artifacts_single_approved
  ON public.artifacts(project_id, type)
  WHERE approved = true;

-- ---------------------------------------------------------------------------
-- 2.4 tasks
-- ---------------------------------------------------------------------------
CREATE TABLE public.tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  artifact_id UUID NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  position    SMALLINT NOT NULL,       -- display order (1-based)
  label       TEXT NOT NULL,           -- task text from tasks.md
  section     TEXT,                    -- optional heading group from tasks.md
  checked     BOOLEAN NOT NULL DEFAULT false,
  checked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_project_id  ON public.tasks(project_id);
CREATE UNIQUE INDEX idx_tasks_position ON public.tasks(project_id, position);

-- ---------------------------------------------------------------------------
-- 2.5 generation_runs
-- ---------------------------------------------------------------------------
CREATE TABLE public.generation_runs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('prd', 'spec', 'tasks')),
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'streaming', 'completed', 'cancelled', 'failed')),
  artifact_id  UUID REFERENCES public.artifacts(id),   -- set on completion
  error_detail TEXT,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms  INTEGER
);

CREATE INDEX idx_gen_runs_project ON public.generation_runs(project_id, started_at DESC);

-- ---------------------------------------------------------------------------
-- 2.6 Functions & triggers
-- ---------------------------------------------------------------------------

-- Auto-update updated_at on projects and tasks
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Auto-create profile on auth.user insert
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
