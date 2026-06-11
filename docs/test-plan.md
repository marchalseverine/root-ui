# Plan de tests & sécurité — root-ui v1

---

## 1. Tests fonctionnels — Backend

### 1.1 `GET /api/projects`

- [ ] **[AUTO]** Returns `200` with array of active projects when authenticated with valid JWT
- [ ] **[AUTO]** Returns `200` with empty `data: []` when user has no projects
- [ ] **[AUTO]** `status=active` filter returns only projects with `status = 'active'`
- [ ] **[AUTO]** `status=archived` filter returns only projects with `status = 'archived'`
- [ ] **[AUTO]** `status=completed` filter returns only projects with `status = 'completed'`
- [ ] **[AUTO]** `status=all` returns projects of all statuses
- [ ] **[AUTO]** Default behavior (no `status` param) returns only active projects
- [ ] **[AUTO]** Each project in response includes `task_stats` object with `total`, `completed`, `pct`
- [ ] **[AUTO]** Returns `401` when no `Authorization` header is provided
- [ ] **[AUTO]** Returns `401` when JWT is expired
- [ ] **[AUTO]** Returns `401` when JWT is malformed
- [ ] **[AUTO]** Does NOT return projects owned by other users
- [ ] **[AUTO]** `status=invalid_value` returns `400` or is ignored gracefully (behavior documented)

### 1.2 `POST /api/projects`

- [ ] **[AUTO]** Returns `201` with created project object when all required fields are valid
- [ ] **[AUTO]** Created project has `current_stage = 1` and `status = 'active'`
- [ ] **[AUTO]** Postgres trigger seeds exactly 6 `pipeline_stages` rows after project creation
- [ ] **[AUTO]** Stage 1 is seeded with `status = 'in_progress'`, stages 2–6 with `status = 'pending'`
- [ ] **[AUTO]** Returns `400` with `field: 'name'` when `name` is missing
- [ ] **[AUTO]** Returns `400` with `field: 'name'` when `name` is empty string
- [ ] **[AUTO]** Returns `400` when `name` exceeds 200 chars
- [ ] **[AUTO]** Returns `400` with `field: 'client_name'` when `client_name` is missing
- [ ] **[AUTO]** Returns `400` when `client_name` exceeds 200 chars
- [ ] **[AUTO]** Returns `400` with `field: 'started_at'` when `started_at` is missing
- [ ] **[AUTO]** Returns `400` when `started_at` is not a valid ISO date (e.g., `"not-a-date"`)
- [ ] **[AUTO]** Returns `401` when unauthenticated
- [ ] **[AUTO]** `owner_id` is set to the authenticated user's UUID (not user-supplied)
- [ ] **[AUTO]** `is_demo` defaults to `false` regardless of any user-supplied value in body

### 1.3 `GET /api/projects/[id]`

- [ ] **[AUTO]** Returns `200` with full project object including `stages` array (6 items) for authenticated owner
- [ ] **[AUTO]** `stages` array contains all 6 stages with correct `stage_number`, `status`, `validated_at`, `validation_note`
- [ ] **[AUTO]** Returns `200` for unauthenticated (anon) request when `is_demo = true`
- [ ] **[AUTO]** Returns `401` for unauthenticated request when `is_demo = false`
- [ ] **[AUTO]** Returns `404` when project ID does not exist
- [ ] **[AUTO]** Returns `404` when project exists but is owned by a different user
- [ ] **[AUTO]** Response includes `task_stats` object
- [ ] **[AUTO]** Malformed UUID in path returns `400` or `404` (no 500)

### 1.4 `PATCH /api/projects/[id]`

- [ ] **[AUTO]** Returns `200` with updated project when `name` is changed
- [ ] **[AUTO]** Returns `200` with updated project when `client_name` is changed
- [ ] **[AUTO]** Returns `200` when `status` is set to `'archived'`
- [ ] **[AUTO]** Returns `200` when `status` is set back to `'active'` from `'archived'`
- [ ] **[AUTO]** Returns `400` when attempting to set `status = 'active'` on a `'completed'` project
- [ ] **[AUTO]** Returns `400` when attempting to set `status = 'archived'` on a `'completed'` project
- [ ] **[AUTO]** Returns `400` when `name` exceeds 200 chars
- [ ] **[AUTO]** Returns `401` when unauthenticated
- [ ] **[AUTO]** Returns `404` when project owned by another user
- [ ] **[AUTO]** User cannot change `owner_id`, `is_demo`, or `current_stage` via PATCH body

