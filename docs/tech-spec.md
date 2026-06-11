# Spec technique — root-ui v1

**Project:** root-ui | **Stack:** Next.js 15 (App Router) · Supabase · Vercel | **Date:** 2026-06-11

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          VERCEL EDGE                                │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                  Next.js App (App Router)                    │   │
│  │                                                             │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │   │
│  │  │  Public       │  │  Auth'd      │  │  Next.js Route   │  │   │
│  │  │  /demo/*      │  │  /dashboard  │  │  Handlers        │  │   │
│  │  │  (read-only)  │  │  /projects/* │  │  /api/*          │  │   │
│  │  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │   │
│  │         │                  │                    │            │   │
│  │         └──────────────────┴────────────────────┘            │   │
│  │                            │                                 │   │
│  │              ┌─────────────▼──────────────┐                 │   │
│  │              │   Supabase JS Client (SSR)   │                │   │
│  │              │   @supabase/ssr              │                │   │
│  │              └─────────────┬──────────────┘                 │   │
│  └────────────────────────────┼─────────────────────────────────┘  │
└───────────────────────────────┼─────────────────────────────────────┘
                                │
        ┌───────────────────────┼──────────────────────┐
        │                       │                      │
        ▼                       ▼                      ▼
┌───────────────┐   ┌───────────────────┐   ┌─────────────────────┐
│  Supabase DB  │   │  Supabase Auth    │   │  Next.js API Routes │
│  (Postgres)   │   │  (magic link /    │   │  (SSE streaming)    │
│  + RLS        │   │   email+password) │   │                     │
└───────────────┘   └───────────────────┘   └──────────┬──────────┘
                                                        │
                                            ┌───────────▼──────────┐
                                            │   Python FastAPI      │
                                            │   (Railway/Render)    │
                                            │                       │
                                            │  ┌─────────────────┐ │
                                            │  │   _llm.py        │ │
                                            │  │   deploy_check   │ │
                                            │  │   prompts/       │ │
                                            │  └────────┬────────┘ │
                                            └───────────┼──────────┘
                                                        │
                                            ┌───────────▼──────────┐
                                            │   LLM Provider API   │
                                            │   (OpenAI / Anthropic)│
                                            └──────────────────────┘
```

### Data & Request Flow

| Flow | Path |
|---|---|
| **Auth (Sévi)** | Browser → Supabase Auth → JWT cookie → Next.js middleware validates → renders protected routes |
| **Project CRUD** | Browser → Next.js Route Handler → Supabase JS (server) → Postgres (RLS enforced) → JSON response |
| **AI Generation (streaming)** | Browser → `GET /api/generate?projectId=&type=prd` (EventSource) → Next.js Route Handler (streams) → FastAPI `/stream` → LLM API → SSE chunks back through chain → Browser renders tokens |
| **Deploy Check** | Browser → `POST /api/deploy-check` → Next.js Route Handler → FastAPI `/deploy-check` → result JSON → persisted to Supabase |
| **Public Demo** | Browser (no cookie) → Next.js middleware detects anon → serves `/demo/[projectId]` → Supabase anon key (RLS: read-only on `is_demo = true`) |
| **Checklist update** | Browser → `PATCH /api/tasks/[taskId]` → Next.js Route Handler → Supabase JS → Postgres |
| **Metrics** | Browser → `GET /api/metrics` → Next.js Route Handler → Supabase aggregation queries → JSON |

### Key Architectural Decisions

- **No separate Express/Fastify layer** — Next.js Route Handlers handle all BFF logic. FastAPI is called server-side only, never from the browser directly.
- **SSE via Next.js Route Handler** — the handler opens a `ReadableStream`, proxies FastAPI's SSE response, and pipes it to the browser. This keeps the LLM API key server-side.
- **Supabase anon key for public read** — RLS policies restrict anon reads to rows with `is_demo = true`. No separate API surface needed.
- **i18n via `next-intl`** — locale stored in `localStorage` + cookie; no URL-based locale prefix to keep public URLs clean.

---

## 2. Data Model

### 2.1 Table: `profiles`

Extends Supabase Auth `auth.users`. One row per authenticated user.

```sql
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
```

**Relations:** 1-to-1 with `auth.users`.

**RLS:**
```sql
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
```

---

### 2.2 Table: `projects`

Core entity. One row per client project.

```sql
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
```

**Stage/gate invariant enforced at application layer** (see §4 — Business Logic).

**RLS:**
```sql
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
```

---

### 2.3 Table: `artifacts`

Stores generated content (PRD, spec, tasks raw markdown). One row per generation run; the latest approved row is the canonical artifact for its type.

```sql
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
```

**Uniqueness rule:** Only one `approved = true` per `(project_id, type)` — enforced in application logic + a partial unique index:
```sql
CREATE UNIQUE INDEX idx_artifacts_single_approved
  ON public.artifacts(project_id, type)
  WHERE approved = true;
```

**RLS:**
```sql
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
```

---

### 2.4 Table: `tasks`

Individual checklist items, parsed from the approved `tasks` artifact.

```sql
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
```

**RLS:**
```sql
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
```

---

### 2.5 Table: `generation_runs`

Audit log of every generation attempt. Used for metrics and error tracking.

```sql
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
```

**RLS:**
```sql
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
```

---

### 2.6 Supabase Database Functions

```sql
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
```

---

## 3. API Contracts

All Next.js Route Handlers live under `app/api/`. Auth is validated server-side via `@supabase/ssr` — the session cookie is read automatically. Unauthenticated requests to protected routes return `401`.

**Common error shape:**
```json
{ "error": "Human-readable message", "code": "MACHINE_CODE" }
```

**Common headers on all responses:**
```
Content-Type: application/json
```

---

### 3.1 Auth

Auth is handled directly by Supabase Auth JS — no custom route handlers needed for login/logout. The app uses Supabase's email+password flow **[hypothèse — à confirmer: magic link vs. password; spec assumes email+password as default]**.

**Middleware** (`middleware.ts`) intercepts every request:
- If path matches `/dashboard/**` or `/api/**` (except `/api/public/**`): requires valid session → redirect to `/login` if absent.
- If path matches `/demo/**` or `/api/public/**`: no session required.

---

### 3.2 Projects

#### `GET /api/projects`
List all non-deleted projects for the authenticated user.

**Auth:** Required

**Query params:**
| Param | Type | Default | Notes |
|---|---|---|---|
| `status` | `active\|archived` | `active` | Filter by project status |
| `page` | integer | `1` | 1-based pagination |
| `limit` | integer | `20` | Max 50 |

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Acme Corp Website",
      "description": "Optional short description",
      "stage": 3,
      "status": "active",
      "is_demo": false,
      "prompt_language": "en",
      "gate_prd": true,
      "gate_spec": false,
      "gate_tasks": false,
      "gate_build": false,
      "gate_deploy": false,
      "last_deploy_check_at": null,
      "last_deploy_check_passed": null,
      "created_at": "2026-06-11T10:00:00Z",
      "updated_at": "2026-06-11T14:00:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 5 }
}
```

**Errors:** `401 UNAUTHORIZED`

---

#### `POST /api/projects`
Create a new project.

**Auth:** Required

**Body:**
```json
{
  "name": "Acme Corp Website",
  "description": "Optional",
  "prompt_language": "en"
}
```

**Validation:**
- `name`: required, 1–120 chars
- `description`: optional, max 500 chars
- `prompt_language`: optional, default `"en"`, must be `en|fr|es`

**Response 201:**
```json
{
  "data": { /* full project object, stage=1, all gates false */ }
}
```

**Errors:** `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`

---

#### `GET /api/projects/[id]`
Get a single project with its latest approved artifacts.

**Auth:** Required (or anon if `is_demo=true` via `/api/public/projects/[id]`)

**Response 200:**
```json
{
  "data": {
    /* full project object */
    "latest_artifacts": {
      "prd": { "id": "uuid", "content": "...", "approved_at": "...", "prompt_lang": "en" },
      "spec": null,
      "tasks": null
    },
    "task_stats": { "total": 0, "checked": 0 }
  }
}
```

**Errors:** `401`, `404 NOT_FOUND`

---

#### `PATCH /api/projects/[id]`
Update project fields. Used for name/description edits and `prompt_language` changes.

**Auth:** Required

**Body (all fields optional):**
```json
{
  "name": "New Name",
  "description": "Updated",
  "prompt_language": "fr",
  "status": "archived"
}
```

**Forbidden fields via this endpoint:** `stage`, `gate_*`, `is_demo`, `owner_id` — these are updated by dedicated endpoints.

**Response 200:**
```json
{ "data": { /* updated project object */ } }
```

**Errors:** `400`, `401`, `404`

---

#### `DELETE /api/projects/[id]`
Soft-delete a project (sets `status = 'deleted'`). Hard delete is not exposed via API.

**Auth:** Required

**Response 200:**
```json
{ "success": true }
```

**Errors:** `401`, `404`

---

#### `POST /api/projects/[id]/approve`
Approve the current stage's artifact and advance the pipeline gate.

**Auth:** Required

**Body:**
```json
{
  "type": "prd"
}
```

`type` must be one of `prd | spec | tasks`. The endpoint:
1. Sets `approved = true` on the latest artifact of that type.
2. Sets the corresponding gate on the project (`gate_prd`, `gate_spec`, `gate_tasks`).
3. Advances `stage` by 1 if the gate logic allows (see §4).

**Response 200:**
```json
{
  "data": {
    "artifact_id": "uuid",
    "project": { /* updated project object */ }
  }
}
```

**Errors:** `400 INVALID_STAGE` (wrong type for current stage), `400 NO_ARTIFACT` (nothing to approve), `401`, `404`

---

### 3.3 AI Generation (Streaming)

#### `GET /api/generate`
Initiates an SSE stream for AI content generation.

**Auth:** Required

**Query params:**
| Param | Type | Required | Notes |
|---|---|---|---|
| `project_id` | UUID | Yes | |
| `type` | `prd\|spec\|tasks` | Yes | |

**Response:** `Content-Type: text/event-stream`

SSE event format:
```
event: chunk
data: {"text": "token or small chunk of text"}

