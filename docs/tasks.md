# Plan de tâches — root-ui v1

> Source : tech-spec.md · Règle : une tâche à la fois, tests verts avant de cocher.

## Tâches

- [ ] T01 — Initialize Next.js 15 project with TypeScript, Tailwind CSS, ESLint, Prettier
  - **Quoi :** Run `create-next-app` with App Router + TypeScript. Configure Tailwind CSS. Set up ESLint (next/core-web-vitals) and Prettier with a `.prettierrc`. Add `.env.local.example` with all required env var placeholders. Push to GitHub.
  - **Fichiers :** `package.json`, `tsconfig.json`, `tailwind.config.ts`, `.eslintrc.json`, `.prettierrc`, `next.config.ts`, `.env.local.example`, `.gitignore`
  - **Critères d'acceptation :** `npm run dev` starts without errors. `npm run lint` passes. `npm run build` succeeds on an empty app. Repo is pushed to GitHub.
  - **Test :** `npm run build` exits 0. Run `npx tsc --noEmit` and confirm 0 errors.

- [ ] T02 — Set up Supabase project and store credentials
  - **Quoi :** Create a new Supabase project via the dashboard. Enable email+password auth (disable magic link for v1). Retrieve: Project URL, anon key, service role key. Populate `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `INTERNAL_API_SECRET` (generate a random string).
  - **Fichiers :** `.env.local` (local only, gitignored), `.env.local.example` (updated)
  - **Critères d'acceptation :** Supabase dashboard shows the project is active. Auth > Providers shows Email enabled. `.env.local` has all 4 values. `.env.local` is in `.gitignore`.
  - **Test :** Manual: open Supabase Studio, confirm DB is reachable. No automated test (credentials only).

- [ ] T03 — Write Supabase migration: all 5 tables, indexes, triggers
  - **Quoi :** Create a single SQL migration file in `supabase/migrations/`. Include: `profiles`, `projects`, `artifacts`, `tasks`, `generation_runs` tables with all columns, constraints, CHECK constraints, indexes (including the partial unique index on `artifacts`), and all triggers/functions (`handle_updated_at`, `handle_new_user`) exactly as specified in §2.
  - **Fichiers :** `supabase/migrations/001_initial_schema.sql`
  - **Critères d'acceptation :** `supabase db push` (or `supabase migration up`) completes with 0 errors. Supabase Studio shows all 5 tables with correct columns. `idx_artifacts_single_approved` partial unique index exists. Both triggers are listed under Database > Triggers.
  - **Test :** Run `supabase db push`. In Studio SQL editor: `INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), 'test@test.com')` → confirm a `profiles` row was auto-created. Run `SELECT * FROM public.profiles` to verify.

- [ ] T04 — Write and apply all RLS policies; verify anon isolation
  - **Quoi :** Create a migration file with all RLS `ENABLE` statements and all `CREATE POLICY` statements for `profiles`, `projects`, `artifacts`, `tasks`, `generation_runs` exactly as specified in §2. Apply the migration.
  - **Fichiers :** `supabase/migrations/002_rls_policies.sql`
  - **Critères d'acceptation :** Every table has RLS enabled (visible in Studio > Authentication > Policies). Using the anon key in a SQL query: `SELECT * FROM projects` returns 0 rows when no demo projects exist. Using the anon key: a row with `is_demo = true, status = 'active'` IS returned. Service role key bypasses RLS (Studio confirms).
  - **Test :** Write a SQL test script `supabase/tests/rls_smoke.sql`: (1) insert a non-demo project, query with anon → 0 rows; (2) insert a demo project with `is_demo=true`, query with anon → 1 row. Run via `supabase db reset` + manual Studio verification.

- [ ] T05 — Configure `@supabase/ssr` in Next.js: server client, browser client, middleware
  - **Quoi :** Install `@supabase/ssr` and `@supabase/supabase-js`. Create: `lib/supabase/server.ts` (server client using cookies), `lib/supabase/browser.ts` (browser client singleton), `middleware.ts` (session validation: protect `/dashboard/**` and `/api/**` except `/api/public/**`; allow `/demo/**` and `/api/public/**` without auth). Redirect unauthenticated users to `/login`.
  - **Fichiers :** `lib/supabase/server.ts`, `lib/supabase/browser.ts`, `middleware.ts`
  - **Critères d'acceptation :** Navigating to `/dashboard` without a session redirects to `/login`. Navigating to `/demo/anything` without a session does NOT redirect. `middleware.ts` matcher excludes `/_next/**` and `/favicon.ico`.
  - **Test :** `npm run build` passes. Manual: open `/dashboard` in incognito → confirm redirect to `/login`. Open `/demo/test` in incognito → no redirect (404 is fine, not a redirect).

- [ ] T06 — Implement design system tokens in Tailwind config and CSS variables
  - **Quoi :** Extend `tailwind.config.ts` with the exact color palette, font families, font sizes, spacing scale, border radii, and box shadows from §5.1 tokens. Add Google Fonts imports (Montserrat, Inter, JetBrains Mono) to `app/layout.tsx` or `globals.css`. Expose tokens as CSS custom properties in `globals.css`.
  - **Fichiers :** `tailwind.config.ts`, `app/globals.css`, `design-system/tokens.ts`
  - **Critères d'acceptation :** `npx tailwindcss --content './app/**/*.tsx' --output /tmp/out.css` generates classes for `bg-black`, `text-coral`, `shadow-hard`, etc. CSS variables `--color-coral`, `--font-heading` etc. exist in the root stylesheet. `npm run build` passes.
  - **Test :** Create `app/token-test/page.tsx` (dev only, delete after) rendering a `<div className="bg-coral text-white shadow-hard">` and confirm it renders correctly at `localhost:3000/token-test`.