### 1.5 `POST /api/projects/[id]/stages/[stage]/validate`

- [ ] **[AUTO]** Returns `200` with `status = 'validated'` when stage is `in_progress` and all prerequisites met
- [ ] **[AUTO]** Stage 1 validation succeeds when brief content ≥ 10 chars
- [ ] **[AUTO]** Stage 1 validation returns `400 DOCUMENT_NOT_READY` when brief content < 10 chars
- [ ] **[AUTO]** Stage 2 validation succeeds when PRD document has `generation_status = 'done'`
- [ ] **[AUTO]** Stage 2 validation returns `400 DOCUMENT_NOT_READY` when PRD `generation_status != 'done'`
- [ ] **[AUTO]** Stage 3 validation requires spec document `generation_status = 'done'`
- [ ] **[AUTO]** Stage 4 validation requires tasks document `generation_status = 'done'`
- [ ] **[AUTO]** Stage 5 validation requires at least one `deploy_check_results` row with `overall_status = 'ready'`
- [ ] **[AUTO]** Stage 5 validation returns `400 DOCUMENT_NOT_READY` when no `deploy_check_results` row with `overall_status = 'ready'`
- [ ] **[AUTO]** Stage 6 validation succeeds with no prerequisite document check
- [ ] **[AUTO]** Returns `400 STAGE_NOT_IN_PROGRESS` when stage is `'pending'`
- [ ] **[AUTO]** Returns `400 STAGE_NOT_IN_PROGRESS` when stage is already `'validated'`
- [ ] **[AUTO]** Returns `400` when attempting to validate stage N when `project.current_stage != N`
- [ ] **[AUTO]** Returns `400 NOTE_TOO_LONG` when `note` exceeds 1000 chars
- [ ] **[AUTO]** Accepts `note: null` (optional field)
- [ ] **[AUTO]** After validation, DB trigger sets next stage to `'in_progress'`
- [ ] **[AUTO]** After validating stage 6, `project.status` is set to `'completed'`
- [ ] **[AUTO]** `project.current_stage` is incremented by trigger after validation
- [ ] **[AUTO]** Returns `401` when unauthenticated
- [ ] **[AUTO]** Returns `404` when project owned by another user
- [ ] **[AUTO]** Stage path parameter outside 1–6 returns `400` or `404`

### 1.6 `GET /api/projects/[id]/stages`

- [ ] **[AUTO]** Returns `200` with array of 6 stage objects for authenticated owner
- [ ] **[AUTO]** Each stage includes `stage_number`, `status`, `validated_at`, `validated_by_display_name`, `validation_note`
- [ ] **[AUTO]** `validated_by_display_name` is `null` for non-validated stages
- [ ] **[AUTO]** Returns `401` when unauthenticated
- [ ] **[AUTO]** Returns `404` when project owned by another user

### 1.7 `GET /api/projects/[id]/documents/[doc_type]`

- [ ] **[AUTO]** Returns `200` with document object when document exists for authenticated owner
- [ ] **[AUTO]** Returns `204` when document does not exist yet (not yet generated)
- [ ] **[AUTO]** Works for all valid `doc_type` values: `brief`, `prd`, `spec`, `tasks`, `deploy_check`
- [ ] **[AUTO]** Returns `200` for anon request on demo project
- [ ] **[AUTO]** Returns `401` for anon request on non-demo project
- [ ] **[AUTO]** Returns `404` when project owned by another user
- [ ] **[AUTO]** Returns `400` or `404` for invalid `doc_type` value (e.g., `doc_type = 'malicious'`)
- [ ] **[AUTO]** Returns `404` when project ID does not exist

### 1.8 `PUT /api/projects/[id]/documents/brief`

