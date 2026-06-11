-- root-ui — Row Level Security policies (tech-spec §2)

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Sévi can read/update her own profile
CREATE POLICY "profiles: owner read"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles: owner update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- No anon access

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Sévi: full access to her own non-deleted projects
CREATE POLICY "projects: owner full access"
  ON public.projects FOR ALL
  USING (auth.uid() = owner_id AND status != 'deleted')
  WITH CHECK (auth.uid() = owner_id);

-- Anon: read-only on demo projects that are active
CREATE POLICY "projects: anon read demo"
  ON public.projects FOR SELECT
  USING (auth.role() = 'anon' AND is_demo = true AND status = 'active');

-- ---------------------------------------------------------------------------
-- artifacts
-- ---------------------------------------------------------------------------
ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "artifacts: owner full access"
  ON public.artifacts FOR ALL
  USING (
    auth.uid() = (SELECT owner_id FROM public.projects WHERE id = project_id)
    AND (SELECT status FROM public.projects WHERE id = project_id) != 'deleted'
  )
  WITH CHECK (
    auth.uid() = (SELECT owner_id FROM public.projects WHERE id = project_id)
  );

CREATE POLICY "artifacts: anon read demo"
  ON public.artifacts FOR SELECT
  USING (
    auth.role() = 'anon'
    AND (SELECT is_demo FROM public.projects WHERE id = project_id) = true
  );

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks: owner full access"
  ON public.tasks FOR ALL
  USING (
    auth.uid() = (SELECT owner_id FROM public.projects WHERE id = project_id)
  )
  WITH CHECK (
    auth.uid() = (SELECT owner_id FROM public.projects WHERE id = project_id)
  );

CREATE POLICY "tasks: anon read demo"
  ON public.tasks FOR SELECT
  USING (
    auth.role() = 'anon'
    AND (SELECT is_demo FROM public.projects WHERE id = project_id) = true
  );

-- ---------------------------------------------------------------------------
-- generation_runs
-- ---------------------------------------------------------------------------
ALTER TABLE public.generation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gen_runs: owner full access"
  ON public.generation_runs FOR ALL
  USING (
    auth.uid() = (SELECT owner_id FROM public.projects WHERE id = project_id)
  )
  WITH CHECK (
    auth.uid() = (SELECT owner_id FROM public.projects WHERE id = project_id)
  );
-- No anon access to generation_runs