- [ ] T07 — Build design system primitives: Button, Input, Card, Badge, Modal, Spinner, Toast
  - **Quoi :** Build each component in `components/ui/`. All use Tailwind classes from the token system. `<Button>` has variants `primary | ghost | danger`. `<Modal>` implements keyboard trap (focus lock) and closes on Escape. `<Toast>` renders in bottom-right with auto-dismiss (3s). No external component library — hand-coded.
  - **Fichiers :** `components/ui/Button.tsx`, `components/ui/Input.tsx`, `components/ui/Card.tsx`, `components/ui/Badge.tsx`, `components/ui/Modal.tsx`, `components/ui/Spinner.tsx`, `components/ui/Toast.tsx`, `components/ui/index.ts`
  - **Critères d'acceptation :** All components render without TypeScript errors. `<Button variant="primary">` shows black bg + coral hard shadow on hover. `<Modal>` traps focus (Tab cycles within modal). `<Toast>` disappears after 3s. All accept standard HTML props via spread.
  - **Test :** Create `app/ui-test/page.tsx` rendering all primitives. Manual visual check. Run `npx tsc --noEmit` → 0 errors.

- [ ] T08 — Build TopNav, RootLayout, and static LanguageToggle
  - **Quoi :** Create `components/layout/TopNav.tsx` with: root_ logo, nav links (Dashboard, Metrics), `<LanguageToggle>` (EN/FR/ES pills — renders only, no wiring yet), and a user-menu placeholder showing email. Create `app/(auth)/layout.tsx` as `<RootLayout>` wrapping pages with `<TopNav>`. Public routes (`/demo`, `/login`) use a minimal layout without auth nav.
  - **Fichiers :** `components/layout/TopNav.tsx`, `components/layout/LanguageToggle.tsx`, `app/(auth)/layout.tsx`, `app/(public)/layout.tsx`
  - **Critères d'acceptation :** `<TopNav>` renders at `/dashboard` (once auth works) with logo and three language pills. Language pills are visible but clicking them has no effect yet. No TypeScript errors. `npm run build` passes.
  - **Test :** `npx tsc --noEmit` → 0 errors. Manual render check at `/ui-test`.