- [ ] **[AUTO]** Returns `200` with document object when content is valid
- [ ] **[AUTO]** Creates document record if it does not exist (upsert behavior)
- [ ] **[AUTO]** Overwrites existing brief content on re-submission
- [ ] **[AUTO]** Returns `400` when `content` exceeds 50,000 chars
- [ ] **[AUTO]** Returns `400` when `content` field is missing
- [ ] **[AUTO]** Returns `401` when unauthenticated
- [ ] **[AUTO]** Returns `404` when project owned by another user
- [ ] **[AUTO]** `word_count` is computed and stored on save

### 1.9 `POST /api/generate`

- [ ] **[AUTO]** Returns `202` with `job_id` and `doc_type` when all prerequisites are met
- [ ] **[AUTO]** PRD generation: returns `400 PREREQUISITE_NOT_MET` with `required_doc: 'brief'` when brief does not have `generation_status = 'done'`
- [ ] **[AUTO]** Spec generation: returns `400 PREREQUISITE_NOT_MET` with `required_doc: 'prd'` when PRD not done
- [ ] **[AUTO]** Tasks generation: returns `400 PREREQUISITE_NOT_MET` with `required_doc: 'spec'` when spec not done
- [ ] **[AUTO]** Returns `400 GENERATION_ALREADY_IN_PROGRESS` when a job with `status IN ('pending','streaming')` already exists for same `project_id` + `doc_type`
- [ ] **[AUTO]** Document row is upserted with `generation_status = 'streaming'` after call
- [ ] **[AUTO]** `generation_jobs` row is created with `status = 'pending'`
- [ ] **[AUTO]** Returns `400` when `doc_type = 'brief'` (brief cannot be generated)
- [ ] **[AUTO]** Returns `401` when unauthenticated
- [ ] **[AUTO]** Returns `404` when `project_id` does not belong to authenticated user
- [ ] **[AUTO]** Returns `400` when `project_id` is missing or malformed
- [ ] **[AUTO]** Returns `400` when `doc_type` is an invalid value
- [ ] **[AUTO]** FastAPI `POST /internal/generate` is called with correct `job_id` and context payload

### 1.10 `GET /api/stream/[job_id]`

- [ ] **[AUTO]** Returns `text/event-stream` content type for valid authenticated job
- [ ] **[AUTO]** Forwards `token` events from FastAPI to browser
- [ ] **[AUTO]** Forwards `done` event; `documents.generation_status` is set to `'done'` after `done` event
- [ ] **[AUTO]** Forwards `done` event; `generation_jobs.status` is set to `'done'` after `done` event
- [ ] **[AUTO]** When `doc_type = 'tasks'`, task parsing is triggered after `done` event
- [ ] **[AUTO]** Forwards `error` event; `documents.generation_status` is set to `'error'`
- [ ] **[AUTO]** Forwards `error` event; `documents.error_message` is populated
- [ ] **[AUTO]** Forwards `error` event; `generation_jobs.status` is set to `'error'`
- [ ] **[AUTO]** Returns `401` when JWT is invalid on SSE connection attempt
- [ ] **[AUTO]** Returns `404` when `job_id` does not exist
- [ ] **[AUTO]** Returns `404` when `job_id` belongs to another user's project
- [ ] **[MANUAL]** Browser disconnection mid-stream causes FastAPI to set job status to `'aborted'` and document retains partial content
- [ ] **[AUTO]** Reconnecting to an in-progress job re-streams remaining tokens (document shows partial content)

### 1.11 `POST /api/generate/abort`

- [ ] **[AUTO]** Returns `200` with `{ "aborted": true }` for an in-progress job
- [ ] **[AUTO]** `generation_jobs.status` is set to `'aborted'` after abort
- [ ] **[AUTO]** `documents.generation_status` is set to `'aborted'` after abort
- [ ] **[AUTO]** Partial document content is preserved (not deleted) after abort
- [ ] **[AUTO]** FastAPI `POST /internal/abort/{job_id}` is called
- [ ] **[AUTO]** Returns `400 JOB_ALREADY_COMPLETE` when job has `status = 'done'`
- [ ] **[AUTO]** Returns `404` when `job_id` does not exist
- [ ] **[AUTO]** Returns `404` when job belongs to another user's project
- [ ] **[AUTO]** Returns `401` when unauthenticated
- [ ] **[AUTO]** Returns `400` when `job_id` is missing from request body