event: done
data: {"artifact_id": "uuid", "run_id": "uuid", "duration_ms": 4200}

event: error
data: {"message": "LLM timeout", "code": "STREAM_TIMEOUT", "run_id": "uuid"}
```

**Pre-flight validation (returns JSON error before opening stream if):**
- Project not found → `404`
- Project stage does not allow this generation type → `400 INVALID_STAGE`
  - `prd` requires `stage >= 1`
  - `spec` requires `gate_prd = true`
  - `tasks` requires `gate_spec = true`
- An active generation run already exists for this project+type → `409 GENERATION_IN_PROGRESS`

**Server-side behavior:**
1. Insert a `generation_runs` row with `status = 'streaming'`.
2. Call FastAPI `POST /internal/generate` with `{project_id, type, prompt_language, context}` where `context` = relevant approved artifacts.
3. Proxy FastAPI's SSE response as `chunk` events.
4. On FastAPI stream end: insert `artifacts` row, update `generation_runs` to `completed`, send `done` event.
5. On error/timeout: update `generation_runs` to `failed`, send `error` event. **Do not save partial artifact.**
6. On client disconnect (abort): update `generation_runs` to `cancelled`.

**Errors (JSON, before stream opens):** `400`, `401`, `404`, `409`

---

#### `DELETE /api/generate/[runId]`
Cancel an active generation run.

**Auth:** Required

**Response 200:**
```json
{ "success": true, "run_id": "uuid" }
```

The server sets `status = 'cancelled'` on the run and closes the upstream FastAPI connection.

**Errors:** `401`, `404`, `409 ALREADY_COMPLETED`

---

### 3.4 Tasks (Checklist)

#### `GET /api/projects/[id]/tasks`
List all tasks for a project, ordered by `position`.

**Auth:** Required

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "position": 1,
      "label": "Set up Next.js project with App Router",
      "section": "Infrastructure",
      "checked": false,
      "checked_at": null
    }
  ],
  "stats": { "total": 20, "checked": 7 }
}
```

