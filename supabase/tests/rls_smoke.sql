-- RLS smoke test — anon isolation on projects (tech-spec §2)
-- Runs entirely in a transaction and rolls back, leaving no test data.
-- Verifies: anon sees ONLY active demo projects; non-demo projects are hidden.
--
-- Run as the postgres/service role (e.g. supabase db reset applies it, or paste
-- into the Studio SQL editor). Expected result row: total_visible=1, nondemo_visible=0.

BEGIN;

-- A test owner (auth.users insert auto-creates the matching profile via trigger)
INSERT INTO auth.users (id, email)
  VALUES ('00000000-0000-0000-0000-0000000000aa', 'rls-smoke@test.com');

-- One non-demo project (must be invisible to anon) and one active demo project
INSERT INTO public.projects (owner_id, name, is_demo, status)
  VALUES ('00000000-0000-0000-0000-0000000000aa', 'rls non-demo', false, 'active');
INSERT INTO public.projects (owner_id, name, is_demo, status)
  VALUES ('00000000-0000-0000-0000-0000000000aa', 'rls demo', true, 'active');

-- Simulate an anonymous PostgREST request: switch to the anon role and set the
-- JWT claims so auth.role() returns 'anon'.
SET LOCAL ROLE anon;
SET LOCAL request.jwt.claims = '{"role":"anon"}';

-- Expectation: exactly 1 visible row (the active demo), 0 non-demo rows visible.
SELECT
  count(*)                              AS total_visible,    -- expect 1
  count(*) FILTER (WHERE is_demo = false) AS nondemo_visible -- expect 0
FROM public.projects;

RESET ROLE;
ROLLBACK;