### 1.12 `GET /api/projects/[id]/tasks`

- [ ] **[AUTO]** Returns `200` with tasks array and stats for authenticated owner
- [ ] **[AUTO]** Each task includes `id`, `position`, `section`, `label`, `is_completed`, `is_blocker`
- [ ] **[AUTO]** Returns `200` with empty `tasks: []` and `stats: { total: 0, completed: 0, pct: 0 }` when no tasks exist
- [ ] **[AUTO]** Returns `200` for anon request on demo project
- [ ] **[AUTO]** Returns `401` for anon request on non-demo project
- [ ] **[AUTO]** Returns `404` when project owned by another user
- [ ] **[AUTO]** Tasks are ordered by `position` ascending

### 1.13 `PATCH /api/tasks/[task_id]`

- [ ] **[AUTO]** Returns `200` with updated task and recalculated `stats` when `is_completed = true`
- [ ] **[AUTO]** Returns `200` when `is_completed = false` (unchecking a task)
- [ ] **[AUTO]** `stats.completed` and `stats.pct` are correctly recalculated after toggle
- [ ] **[AUTO]** Returns `401` when unauthenticated
- [ ] **[AUTO]** Returns `404` when `task_id` belongs to another user's project
- [ ] **[AUTO]** Returns `404` when `task_id` does not exist
- [ ] **[AUTO]** Returns `400` when `is_completed` field is missing from body
- [ ] **[AUTO]** User cannot change `label`, `position`, `is_blocker`, or `section` via this endpoint

### 1.14 `POST /api/projects/[id]/deploy-check`

- [ ] **[AUTO]** Returns `200` with deploy check result including `overall_status` and `items` array when at stage 5
- [ ] **[AUTO]** Result is stored in `deploy_check_results` table
- [ ] **[AUTO]** Returns `400 DEPLOY_CHECK_ONLY_AVAILABLE_AT_STAGE_5` when `project.current_stage != 5`
- [ ] **[AUTO]** Returns `408` when FastAPI internal endpoint times out (> 10s)
- [ ] **[AUTO]** Returns `401` when unauthenticated
- [ ] **[AUTO]** Returns `404` when project owned by another user
- [ ] **[AUTO]** `duration_ms` is populated in the stored result
- [ ] **[AUTO]** `items` JSONB array has valid shape (each item has `key`, `label`, `status`, `message`)
- [ ] **[AUTO]** `overall_status` is correctly derived from `items` statuses

### 1.15 `GET /api/metrics`

- [ ] **[AUTO]** Returns `200` with metrics object for authenticated user
- [ ] **[AUTO]** `period=week` returns metrics for last 7 days
- [ ] **[AUTO]** `period=month` returns metrics for last 30 days
- [ ] **[AUTO]** `period=all` returns metrics for all time
- [ ] **[AUTO]** Default (no `period` param) returns `all`
- [ ] **[AUTO]** `avg_days_per_stage` array contains exactly 6 entries
- [ ] **[AUTO]** Returns `200` with zeroed metrics when user has no completed projects
- [ ] **[AUTO]** Returns `401` when unauthenticated
- [ ] **[AUTO]** `avg_days_per_stage` computation uses only projects owned by authenticated user (no cross-user data)
- [ ] **[AUTO]** `period=invalid` returns `400` or defaults gracefully

### 1.16 `PATCH /api/profile/locale`

- [ ] **[AUTO]** Returns `200` with `{ "locale": "fr" }` when locale is `'fr'`
- [ ] **[AUTO]** Returns `200` for `'en'` and `'es'`
- [ ] **[AUTO]** `profiles.preferred_locale` is updated in DB
- [ ] **[AUTO]** Returns `400` when `locale` is not in `['en', 'fr', 'es']`
- [ ] **[AUTO]** Returns `400` when `locale` field is missing
- [ ] **[AUTO]** Returns `401` when unauthenticated
- [ ] **[AUTO]** User cannot update another user's locale via this endpoint