---

#### `PATCH /api/tasks/[taskId]`
Toggle a task's checked state.

**Auth:** Required

**Body:**
```json
{ "checked": true }
```

**Side effect:** When this update causes `checked = true` for all tasks in the project, the server sets `gate_build = true` on the project. This does **not** auto-advance `stage` — Sévi must explicitly run the deploy check.

**Response 200:**
```json
{
  "data": { "id": "uuid", "checked": true, "checked_at": "2026-06-11T15:00:00Z" },
  "project_stats": { "total": 20, "checked": 8, "gate_build": false }
}
```

**Errors:** `401`, `404`, `403 DEMO_PROJECT` (anon cannot write)

---

### 3.5 Deploy Check

#### `POST /api/projects/[id]/deploy-check`
Run the deploy check against the current project state.

**Auth:** Required

**Body:** empty `{}`

**Server-side behavior:**
1. Validates `gate_build = true`. Returns `400 BUILD_NOT_COMPLETE` otherwise.
2. Calls FastAPI `POST /internal/deploy-check` with project context (approved artifacts, task completion state).
3. Persists result to `projects.last_deploy_check_*` fields.
4. If passed: sets `gate_deploy = true` and advances `stage` to `6`.

**Response 200:**
```json
{
  "passed": true,
  "checked_at": "2026-06-11T16:00:00Z",
  "detail": {
    "checks": [
      { "name": "All tasks completed", "passed": true, "message": null },
      { "name": "PRD approved", "passed": true, "message": null },
      { "name": "Spec approved", "passed": true, "message": null },
      { "name": "Tasks artifact exists", "passed": true, "message": null }
    ],
    "summary": "4/4 checks passed"
  },
  "project": { /* updated project object */ }
}
```