- [ ] T09 — Implement next-intl: configure provider, create all i18n message files
  - **Quoi :** Install `next-intl`. Configure `next.config.ts` with `createNextIntlPlugin`. Create `i18n.ts` request config. Create `messages/en.json`, `messages/fr.json`, `messages/es.json` with ALL keys from §5.5 (dashboard, pipeline stages 1–6, generation, tasks, auth, errors, demo banner, metrics, profile). Wrap app root in `<NextIntlClientProvider>`. Default locale: `en`. No URL prefix for locale.
  - **Fichiers :** `next.config.ts`, `i18n.ts`, `middleware.ts` (updated), `messages/en.json`, `messages/fr.json`, `messages/es.json`, `app/layout.tsx` (updated)
  - **Critères d'acceptation :** `useTranslations('dashboard')('newProject.button')` returns `"New project"` in English. All 3 locale files have identical key sets (no missing keys). `npm run build` passes.
  - **Test :** Create a temporary page that calls `useTranslations` for 5 keys and renders them. Confirm strings appear. `npx tsc --noEmit` → 0 errors.

- [ ] T10 — Wire LanguageToggle: locale switch + localStorage + PATCH /api/profile stub
  - **Quoi :** Implement `hooks/useI18n.ts` returning `{ locale, changeLanguage, t }`. `changeLanguage(lang)` updates: (1) a `NEXT_PUBLIC` accessible cookie for `next-intl`, (2) `localStorage.setItem('ui_language', lang)`, (3) calls `PATCH /api/profile` with `{ ui_language: lang }` (use the stub route created here). Create stub `app/api/profile/route.ts` that returns `200 { data: { ui_language: lang } }` without DB. Disable toggle during active streaming (read from a global `streamingActive` context — stub for now).
  - **Fichiers :** `hooks/useI18n.ts`, `app/api/profile/route.ts` (stub), `components/layout/LanguageToggle.tsx` (updated), `context/StreamingContext.tsx` (stub)
  - **Critères d'acceptation :** Clicking FR pill on `<LanguageToggle>` updates the displayed language in the UI. Refreshing the page preserves the selected language (via cookie). `PATCH /api/profile` is called (check Network tab). `npx tsc --noEmit` → 0 errors.
  - **Test :** Manual: switch to FR, verify `pipeline.stages.1` renders as "Brief" in French (once translation key is set). Check localStorage has `ui_language: "fr"`.

- [ ] T11 — Implement /login page with Supabase Auth email+password
  - **Quoi :** Create `app/(public)/login/page.tsx` with email + password `<Input>` fields and a `<Button>` "Sign in". On submit, call `supabase.auth.signInWithPassword()`. On success, redirect to `/dashboard`. On error, display the error message in a `<Toast>` or inline error. No sign-up flow (Sévi is the only user — account pre-created in Supabase dashboard). Add a "Forgot password?" link stub.
  - **Fichiers :** `app/(public)/login/page.tsx`, `app/(public)/login/LoginForm.tsx`
  - **Critères d'acceptation :** Valid credentials → redirect to `/dashboard`. Invalid credentials → visible error message. Form is accessible (labels, aria). `npm run build` passes.
  - **Test :** Manual E2E: log in with valid credentials, confirm redirect. Log in with wrong password, confirm error displays. Run `npx tsc --noEmit`.