### 1.17 FastAPI Internal Endpoints

- [ ] **[AUTO]** `POST /internal/generate` returns `202` with `job_id` and `status: 'started'` when called with valid secret
- [ ] **[AUTO]** `POST /internal/generate` returns `401` or `403` when `X-Internal-Secret` header is missing
- [ ] **[AUTO]** `POST /internal/generate` returns `401` or `403` when `X-Internal-Secret` header is wrong
- [ ] **[AUTO]** `GET /internal/stream/{job_id}` streams `token` events in correct SSE format
- [ ] **[AUTO]** `GET /internal/stream/{job_id}` sends `done` event with `doc_type` and `word_count` at end
- [ ] **[AUTO]** `GET /internal/stream/{job_id}` sends `error` event with `code` on LLM failure
- [ ] **[AUTO]** `POST /internal/abort/{job_id}` returns `200 { "aborted": true }` for an active job
- [ ] **[AUTO]** `POST /internal/abort/{job_id}` returns `404` for unknown or completed job
- [ ] **[AUTO]** `POST /internal/deploy-check` returns `200` with correct shape
- [ ] **[AUTO]** All internal endpoints return `401/403` without shared secret header
- [ ] **[AUTO]** Internal endpoints are NOT reachable from browser (CORS or network policy blocks direct browser access)

### 1.18 DB Triggers & Constraints

- [ ] **[AUTO]** `seed_pipeline_stages` trigger fires on project INSERT and creates exactly 6 rows
- [ ] **[AUTO]** `sync_project_stage` trigger updates `projects.current_stage` on stage validation
- [ ] **[AUTO]** `sync_project_stage` trigger sets stage 6 validation to set `projects.status = 'completed'`
- [ ] **[AUTO]** `sync_project_stage` trigger sets next stage to `in_progress` after validation
- [ ] **[AUTO]** `pipeline_stages_project_stage_unique` constraint prevents duplicate `(project_id, stage_number)`
- [ ] **[AUTO]** `documents_project_type_unique` constraint prevents duplicate `(project_id, doc_type)` — UPSERT replaces
- [ ] **[AUTO]** `profiles.preferred_locale` CHECK constraint rejects values outside `['en','fr','es']`
- [ ] **[AUTO]** `pipeline_stages.stage_number` CHECK constraint rejects values outside 1–6
- [ ] **[AUTO]** `projects.current_stage` CHECK constraint rejects values outside 1–6
- [ ] **[AUTO]** `documents.generation_status` CHECK constraint rejects invalid status values
- [ ] **[AUTO]** `generation_jobs.status` CHECK constraint rejects invalid status values
- [ ] **[AUTO]** ON DELETE CASCADE on `projects` removes all child `pipeline_stages`, `documents`, `tasks`, `deploy_check_results`, `generation_jobs`

### 1.19 Task Parsing Logic

- [ ] **[AUTO]** `- [ ] Task label` is parsed as uncompleted task
- [ ] **[AUTO]** `- [x] Task label` is parsed as completed task
- [ ] **[AUTO]** `##` and `###` headings are extracted as `section` for subsequent tasks
- [ ] **[AUTO]** Task with `[BLOCKER]` tag has `is_blocker = true`
- [ ] **[AUTO]** Task with `! ` prefix after checkbox has `is_blocker = true`
- [ ] **[AUTO]** Tasks are assigned `position` in order of appearance in markdown
- [ ] **[AUTO]** Existing `tasks` rows for `project_id` are deleted before bulk insert (idempotent)
- [ ] **[AUTO]** Malformed tasks.md with zero checkbox lines results in empty `tasks` table (no error thrown)
- [ ] **[AUTO]** Re-generation replaces all tasks (old tasks not present in new output are removed)

---

## 2. Tests fonctionnels — Frontend

### 2.1 `LoginPage` — `/login`