**Errors:** `400 BUILD_NOT_COMPLETE`, `401`, `404`, `502 FASTAPI_UNAVAILABLE`

---

### 3.6 Metrics

#### `GET /api/metrics`
Return aggregated metrics for all of Sévi's projects.

**Auth:** Required

**Response 200:**
```json
{
  "projects_by_stage": {
    "1": 2, "2": 1, "3": 3, "4": 0, "5": 1, "6": 0
  },
  "task_stats": {
    "total": 87,
    "checked": 43,
    "completion_pct": 49.4
  },
  "generation_runs": {
    "total": 38,
    "completed": 35,
    "failed": 2,
    "cancelled": 1
  },
  "projects_total": 7,
  "projects_active": 7,
  "projects_archived": 0,
  "generated_at": "2026-06-11T16:30:00Z"
}
```

**Errors:** `401`

---

### 3.7 Profile / Settings

#### `GET /api/profile`
Get the authenticated user's profile.

**Auth:** Required

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "email": "sevi@root.studio",
    "ui_language": "en",
    "role": "operator"
  }
}
```

---

#### `PATCH /api/profile`
Update profile settings (specifically `ui_language`).

**Auth:** Required

**Body:**
```json
{ "ui_language": "fr" }
```

**Response 200:**
```json
{ "data": { /* updated profile */ } }
```

---

### 3.8 Public Routes

#### `GET /api/public/projects/[id]`
Read a demo project without authentication.

**Auth:** None required

**Behavior:** Queries Supabase with the anon key. RLS ensures only `is_demo = true` projects are returned. Returns same shape as `GET /api/projects/[id]`.

**Errors:** `404` (project not found or not a demo project)

---

### 3.9 FastAPI Internal Endpoints

These are called **server-side only** from Next.js Route Handlers. Not exposed to the browser.

#### `POST /internal/generate` (FastAPI)
**Body:**
```json
{
  "project_id": "uuid",
  "type": "prd",
  "prompt_language": "en",
  "context": {
    "project_name": "Acme",
    "description": "...",
    "prd_content": null,
    "spec_content": null
  }
}
```
**Response:** SSE stream of text chunks. Final event: `{"event": "done", "model": "gpt-4o", "duration_ms": 3800}`.

#### `POST /internal/deploy-check` (FastAPI)
**Body:**
```json
{
  "project_id": "uuid",
  "artifacts": { "prd": "...", "spec": "...", "tasks": "..." },
  "task_stats": { "total": 20, "checked": 20 }
}
```
**Response:**
```json
{
  "passed": true,
  "checks": [ { "name": "...", "passed": true, "message": null } ]
}
```

**FastAPI auth:** The Next.js server includes an `Authorization: Bearer $INTERNAL_API_SECRET` header. FastAPI validates this shared secret. **[hypothèse — à confirmer: a shared secret is simpler than mTLS for v1]**

---

## 4. Business Logic & Edge Cases

### 4.1 Pipeline Stage Invariant

Stages and their prerequisites:

| Stage | Name | Gate Required to Advance | Gate Set By |
|---|---|---|---|
| 1 | Brief | — | — |
| 2 | PRD | `gate_prd = true` | Sévi approves PRD artifact |
| 3 | Spec | `gate_spec = true` | Sévi approves Spec artifact |
| 4 | Tasks | `gate_tasks = true` | Sévi approves Tasks artifact |
| 5 | Build | `gate_build = true` | All tasks checked |
| 6 | Deploy | `gate_deploy = true` | Deploy check passes |

**Rules:**
- `stage` only ever increases (no backward movement in v1). **[hypothèse — à confirmer: re-generation is allowed without rolling back stage; it creates a new artifact but does not unset the gate unless explicitly unapproved]**
- A gate can only be set to `true` by its specific action; it cannot be set directly via `PATCH /api/projects/[id]`.
- Re-generating an artifact type that already has an approved artifact is allowed. The new artifact is saved but `approved = false`. The existing approved artifact remains approved until Sévi explicitly re-approves the new one (which clears the old approval via the partial unique index).
- Deleting (archiving) a project does not affect any other project's state.

### 4.2 Task Parsing

When a `tasks` artifact is approved:
1. The server parses the markdown content to extract checkboxes.
2. Expected format: `- [ ] Task label` or `- [x] Task label` within optional `## Section` headings.
3. Existing tasks for the project are **deleted** and replaced with the newly parsed set. `checked` state is **not** preserved across re-parses. **[hypothèse — à confirmer: simpler to wipe and re-parse; preserving state across re-generations would require fuzzy matching]**
4. If parsing yields 0 tasks, return `400 EMPTY_TASK_LIST` and do not approve the artifact.