- [ ] T12 — Implement GET /api/profile and PATCH /api/profile (full DB-backed)
  - **Quoi :** Replace the stub `app/api/profile/route.ts` with full implementation. `GET`: read `profiles` row for `auth.uid()` using server Supabase client → return `{ data: { id, email, ui_language, role } }`. `PATCH`: validate `ui_language` is `en|fr|es`, update `profiles` row, return updated row. Both return `401` if no session.
  - **Fichiers :** `app/api/profile/route.ts`
  - **Critères d'acceptation :** `GET /api/profile` with a valid session cookie returns the profile JSON. `PATCH /api/profile` with `{ ui_language: "fr" }` updates the DB and returns the updated profile. Both return `401` without a session. `npx tsc --noEmit` → 0 errors.
  - **Test :** Using `curl` or a REST client with a valid session: `GET /api/profile` → 200 with correct shape. `PATCH /api/profile` `{"ui_language":"fr"}` → 200, then `GET` confirms `ui_language` is now `"fr"`.

- [ ] T13 — Implement GET /api/projects (list with pagination and status filter)
  - **Quoi :** Create `app/api/projects/route.ts` `GET` handler. Extract `status` (default `active`), `page` (default 1), `limit` (default 20, max 50) from query params. Query `projects` where `owner_id = auth.uid()` and `status = param_status` and `status != 'deleted'`. Return paginated response shape from §3.2. Return `401` if no session.
  - **Fichiers :** `app/api/projects/route.ts`
  - **Critères d'acceptation :** Returns `{ data: [...], pagination: { page, limit, total } }`. `status=archived` returns only archived projects. `limit=2` with 5 projects returns 2 items and correct `total: 5`. Returns `401` without session.
  - **Test :** Seed 3 projects (2 active, 1 archived) in DB. `GET /api/projects` → 2 items. `GET /api/projects?status=archived` → 1 item. `GET /api/projects?limit=1&page=2` → 1 item, `pagination.page = 2`.

- [ ] T14 — Implement POST /api/projects (create project)
  - **Quoi :** Add `POST` handler to `app/api/projects/route.ts`. Validate body: `name` (required, 1–120 chars), `description` (optional, ≤500 chars), `prompt_language` (optional, default `en`, enum). Insert new project row with `owner_id = auth.uid()`, `stage = 1`, all gates `false`. Return `201` with full project object. Return `400 VALIDATION_ERROR` with field-level errors on invalid input.
  - **Fichiers :** `app/api/projects/route.ts` (updated)
  - **Critères d'acceptation :** `POST` with valid body → `201` with a project object containing `stage: 1` and all `gate_* = false`. Missing `name` → `400` with `code: "VALIDATION_ERROR"`. `name` > 120 chars → `400`. Returns `401` without session.
  - **Test :** `POST /api/projects` `{"name":"Test","prompt_language":"en"}` → 201. `POST` without name → 400. `POST` with name length 121 → 400. Confirm DB row exists after successful POST.

- [ ] T15 — Implement GET /api/projects/[id] (single project with artifacts and task stats)
  - **Quoi :** Create `app/api/projects/[id]/route.ts` `GET` handler. Fetch the project row. For each artifact type (`prd`, `spec`, `tasks`), fetch the latest `approved = true` artifact (or `null`). Fetch task counts (`total`, `checked`) via aggregation query. Return combined shape from §3.2. Return `404` if not found or not owned by auth user.
  - **Fichiers :** `app/api/projects/[id]/route.ts`
  - **Critères d'acceptation :** Returns project + `latest_artifacts` (with nulls for ungenerated types) + `task_stats`. A non-existent ID returns `404 NOT_FOUND`. Another user's project returns `404` (not `403` — no information leakage). Returns `401` without session.
  - **Test :** Create a project with one approved PRD artifact. `GET /api/projects/[id]` → `latest_artifacts.prd` is populated, `spec` and `tasks` are `null`. `task_stats = { total: 0, checked: 0 }`.