- [ ] **[AUTO]** Page renders `LoginForm` with email and password fields and a submit button
- [ ] **[AUTO]** `RootLogo` SVG is rendered
- [ ] **[AUTO]** Submitting with valid credentials redirects to `/dashboard`
- [ ] **[AUTO]** Submitting with wrong password shows error message (non-empty, non-technical)
- [ ] **[AUTO]** Submitting with empty email shows client-side validation error
- [ ] **[AUTO]** Submitting with empty password shows client-side validation error
- [ ] **[AUTO]** Submitting with invalid email format shows client-side validation error
- [ ] **[AUTO]** Submit button shows loading state while auth request is in-flight
- [ ] **[AUTO]** Already authenticated user visiting `/login` is redirected to `/dashboard`
- [ ] **[MANUAL]** Page is usable at 320px viewport width (mobile minimum)

### 2.2 `AppShell` — persistent layout

- [ ] **[AUTO]** `Sidebar` renders with Dashboard and Metrics links
- [ ] **[AUTO]** `Sidebar` shows list of active projects (fetched from API)
- [ ] **[AUTO]** `UserMenu` displays authenticated user's `display_name`
- [ ] **[AUTO]** Sign out button in `UserMenu` clears session and redirects to `/login`
- [ ] **[AUTO]** `LocaleSelector` displays current locale
- [ ] **[AUTO]** Selecting a new locale in `LocaleSelector` calls `PATCH /api/profile/locale` and re-renders UI text in selected language without page reload
- [ ] **[AUTO]** `(app)/` routes redirect unauthenticated users to `/login`
- [ ] **[MANUAL]** Sidebar collapses or scrolls correctly when project list is long

### 2.3 `DashboardPage` — `/dashboard`

- [ ] **[AUTO]** Renders `ProjectGrid` with `ProjectCard` for each active project
- [ ] **[AUTO]** `ProjectCard` displays project name, client name, `PipelineProgressBar`, task completion count, status badge
- [ ] **[AUTO]** `PipelineProgressBar` shows 6 segments with correct colors: gray (pending), coral (in_progress), white (validated)
- [ ] **[AUTO]** Clicking a `ProjectCard` navigates to `/p/[id]`
- [ ] **[AUTO]** `EmptyState` is shown when `data: []` is returned for active projects
- [ ] **[AUTO]** `NewProjectButton` opens `NewProjectModal` on click
- [ ] **[AUTO]** `NewProjectModal` form: name, client_name, started_at fields
- [ ] **[AUTO]** Submitting `NewProjectModal` with valid data calls `POST /api/projects` and closes modal
- [ ] **[AUTO]** New project appears in grid after successful creation (optimistic update or refetch)
- [ ] **[AUTO]** `NewProjectModal` shows field-level errors for missing required fields
- [ ] **[AUTO]** `NewProjectModal` shows error when `name` > 200 chars
- [ ] **[AUTO]** `NewProjectModal` shows error when `client_name` > 200 chars
- [ ] **[AUTO]** `NewProjectModal` shows error when `started_at` is invalid
- [ ] **[AUTO]** `FilterTabs` "Active" tab shows active projects
- [ ] **[AUTO]** `FilterTabs` "Archived" tab shows archived projects
- [ ] **[AUTO]** `FilterTabs` "All" tab shows all projects
- [ ] **[AUTO]** Loading state (skeleton or spinner) is shown while projects are being fetched
- [ ] **[AUTO]** Error state is shown when `GET /api/projects` returns `500`
- [ ] **[MANUAL]** Dashboard renders correctly at 768px and 1280px viewport widths

### 2.4 `ProjectLayout` — `/p/[id]/*`

- [ ] **[AUTO]** `ProjectHeader` displays project name, client, `started_at`, status badge
- [ ] **[AUTO]** `PipelineStepper` renders 6 steps with correct labels and status indicators
- [ ] **[AUTO]** Clicking a step in `PipelineStepper` navigates to the corresponding sub-route
- [ ] **[AUTO]** `TaskProgressChip` displays correct `completed / total` count
- [ ] **[AUTO]** `TaskProgressChip` updates in real time when a task is toggled (via Supabase Realtime)
- [ ] **[AUTO]** Navigating to a non-existent project ID shows `404` page
- [ ] **[AUTO]** Loading state is shown while project data is being fetched

### 2.5 `ProjectOverviewPage` — `/p/[id]`