### 4.3 Streaming Edge Cases

| Scenario | Behavior |
|---|---|
| User closes browser tab mid-stream | Next.js detects `request.signal.aborted`; closes FastAPI connection; marks run as `cancelled`; does not save partial artifact |
| FastAPI returns HTTP error (non-200) | Next.js sends `error` SSE event; marks run as `failed` |
| FastAPI stream stalls > 30 seconds | Next.js AbortController fires; sends `error` SSE event with `STREAM_TIMEOUT`; marks run as `failed` |
| User triggers generation while one is in-progress | Returns `409 GENERATION_IN_PROGRESS`; front-end shows "Generation already running — cancel first?" |
| LLM API returns empty content | Marked as `failed`; error event sent; no artifact saved |
| Vercel function timeout (default 30s on hobby, 60s on pro) | **[hypothèse — à confirmer: use Vercel Pro for 60s limit, or implement chunked keep-alive pings every 15s to prevent timeout on free tier]** |

### 4.4 Deploy Check Edge Cases

| Scenario | Behavior |
|---|---|
| `gate_build = false` when deploy check triggered | `400 BUILD_NOT_COMPLETE`: "All tasks must be checked before running the deploy check." |
| FastAPI unreachable | `502 FASTAPI_UNAVAILABLE`; result not persisted; display actionable error |
| Deploy check fails | `gate_deploy` stays `false`; `stage` stays at 5; failure detail shown per-check |
| Deploy check passes on retry after prior failure | `gate_deploy` set to `true`; `stage` advances to 6; previous failure result overwritten |

