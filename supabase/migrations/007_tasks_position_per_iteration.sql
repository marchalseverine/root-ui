-- Tasks are per-iteration now, so the unique position must be scoped to the
-- iteration, not the project. Otherwise approving a 2nd iteration's tasks
-- collides with v1's positions (same project_id, positions 1,2,3…).

DROP INDEX IF EXISTS public.idx_tasks_position;
CREATE UNIQUE INDEX idx_tasks_position
  ON public.tasks(iteration_id, "position");