- [ ] **[AUTO]** Shows overall stage progress map
- [ ] **[AUTO]** Shows task completion stats
- [ ] **[MANUAL]** Stage statuses are visually distinguishable (color, icon)

### 2.6 `BriefPage` — `/p/[id]/brief`

- [ ] **[AUTO]** `BriefEditor` renders with existing brief content pre-filled
- [ ] **[AUTO]** `BriefEditor` uses monospace font
- [ ] **[AUTO]** Character counter is displayed and updates as user types
- [ ] **[AUTO]** Autosave triggers after 1.5s debounce and calls `PUT /api/projects/[id]/documents/brief`
- [ ] **[AUTO]** Autosave does NOT fire when content exceeds 50,000 chars; validation error shown instead
- [ ] **[AUTO]** `StageValidationPanel` is visible when stage 1 is `in_progress`
- [ ] **[AUTO]** `StageValidationPanel` "Validate Brief" button is disabled when brief content < 10 chars
- [ ] **[AUTO]** `StageValidationPanel` "Validate Brief" button is enabled when brief content ≥ 10 chars
- [ ] **[AUTO]** Clicking "Validate Brief" with optional note calls `POST /api/projects/[id]/stages/1/validate`
- [ ] **[AUTO]** Validation note textarea warns at 950 chars
- [ ] **[AUTO]** Validation note textarea blocks submission at > 1000 chars
- [ ] **[AUTO]** `StageValidationPanel` is hidden (or shows read-only state) when stage 1 is `validated`
- [ ] **[AUTO]** `ValidationHistory` renders past validations with date, note, validator name
- [ ] **[AUTO]** `BriefEditor` is read-only (or hidden) when project stage > 1 and brief is validated
- [ ] **[AUTO]** Renders correctly when no brief exists yet (empty editor, no 204 error shown to user)
- [ ] **[MANUAL]** BriefEditor textarea is scrollable and usable on mobile

### 2.7 `DocumentPage` — `/p/[id]/prd` and `/p/[id]/spec`

- [ ] **[AUTO]** `GenerateButton` is visible and enabled when prerequisite document is `done`
- [ ] **[AUTO]** `GenerateButton` is disabled when prerequisite document is not `done`, with explanatory tooltip
- [ ] **[AUTO]** `GenerateButton` is disabled when a generation job is already `in_progress`/`streaming`
- [ ] **[AUTO]** Clicking `GenerateButton` calls `POST /api/generate` and connects `EventSource` to `/api/stream/[job_id]`
- [ ] **[AUTO]** `StreamingDocumentViewer` renders accumulated tokens as markdown in real time during streaming
- [ ] **[AUTO]** `GenerateButton` shows spinner/loading state during streaming
- [ ] **[AUTO]** On `done` SSE event, `StreamingDocumentViewer` renders final full markdown
- [ ] **[AUTO]** On `error` SSE event with `code: 'API_ERROR'`, error message and retry button are shown
- [ ] **[AUTO]** On `error` SSE event with `code: 'TIMEOUT'`, timeout message and retry button are shown
- [ ] **[AUTO]** On page load with `generation_status = 'streaming'`, UI auto-reconnects to in-progress job
- [ ] **[AUTO]** On page load with `generation_status = 'aborted'`, partial content is shown with re-generate option
- [ ] **[AUTO]** On page load with `generation_status = 'error'`, error is shown with retry button
- [ ] **[AUTO]** `StageValidationPanel` is shown when stage is `in_progress` and document is `done`
- [ ] **[AUTO]** `StageValidationPanel` validate button is disabled when document is not `done`
- [ ] **[AUTO]** Clicking "Abort" during streaming calls `POST /api/generate/abort`
- [ ] **[AUTO]** Renders `EmptyState` when document does not exist (204 response) and generation has not started
- [ ] **[MANUAL]** Rendered markdown is readable with correct heading hierarchy and code block formatting

### 2.8 `TasksPage` — `/p/[id]/tasks`

- [ ] **[AUTO]** Renders list of tasks grouped by `section`
- [ ] **[AUTO]** Each task shows checkbox, label, `is_blocker` indicator