### 4.5 i18n Edge Cases

- **UI language ≠ prompt language**: The language toggle changes `profiles.ui_language` only. `projects.prompt_language` is set per-project and sent to FastAPI as the generation language.
- **Language switch during streaming**: Language toggle is disabled during an active stream (UI enforced).
- **First visit with no stored preference**: defaults to `en`.
- **Cookie deleted / new device**: falls back to `en`; user must re-select. **[hypothèse — à confirmer: syncing `ui_language` from `profiles` on login is sufficient]**

### 4.6 Public Demo Access

- The public demo project is identified by `is_demo = true` in the DB.
- Only one demo project should exist at a time. **[hypothèse — à confirmer]** If multiple exist, the public route returns the most recently updated one.
- A dedicated demo project ID is stored in env var `NEXT_PUBLIC_DEMO_PROJECT_ID` to make the `/demo` route deterministic.
- No write operations are available to anon users — enforced at both RLS level and API route level (route handlers explicitly check auth before any mutation).

### 4.7 Archiving vs. Deletion

- **Archive** (`status = 'archived'`): project disappears from active list but is readable by owner. All data preserved.
- **Delete** (`status = 'deleted'`): soft-delete. Project not returned by any query (RLS filter: `status != 'deleted'`). No hard-delete in v1.
- Archived/deleted projects are excluded from metrics counts of "active" projects but their `generation_runs` are included in totals.

---

## 5. Front-End Components

### 5.1 Design System Tokens

```ts
// design-system/tokens.ts
export const tokens = {
  colors: {
    black: '#0A0A0A',
    white: '#F5F5F5',
    coral: '#FF6B55',          // accent ~10% usage
    coralHover: '#E55A44',
    gray100: '#1A1A1A',        // card backgrounds
    gray200: '#2A2A2A',        // borders
    gray400: '#666666',        // muted text
    error: '#FF4444',
    success: '#44FF88',
  },
  fonts: {
    heading: "'Montserrat', sans-serif",
    body: "'Inter', sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
  fontSizes: { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem', '3xl': '2rem' },
  spacing: { 1: '4px', 2: '8px', 3: '12px', 4: '16px', 6: '24px', 8: '32px', 12: '48px', 16: '64px' },
  radii: { none: '0', sm: '2px', md: '4px' },  // brutalist: minimal radius
  shadows: { none: 'none', hard: '4px 4px 0px #FF6B55' },  // brutalist hard shadow with coral
}
```

### 5.2 Screen Map

```
/login                     — LoginPage
/dashboard                 — DashboardPage
/projects/[id]             — ProjectPage
  /projects/[id]/prd       — ArtifactPage (type=prd)
  /projects/[id]/spec      — ArtifactPage (type=spec)
  /projects/[id]/tasks     — TasksPage
  /projects/[id]/metrics   — ProjectMetricsPage
/metrics                   — GlobalMetricsPage
/demo/[id]?                — DemoPage (public, read-only)
/demo                      — redirects to /demo/[DEMO_PROJECT_ID]
```

### 5.3 Component List

#### Layout Components (Design System)

| Component | Source | Description |
|---|---|---|
| `<RootLayout>` | New | Global shell: top nav, language toggle, user menu |
| `<TopNav>` | New | Logo + nav links + `<LanguageToggle>` + auth state |
| `<LanguageToggle>` | New | EN/FR/ES pills — calls `PATCH /api/profile`, updates `next-intl` context |
| `<Button>` | Design System | Brutalist — black bg, white text, hard coral shadow on hover. Variants: `primary`, `ghost`, `danger` |
| `<Input>` | Design System | Black border, no radius, Inter font |
| `<Card>` | Design System | Black bg, 1px white border, hard shadow option |
| `<Badge>` | Design System | Stage/status badge. Colors: active=white, completed=coral, pending=gray |
| `<Modal>` | Design System | Confirm dialogs — keyboard trap, focus management |
| `<Spinner>` | Design System | Minimal pulse animation in coral |
| `<Toast>` | Design System | Bottom-right toast for success/error feedback |