- [ ] T16 — Implement PATCH /api/projects/[id] (update name/description/language/status)
  - **Quoi :** Add `PATCH` handler to `app/api/projects/[id]/route.ts`. Allow updating: `name`, `description`, `prompt_language`, `status` (only `active → archived` transition). Explicitly reject forbidden fields: `stage`, `gate_*`, `is_demo`, `owner_id` — return `400` if any are present in body. Validate the same rules as POST for the allowed fields.
  - **Fichiers :** `app/api/projects/[id]/route.ts` (updated)
  - **Critères d'acceptation :** `PATCH` with `{"name":"New Name"}` → 200 with updated project. `PATCH` with `{"stage":2}` → 400. `PATCH` with `{"status":"deleted"}` → 400 (deleted is not an allowed transition here). Returns `401`/`404` appropriately.
  - **Test :** Create project, `PATCH` name → confirm new name in response and DB. `PATCH` with `gate_prd: true` → 400. `PATCH` with `status: "archived"` → 200, project status is `archived` in DB.

- [ ] T17 — Implement DELETE /api/projects/[id] (soft delete)
  - **Quoi :** Add `DELETE` handler to `app/api/projects/[id]/route.ts`. Set `status = 'deleted'` on the project row. Return `{ success: true }`. Return `404` if project not found or already deleted. After deletion, the project should not appear in `GET /api/projects`.
  - **Fichiers :** `app/api/projects/[id]/route.ts` (updated)
  - **Critères d'acceptation :** `DELETE /api/projects/[id]` → 200 `{ success: true }`. Subsequent `GET /api/projects` does not include the deleted project. Subsequent `GET /api/projects/[id]` returns 404. Calling `DELETE` again on same ID returns 404. Data row still exists in DB with `status = 'deleted'`.
  - **Test :** Create project, DELETE it → 200. `GET /api/projects` → project absent. Check DB directly: row exists with `status = 'deleted'`.

- [ ] T18 — Implement GET /api/projects/[id]/tasks (list tasks)
  - **Quoi :** Create `app/api/projects/[id]/tasks/route.ts` `GET` handler. Query `tasks` for the project ordered by `position ASC`. Return `{ data: [...tasks], stats: { total, checked } }`. Return `401`/`404` as appropriate.
  - **Fichiers :** `app/api/projects/[id]/tasks/route.ts`
  - **Critères d'acceptation :** Returns tasks in position order with all fields from §3.4. `stats` accurately reflects `checked` count. Empty task list returns `{ data: [], stats: { total: 0, checked: 0 } }`. Returns `401` without session.
  - **Test :** Seed 3 tasks (positions 1,2,3; 1 checked). `GET /api/projects/[id]/tasks` → 3 items in order, `stats = { total: 3, checked: 1 }`.

