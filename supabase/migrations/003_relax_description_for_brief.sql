-- The stage-1 "Brief" maps to projects.description, which now holds the full
-- discovery brief that feeds PRD generation. Raise the cap from 500 to 20000.
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_description_check;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_description_check CHECK (char_length(description) <= 20000);