#### Page Components

**`LoginPage`** (`/login`)
- Data: none (calls Supabase Auth directly)
- Components: `<Input>` (email, password), `<Button>` (sign in)
- Redirects to `/dashboard` on success

**`DashboardPage`** (`/dashboard`)
- Data: `GET /api/projects`
- Components:
  - `<ProjectList>`: grid of `<ProjectCard>` + "New Project" `<Button>`
  - `<ProjectCard>`: name, description truncated, stage badge, `<MiniPipeline>` (horizontal stage dots)
  - `<NewProjectModal>`: name input, description textarea, prompt_language select, confirm CTA
  - `<EmptyState>`: shown when no projects exist

**`ProjectPage`** (`/projects/[id]`)
- Data: `GET /api/projects/[id]`
- Components:
  - `<ProjectHeader>`: project name, edit-in-place for name/description
  - `<PipelineView>`: 6-stage horizontal stepper (see below)
  - `<StagePanel>`: context-sensitive panel based on current stage (see below)
  - `<SideMetrics>`: mini stats sidebar (tasks done, last generation)

**`<PipelineView>`**
- Displays 6 named stages as horizontal nodes connected by lines.
- Stage states: `completed` (coral fill + checkmark), `current` (white border + pulse), `pending` (gray, no border)
- Gate visualization: a small lock icon between stages — unlocked (coral) when gate is passed, locked (gray) when not.
- Clicking a completed stage scrolls to its artifact (does not navigate away in v1).

**`<StagePanel>`** — context-sensitive content:

| Stage | Panel Content |
|---|---|
| 1 — Brief | Project name, description display. "Generate PRD" `<Button>` |
| 2 — PRD | `<ArtifactDisplay>` (PRD content) + "Approve & Continue" + "Regenerate" |
| 3 — Spec | "Generate Spec" `<Button>` → then same artifact display + approve |
| 4 — Tasks | "Generate Tasks" → artifact display + approve → triggers task parse |
| 5 — Build | `<TaskChecklist>` + "Run Deploy Check" `<Button>` (enabled when `gate_build=true`) |
| 6 — Deploy | Completion state, summary, share public URL |

**`<StreamingOutput>`**
- Renders markdown progressively as SSE chunks arrive.
- Uses `useStreamingGeneration()` hook (see below).
- Shows animated blinking cursor (`▋`) at end of stream while active.
- `aria-live="polite"` with debounced announcement (every 2s) for screen readers.
- "Cancel" `<Button>` visible during streaming — calls `DELETE /api/generate/[runId]`.
- On error: shows `<ErrorBanner>` with error message + "Retry" button.

**`ArtifactPage`** (`/projects/[id]/prd`, `/spec`)
- Data: latest approved artifact from `GET /api/projects/[id]`
- Components:
  - `<MarkdownRenderer>`: renders artifact content with JetBrains Mono for code blocks
  - `<ArtifactMeta>`: model, prompt_lang, generated_at, approved_at

**`TasksPage`** (`/projects/[id]/tasks`)
- Data: `GET /api/projects/[id]/tasks`
- Components:
  - `<TaskProgress>`: "14 / 20 done" + progress bar (coral fill)
  - `<TaskSection>`: groups tasks by `section` heading
  - `<TaskItem>`: checkbox + label. `PATCH /api/tasks/[taskId]` on toggle. Optimistic UI update.
  - Disabled (grayed) when `gate_tasks = false`.

