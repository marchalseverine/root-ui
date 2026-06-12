-- Add a per-project 'tests' artifact type (the test & security plan), generated
-- from the project's approved spec. Additive: widens two CHECK constraints.

ALTER TABLE public.artifacts DROP CONSTRAINT artifacts_type_check;
ALTER TABLE public.artifacts
  ADD CONSTRAINT artifacts_type_check
  CHECK (type IN ('prd', 'spec', 'tasks', 'tests'));

ALTER TABLE public.generation_runs DROP CONSTRAINT generation_runs_type_check;
ALTER TABLE public.generation_runs
  ADD CONSTRAINT generation_runs_type_check
  CHECK (type IN ('prd', 'spec', 'tasks', 'tests'));