- [ ] T19 — Implement PATCH /api/tasks/[taskId] (toggle checked state + gate_build side effect)
  - **Quoi :** Create `app/api/tasks/[taskId]/route.ts` `PATCH` handler. Validate body `{ checked: boolean }`. Update `tasks.checked` and set `checked_at = now()` if `checked = true` (null if `false`). After update, count all tasks for the project: if `checked = true` for all → set `projects.gate_build = true`. Return task data + `project_stats`. Return `403 DEMO_PROJECT` if the project is a demo (anon cannot write, and even authenticated users cannot write demo project tasks). **[à clarifier : spec says anon cannot write; should authenticated users be able to toggle demo project tasks? Assuming no for safety.]**
  - **Fichiers :** `app/api/tasks/[taskId]/route.ts`
  - **Critères d'acceptation :** Toggle task to checked → 200 with `checked: true`, `checked_at` set. Toggle back to unchecked → `checked_at: null`. When last unchecked task is checked → response includes `project_stats.gate_build: true` and DB project row has `gate_build = true`. Returns `401`/`404` correctly.
  - **Test :** Seed project with 2 tasks. Check task 1 → `gate_build: false`. Check task 2 → `gate_build: true` in response and DB. Uncheck task 2 → `gate_build` does NOT revert (gate only goes forward per spec). **[à clarifier : spec says gate_build is set when all tasks checked, but doesn't specify behavior when unchecked — assuming it does not revert gate_build once set.]**

- [ ] T20 — Implement GET /api/metrics
  - **Quoi :** Create `app/api/metrics/route.ts` `GET` handler. Run aggregation queries: (1) projects grouped by stage (owner's non-deleted projects), (2) task stats (total/checked across all owner's projects), (3) generation_runs stats (total/completed/failed/cancelled for owner). Return full metrics shape from §3.6. Archived/deleted projects excluded from `projects_active` count but generation_runs included in totals.
  - **Fichiers :** `app/api/metrics/route.ts`
  - **Critères d'acceptation :** Returns all fields from §3.6 shape. `projects_by_stage` has keys 1–6 (0 for empty stages). `generated_at` is current timestamp. `completion_pct` is rounded to 1 decimal. Returns `401` without session.
  - **Test :** Seed: 2 projects (stages 1 and 3), 5 tasks (3 checked), 4 generation_runs (3 completed, 1 failed). `GET /api/metrics` → `projects_by_stage: {"1":1,"2":0,"3":1,...}`, `task_stats.checked: 3`, `generation_runs.failed: 1`.

- [ ] T21 — Implement GET /api/public/projects/[id] (public demo route)
  - **Quoi :** Create `app/api/public/projects/[id]/route.ts`. Use the **anon Supabase client** (not server client with session). Query project by ID — RLS will enforce `is_demo = true AND status = 'active'`. If not found (either doesn't exist or isn't a demo project), return `404`. Return same shape as `GET /api/projects/[id]` (project + latest_artifacts + task_stats). No auth cookie required.
  - **Fichiers :** `app/api/public/projects/[id]/route.ts`
  - **Critères d'acceptation :** Non-demo project ID → 404. Demo project ID → 200 with full shape. No `Authorization` header needed. Confirm the route is excluded from middleware auth check (middleware.ts matches `/api/public/**`).
  - **Test :** Create a non-demo project → `GET /api/public/projects/[id]` → 404. Create a demo project (`is_demo=true`) → same route → 200 with project data.

- [ ] T22 — Implement POST /api/projects/[id]/approve (approve artifact + advance gate)
  - **Quoi :** Create `app/api/projects/[id]/approve/route.ts` `POST` handler. Body: `{ type: "prd"|"spec"|"tasks" }`. Steps: (1) validate type matches current stage expectations (`prd` when stage ≥ 1, `spec` when gate_prd=true, `tasks` when gate_spec=true); (2) find latest non-approved artifact of that type; (3) if `type = "tasks"`, parse markdown for checkboxes — return `400 EMPTY_TASK_LIST` if 0 tasks found; (4) set `approved = true, approved_at = now()` on the artifact; (5) delete old tasks (if tasks type) and insert parsed tasks; (6) set corresponding `gate_[type] = true` on project; (7) advance `stage` by 1 if appropriate; return updated project + artifact_id.
  - **Fichiers :** `app/api/projects/[id]/approve/route.ts`, `lib/tasks/parser.ts` (markdown checkbox parser)
  - **Critères d'acceptation :** Approving a PRD artifact sets `gate_prd=true`, advances stage to 2, returns 200. Approving tasks with 0 checkboxes in markdown → 400 EMPTY_TASK_LIST. Partial unique index prevents two approved artifacts of same type. `NO_ARTIFACT` error if no unapproved artifact exists. `INVALID_STAGE` if type doesn't match current stage readiness.
  - **Test :** Create project (stage 1), insert a `prd` artifact, call approve → stage becomes 2, `gate_prd=true`. Insert a `tasks` artifact with 3 checkboxes, approve → 3 task rows created in DB. Insert artifact with no checkboxes → 400.

- [ ] T23 — Build lib/tasks/parser.ts (markdown checkbox parser)
  - **Quoi :** Implement `parseTasksFromMarkdown(content: string): { tasks: Array<{ label: string; section: string | null; initialChecked: boolean }> }`. Parse `## Heading` as `section`. Parse `- [ ] Label` and `- [x] Label` lines. Strip leading/trailing whitespace from labels. Ignore lines that are not task items. Return tasks with 1-based `position` implied by order.
  - **Fichiers :** `lib/tasks/parser.ts`
  - **Critères d'acceptation :** Input with 3 sections, 10 tasks → returns 10 items with correct section attribution. `- [x] Done task` → `initialChecked: true`. Empty markdown → returns `[]`. Markdown with only headings and no tasks → returns `[]`. Non-task lines (paragraphs, code blocks) are ignored.
  - **Test :** Unit tests in `lib/tasks/parser.test.ts`: test empty input, single task no section, multiple sections, pre-checked tasks, lines with extra whitespace, code block containing `- [ ]` (should not be parsed as task — **[à clarifier : spec doesn't address this; assume code blocks are parsed naively for v1]**).

- [ ] T24 — Implement FastAPI service: scaffold, auth middleware, /internal/generate SSE endpoint
  - **Quoi :** Create `fastapi-service/` directory with: `main.py`, `_llm.py`, `prompts/prd.txt`, `prompts/spec.txt`, `prompts/tasks.txt`, `requirements.txt`. Implement bearer token auth middleware (validates `Authorization: Bearer $INTERNAL_API_SECRET`). Implement `POST /internal/generate` that: reads request body, selects prompt template by type, calls OpenAI/Anthropic streaming API, streams SSE chunks back with `event: chunk` and final `event: done` with `model` and `duration_ms`. Return `401` on bad token.
  - **Fichiers :** `fastapi-service/main.py`, `fastapi-service/_llm.py`, `fastapi-service/prompts/prd.txt`, `fastapi-service/prompts/spec.txt`, `fastapi-service/prompts/tasks.txt`, `fastapi-service/requirements.txt`, `fastapi-service/.env.example`
  - **Critères d'acceptation :** `POST /internal/generate` with valid bearer token and `{"type":"prd","project_id":"x","prompt_language":"en","context":{...}}` returns SSE stream ending with `event: done`. Invalid bearer token → 401. Missing required fields → 422.
  - **Test :** Run FastAPI locally (`uvicorn main:app`). `curl` the endpoint with a test prompt and valid token → confirm SSE chunks stream and `done` event arrives. `curl` with wrong token → 401.

- [ ] T25 — Implement FastAPI /internal/deploy-check endpoint
  - **Quoi :** Add `POST /internal/deploy-check` to `fastapi-service/main.py`. Implement `deploy_check.py` logic: run the 4 checks from §3.5 (all tasks completed, PRD approved, spec approved, tasks artifact exists). **[à clarifier : spec implies FastAPI does the check logic, but checks are essentially validating data passed in the request — no external calls needed for v1 deploy check]**. Return `{ passed: bool, checks: [...] }`.
  - **Fichiers :** `fastapi-service/deploy_check.py`, `fastapi-service/main.py` (updated)
  - **Critères d'acceptation :** Request with all checks passing → `{ passed: true, checks: [4 passed items] }`. Request with `task_stats.checked < task_stats.total` → `passed: false` with failing check identified. Invalid bearer token → 401.
  - **Test :** `curl POST /internal/deploy-check` with all passing data → `passed: true`. With `task_stats: { total: 5, checked: 4 }` → `passed: false`, checks show which failed.

- [ ] T26 — Implement GET /api/generate (SSE streaming proxy to FastAPI)
  - **Quoi :** Create `app/api/generate/route.ts` `GET` handler. Pre-flight checks (from §3.3): validate `project_id` and `type` query params; check project exists and stage allows generation; check no active run exists (409). Then: insert `generation_runs` row with `status='streaming'`; call FastAPI `POST /internal/generate` with `Authorization: Bearer $INTERNAL_API_SECRET`; proxy SSE chunks as `event: chunk` to browser; on stream end insert artifact + update run to