**`GlobalMetricsPage`** (`/metrics`)
- Data: `GET /api/metrics`
- Components:
  - `<MetricCard>`: single-number stat with label
  - `<StageDistributionChart>`: horizontal bar chart (CSS-only, no chart library) **[hypothèse — à confirmer: CSS bars are sufficient for v1 brutalist aesthetic]**
  - `<ExportButton>`: copy-to-clipboard as CSV (client-side, from current metrics data)
  - Auto-refreshes every 30s via `setInterval` + `router.refresh()`.

**`DemoPage`** (`/demo/[id]`)
- Data: `GET /api/public/projects/[id]`
- Same layout as `ProjectPage` but:
  - All action buttons hidden (generate, approve, cancel, deploy check, task toggle).
  - `<DemoBanner>`: sticky top banner "You're viewing a live root_ project — read-only demo".
  - No `<TopNav>` auth elements; minimal nav with root_ logo only.

### 5.4 Custom Hooks

```ts
// hooks/useStreamingGeneration.ts
// Manages EventSource lifecycle, chunk accumulation, run ID tracking, cancel
function useStreamingGeneration(projectId: string, type: 'prd' | 'spec' | 'tasks') {
  // Returns: { start, cancel, content, status, runId, error }
}

// hooks/useTaskList.ts
// Manages optimistic task toggle with rollback on error
function useTaskList(projectId: string) {
  // Returns: { tasks, stats, toggleTask, isLoading }
}

// hooks/useI18n.ts
// Wraps next-intl, exposes changeLanguage() that calls PATCH /api/profile + updates cookie
function useI18n() {
  // Returns: { locale, changeLanguage, t }
}
```

### 5.5 i18n File Structure

```
messages/
  en.json
  fr.json
  es.json
```

All UI strings externalized. Keys follow `screen.component.element` convention, e.g.:
```json
{
  "dashboard.newProject.button": "New project",
  "pipeline.stages.1": "Brief",
  "pipeline.stages.2": "PRD",
  "generation.streaming.cancel": "Cancel generation",
  "tasks.progress": "{checked} / {total} done"
}
```

---

## 6. Task Breakdown

Dependencies are noted where a task must wait for another.

```
[ ] T01 — Initialize Next.js 15 project with App Router, TypeScript, Tailwind CSS; configure ESLint and Prettier; push to GitHub repo.

[ ] T02 — Set up Supabase project: create DB, configure Auth (email+password), get project URL + anon key + service role key.

[ ] T03 — Write and run Supabase migrations for all 5 tables (profiles, projects, artifacts, tasks, generation_runs) including indexes and triggers. (depends: T02)

[ ] T04 — Write and apply all RLS policies for all tables. Verify with Supabase Studio that anon key cannot read non-demo projects. (depends: T03)

[ ] T05 — Configure @supabase/ssr in Next.js: middleware.ts for session validation, server client helper, browser client helper. (depends: T01, T02)

[ ] T06 — Implement design system tokens (colors, fonts, spacing, radii, shadows) as Tailwind config extension and CSS variables. (depends: T01)

[ ] T07 — Build design system primitives: <Button>, <Input>, <Card>, <Badge>, <Modal>, <Spinner>, <Toast>. (depends: T06)

[ ] T08 — Build <TopNav> and <RootLayout> with <LanguageToggle> UI (non-functional toggle — just renders EN/FR/ES). (depends: T07)

[ ] T09 — Implement next-intl: install, configure middleware, create en.json/fr.json/es.json with all keys, wrap app in provider. (depends: T08)

[ ] T10 — Wire <LanguageToggle> to next-intl locale switch + localStorage persistence + PATCH /api/profile (stub the route first). (depends: T09)

[ ] T11 — Implement /login page with Supabase Auth email+password sign-in. Redirect to /dashboard on success. Handle errors. (depends: T05, T07)

[ ] T12 — Implement GET /api/projects route handler (list, pagination, status filter). (depends: T05)

[ ] T13 — Implement POST /api/projects route handler with validation. (depends: T05)

[ ] T14 — Build <DashboardPage>: project list fetch, <ProjectCard>, <NewProjectModal>, <EmptyState>. (depends: T07, T12, T13)

[ ] T15 —
