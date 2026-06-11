# Design — root-ui: The Web Front-End for root_

**Project:** root-ui
**Client:** root_ (internal — Sévi)
**Date:** 2026-06-11
**Status:** Draft — awaiting client sign-off before build

---

## 1. Design Principles

**1. Brutal clarity over decoration**
No gradients, no shadows, no rounded softness for its own sake. Every visual element earns its place by carrying information. Inspired by CLI aesthetics and the Linear/Vercel school of dashboard design: if it doesn't communicate state, remove it.

**2. State is always visible**
The pipeline is the product. At any moment — for Sévi at work or a prospect watching a demo — the current stage, what's done, and what's blocked must be readable in under three seconds. Validation gates are explicit, never implied.

**3. The terminal is a metaphor, not a costume**
JetBrains Mono is used for outputs, statuses, and generated content — not for decorative effect. When the AI writes, it should feel like watching a machine think. When Sévi acts, the interface responds in human Inter.

**4. Coral is a signal, not a style**
`#FF6B6B` appears at ≤10% of any screen's visual weight. It means: action available, generation active, or attention required. Never use coral for passive decoration.

**5. i18n is a first-class constraint**
Every string is a key. Labels are written for the longest translation (typically French or Spanish). No fixed-width text containers that will break when EN becomes ES.

---

## 2. Design Tokens

### Colors

| Token | Hex | Usage | Ratio target |
|---|---|---|---|
| `color-bg` | `#1A1A1A` | Page background, primary surface | ~80% |
| `color-surface` | `#242424` | Cards, panels, sidebar background | ~10% |
| `color-border` | `#333333` | Dividers, input borders, table rules | — |
| `color-text-primary` | `#FFFFFF` | Headings, body copy, labels | — |
| `color-text-secondary` | `#888888` | Metadata, timestamps, helper text | — |
| `color-text-disabled` | `#444444` | Disabled controls, pending stages | — |
| `color-accent` | `#FF6B6B` | Primary CTA, active state, streaming cursor, coral highlight | ≤10% |
| `color-accent-hover` | `#E85555` | Hover state on coral CTAs | — |
| `color-success` | `#4ADE80` | Stage complete, gate passed, deploy pass | — |
| `color-warning` | `#FACC15` | Partial state, checklist incomplete | — |
| `color-error` | `#F87171` | Stream failure, deploy fail, error messages | — |
| `color-stage-done` | `#4ADE80` | Completed pipeline stage dot/bar | — |
| `color-stage-active` | `#FF6B6B` | Current pipeline stage | — |
| `color-stage-pending` | `#444444` | Future pipeline stages | — |

> Contrast check: `#FFFFFF` on `#1A1A1A` = 16.1:1 ✓ AAA. `#FF6B6B` on `#1A1A1A` = 4.6:1 ✓ AA for large text / UI components. `#888888` on `#1A1A1A` = 4.5:1 ✓ AA.

---

### Typography

| Token | Font | Weight | Size | Line-height | Usage |
|---|---|---|---|---|---|
| `type-display-xl` | Montserrat | 700 | 32px | 1.2 | Page titles, project name hero |
| `type-display-lg` | Montserrat | 700 | 24px | 1.25 | Section headings, panel titles |
| `type-display-md` | Montserrat | 600 | 18px | 1.3 | Card titles, stage labels |
| `type-body-md` | Inter | 400 | 15px | 1.6 | Body copy, descriptions, form labels |
| `type-body-sm` | Inter | 400 | 13px | 1.5 | Metadata, timestamps, helper text |
| `type-body-strong` | Inter | 600 | 15px | 1.6 | Emphasis, CTA labels, status badges |
| `type-code-md` | JetBrains Mono | 400 | 14px | 1.7 | Generated content output, deploy check results, stage status codes |
| `type-code-sm` | JetBrains Mono | 400 | 12px | 1.6 | Inline code, timestamps in terminal-style logs |
| `type-label` | Inter | 500 | 11px | 1.4 | ALL-CAPS nav labels, badge text |

---

### Spacing Scale

| Token | Value | Usage |
|---|---|---|
| `space-1` | 4px | Icon gap, micro padding |
| `space-2` | 8px | Inner padding small, inline gap |
| `space-3` | 12px | Input padding, compact row gap |
| `space-4` | 16px | Card padding, list item gap |
| `space-5` | 24px | Section gap, panel padding |
| `space-6` | 32px | Major section separation |
| `space-7` | 48px | Page-level vertical rhythm |
| `space-8` | 64px | Hero area, empty state illustration zone |

---

### Border Radius

| Token | Value | Usage |
|---|---|---|
| `radius-none` | 0px | Most containers — brutalist default |
| `radius-sm` | 2px | Badges, tags, checkboxes |
| `radius-md` | 4px | Buttons, inputs, toasts **[proposition à valider — use 0px for fully brutalist consistency]** |

---

### Elevation / Depth

No box shadows. Depth is communicated through:
- **Border:** `1px solid color-border` separates surfaces
- **Background contrast:** `color-surface` (#242424) on `color-bg` (#1A1A1A) creates hierarchy
- **Left-border accent:** `4px solid color-accent` on active/selected states

---

### Other Tokens

| Token | Value | Usage |
|---|---|---|
| `transition-fast` | 120ms ease | Hover states, checkbox toggle |
| `transition-std` | 200ms ease | Panel open/close, tab switch |
| `border-width` | 1px | Standard border |
| `border-accent-width` | 4px | Active selection, focus ring |
| `focus-ring` | `2px solid #FF6B6B, offset 2px` | Keyboard focus on all interactive elements |
| `sidebar-width` | 240px | Fixed left sidebar |
| `content-max-width` | 1200px | Max content column width |
| `panel-min-width` | 480px | Generation output panel minimum |

---

## 3. User Journey Flows

### Flow 1 — Authentication (US-01 gate)

```
[/login] Login screen
  → Sévi enters credentials (Supabase Auth)
  → [POST /auth] Success
    → Redirect to [/dashboard] Project Dashboard
  → [POST /auth] Failure
    → Stay on [/login], show inline error "Invalid credentials"
```

---

### Flow 2 — Project Management (US-01)

```
[/dashboard] Project Dashboard (list)
  → Click "New project" CTA
    → [Modal: New Project] Enter name + description
      → Submit valid form
        → [POST /projects] Success → Modal closes → new project card appears at top of list (Stage 1 — Brief)
      → Submit empty name
        → Inline validation error "Project name required"
      → Dismiss modal
        → No change to project list
  → Click existing project card
    → Navigate to [/projects/:id] Project View
  → Click "Archive" on project card (kebab menu)
    → Confirmation inline toast: "Archive [project name]?" + Confirm / Cancel
      → Confirm → project moves to Archived section (or disappears from active list)
      → Cancel → no change
  → Click "Delete" on project card (kebab menu)
    → Confirmation modal: "Delete [project name]? This cannot be undone."
      → Confirm → project removed from list
      → Cancel → modal closes, no change
  → Load error (API timeout)
    → Empty state with error message + "Retry" button
```

---

### Flow 3 — Pipeline Navigation & Validation Gates (US-02)

```
[/projects/:id] Project View — Pipeline tab
  → Pipeline bar visible: Stage 1 (active) → 2 → 3 → 4 → 5 → 6 (all pending)
  → Click completed stage segment
    → Scrolls content panel to that stage's history/output
  → Click pending stage segment (not yet unlocked)
    → No navigation — tooltip: "Complete [current stage] first"
  → Validation gate passed (e.g., PRD approved)
    → Stage 1 dot turns green (color-stage-done)
    → Stage 2 becomes active (color-stage-active)
    → Gate checkpoint icon shows checkmark
```

---

### Flow 4 — AI Generation in Streaming (US-03)

```
[/projects/:id → Stage N panel] (PRD / Spec / Tasks)
  → Click "Generate [artifact]" (coral CTA)
    → Button disables, label changes to "Generating…"
    → Output panel clears previous draft, shows streaming cursor (blinking coral underscore)
    → Tokens stream in via SSE into output panel (JetBrains Mono)
    → [Stream complete]
      → Streaming cursor disappears
      → "Approve" and "Regenerate" actions appear below output
      → Click "Approve"
        → [PATCH /projects/:id/stage] → stage advances, gate marked passed
      → Click "Regenerate"
        → Output clears, generation restarts from same state
    → [Stream error / timeout]
      → Streaming stops
      → Error banner appears above output: "Generation failed — [reason]. No output was saved."
      → "Retry" CTA available
      → Partial output discarded (not saved)
    → Click "Cancel" (available during active stream)
      → [DELETE /generations/:id] → stream aborted
      → Output panel shows: "Generation cancelled."
      → "Generate [artifact]" button re-enables
```

---

### Flow 5 — Spec-Driven Checklist (US-04)

```
[/projects/:id → Build tab] Checklist view
  → Tasks loaded from tasks.md (parsed into checkable items)
  → Click checkbox on unchecked item
    → [PATCH /tasks/:id] → checkbox updates immediately (optimistic UI)
    → Progress counter updates: "N / Total done"
    → If all checked: "Mark build complete" CTA activates (was disabled)
  → Click checkbox on checked item (uncheck)
    → [PATCH /tasks/:id] → unchecked, progress counter decrements
    → If "Mark build complete" was active, it disables again
  → Click "Mark build complete" (all checked)
    → Confirmation toast: "Mark this project build-complete?" + Confirm
      → Confirm → project advances to Stage 5 (Deploy Check unlocked)
  → [PATCH /tasks/:id] API error
    → Checkbox reverts to previous state (optimistic rollback)
    → Toast error: "Couldn't save — check your connection"
  → Empty state (tasks.md not yet generated)
    → Message: "No tasks yet. Generate the task list first." + link to Stage 3
```

---

### Flow 6 — Deploy Check (US-05)

```
[/projects/:id → Deploy tab] (unlocked at Stage 5)
  → "Run deploy check" CTA visible (coral)
  → Last result panel: "No check run yet" (empty state)
  → Click "Run deploy check"
    → Button disables, shows "Running…" with spinner
    → [POST /projects/:id/deploy-check] — runs deploy_check module
    → [Result: PASS]
      → Result panel: large "✓ PASS" in green, timestamp, detail log in JetBrains Mono
      → "Advance to Stage 6" CTA activates
    → [Result: FAIL]
      → Result panel: large "✗ FAIL" in red, timestamp, itemized failure reasons in JetBrains Mono
      → "Advance to Stage 6" CTA stays disabled
      → Each failure item has actionable description
    → [API error]
      → Error banner: "Deploy check could not run — [reason]"
      → "Retry" available
  → "Advance to Stage 6" (only if PASS)
    → [PATCH /projects/:id/stage] → project marked Stage 6 — Ready to deploy
```

---

### Flow 7 — Metrics Dashboard (US-06)

```
[/metrics] Global Metrics view
  → Page loads with current data (auto-refreshed every 30s via polling)
  → Shows: projects by stage (bar or count), tasks completed vs total (across all projects), generation runs triggered
  → Click "Copy metrics" button
    → Data copied to clipboard as plain text / CSV
    → Toast: "Metrics copied to clipboard"
  → [API error on load]
    → Skeleton loaders replaced with: "Couldn't load metrics — [reason]" + Retry
```

---

### Flow 8 — Language Toggle (US-07)

```
[Any screen] — Language toggle in header (EN / FR / ES)
  → Click language code
    → All UI strings swap immediately (no reload)
    → Selection persists to localStorage
    → Active language segment is underlined / coral
  → AI content language is controlled separately via [Project Settings → Output language]
    → Does NOT change when UI language changes
```

---

### Flow 9 — Public Demo Access (US-08)

```
[/demo] Public read-only URL (unauthenticated)
  → Shows demo project in pipeline view (read-only)
  → All write CTAs hidden (not disabled — fully absent)
  → "Sign in" link in header for Sévi
  → Attempt to call write API route without auth token
    → 401 returned by FastAPI, client shows nothing (route unreachable from public UI)
```

---

## 4. Inventory of Screens

| Screen | Route | Objective | User Stories Covered | Priority |
|---|---|---|---|---|
| Login | `/login` | Sévi authenticates to access write features | Gate for US-01 through US-07 | P0 |
| Project Dashboard | `/dashboard` | List, create, archive/delete projects; entry point for all work | US-01, US-02 (stage indicator in card) | P0 |
| New Project Modal | (overlay on `/dashboard`) | Create a new project with name + description | US-01 | P0 |
| Project View — Pipeline | `/projects/:id` | Full pipeline visualization, stage navigation, validation gates | US-02, US-03, US-04, US-05 | P0 |
| Project View — Brief Tab | `/projects/:id?tab=brief` | Review brief inputs before first generation | US-02, US-03 | P0 |
| Project View — PRD Tab | `/projects/:id?tab=prd` | Stream PRD generation, review, approve | US-02, US-03 | P0 |
| Project View — Spec Tab | `/projects/:id?tab=spec` | Stream Spec generation, review, approve | US-02, US-03 | P0 |
| Project View — Tasks Tab | `/projects/:id?tab=tasks` | Stream task list generation; render spec-driven checklist | US-02, US-03, US-04 | P0 |
| Project View — Deploy Tab | `/projects/:id?tab=deploy` | Run deploy check, view results, advance to Stage 6 | US-05 | P0 |
| Metrics Dashboard | `/metrics` | Global and per-project metrics, export | US-06 | P1 |
| Public Demo View | `/demo` | Read-only pipeline view for unauthenticated visitors | US-08 | P0 |
| 404 / Error | `/404` | Handle unknown routes gracefully | — | P1 |

> **All scope IN items from the PRD are covered.** Sandbox/interactive demo mode (US-08 variant) is deferred per open questions — no screen designed for it here.

---

## 5. Wireframes by Screen

---

### Screen 01 — Login `/login`

**Layout**

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                                                         │
│              root_                                      │
│              [Montserrat Bold, 32px, white]             │
│                                                         │
│              ┌──────────────────────────────┐           │
│              │  Email                       │           │
│              └──────────────────────────────┘           │
│              ┌──────────────────────────────┐           │
│              │  Password                    │           │
│              └──────────────────────────────┘           │
│                                                         │
│              [Inline error message — if any]            │
│                                                         │
│              ┌──────────────────────────────┐           │
│              │  Sign in          [coral bg] │           │
│              └──────────────────────────────┘           │
│                                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
  bg: color-bg (#1A1A1A), content centered, max-width 400px
```

**Components**
- Logo wordmark `root_` — Montserrat Bold 32px white
- `InputField` (email, password) — 1px border `color-border`, focus ring coral
- `Button` primary (coral fill, white label, full-width in this context)
- Inline error text — `type-body-sm`, `color-error`

**States**
- **Nominal:** empty form, sign in button enabled
- **Loading:** button label → "Signing in…", spinner icon left of label, button disabled
- **Error:** inline message below password field: "Incorrect email or password." Border on password field turns `color-error`
- **Empty:** not applicable (form always shown)

**Responsive:** centered card does not change on tablet; font sizes unchanged.

---

### Screen 02 — Project Dashboard `/dashboard`

**Layout**

```
┌──────────────────────────────────────────────────────────────────┐
│ HEADER                                                           │
│ root_          [EN] [FR] [ES]          Metrics    [avatar/logout]│
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Projects                         [+ New project]               │
│  ──────────────────────────────────────────────────             │
│                                                                  │
│  ┌─────────────────────────────────────────────────┐            │
│  │ ● client-name-alpha          Stage 2 — PRD      │            │
│  │   One-line description       Last updated 2h ago│  [···]     │
│  │   ████████░░░░░░░░░░  PRD > Spec > Tasks >...   │            │
│  └─────────────────────────────────────────────────┘            │
│  ┌─────────────────────────────────────────────────┐            │
│  │ ● client-name-beta           Stage 4 — Build    │            │
│  │   One-line description       Last updated 1d ago│  [···]     │
│  │   ████████████████░░  Brief > PRD > Spec > Tasks│            │
│  └─────────────────────────────────────────────────┘            │
│  ┌─────────────────────────────────────────────────┐            │
│  │ ○ client-name-gamma          Stage 1 — Brief    │            │
│  │   One-line description       Last updated 3d ago│  [···]     │
│  │   ░░░░░░░░░░░░░░░░░░  Brief > ...               │            │
│  └─────────────────────────────────────────────────┘            │
│                                                                  │
│  ── ARCHIVED ──────────────────────────────────────[show/hide]  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Header breakdown**
- Left: `root_` wordmark (Montserrat Bold, 20px, white) — links to `/dashboard`
- Center-right: language toggle `EN / FR / ES` — active language underlined + coral
- Right: `Metrics` text link → `/metrics` | User avatar or initials circle + logout

**Project Card anatomy**
- Stage indicator dot: coral (active) or green (stage 6 complete)
- Project name: `type-display-md` white
- Stage label: `type-body-sm` `color-text-secondary`
- Description: `type-body-sm` `color-text-secondary`, single line truncated with ellipsis
- Last updated: `type-code-sm` `color-text-secondary`
- Mini pipeline progress bar: 6 segments, filled green = done, coral = current, dark = pending
- `[···]` kebab menu: Archive, Delete

**Components**
- `Header` — fixed top, `color-surface` background, 1px border-bottom
- `ProjectCard` — `color-surface` bg, `1px border color-border`, no shadow, hover: left-border 4px coral
- `MiniPipelineBar` — 6 segments, 8px tall, 0px radius
- `Button` primary — "+ New project" — coral bg
- `KebabMenu` — 3-dot icon, dropdown with Archive / Delete
- `LanguageToggle` — three text buttons `EN / FR / ES`, active underlined coral

**States**
- **Nominal:** 1+ projects shown, paginated if needed (or scrollable list)
- **Empty (no projects):** centered empty state — `root_` in faint monospace, text: "No projects yet. Create your first one.", "+ New project" CTA
- **Loading:** 3 skeleton card placeholders (shimmer via opacity animation on color-surface)
- **Error:** "Couldn't load projects." + "Retry" button, no skeletons

**Responsive (tablet ~768px):** cards go to single column, header collapses language toggle below brand row.

---

### Screen 03 — New Project Modal (overlay on `/dashboard`)

**Layout**

```
┌────────────────────────────────────────────────────┐
│ New project                                   [✕]  │
│ ────────────────────────────────────────────────── │
│                                                    │
│  Project name *                                    │
│  ┌────────────────────────────────────────────┐    │
│  │                                            │    │
│  └────────────────────────────────────────────┘    │
│                                                    │
│  Description (optional)                            │
│  ┌────────────────────────────────────────────┐    │
│  │                                            │    │
│  └────────────────────────────────────────────┘    │
│                                                    │
│  [Cancel]                        [Create project]  │
│                                                    │
└────────────────────────────────────────────────────┘
  Width: 480px, centered. Backdrop: rgba(0,0,0,0.7)
```

**Components**
- `Modal` shell — `color-surface` bg, `1px border color-border`
- `InputField` — name (required), description (optional, textarea 2 rows)
- `Button` secondary (ghost, white border) — Cancel
- `Button` primary (coral) — Create project
- `CloseIcon` [✕] top right

**States**
- **Nominal:** both fields empty, Create project enabled (name validation on submit)
- **Empty name submitted:** name field border turns `color-error`, inline message "Project name is required"
- **Loading (creating):** Create button → "Creating…" + spinner, disabled
- **Error (API):** toast below modal: "Couldn't create project — try again"

---

### Screen 04 — Project View `/projects/:id`

This is the primary work surface. It uses a **two-column layout**: left sidebar (pipeline nav + meta) + right content panel (tab content).

**Layout**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ HEADER (same as dashboard)                                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ← Back to projects   client-name-alpha           [···] [Archive]        │
│ ─────────────────────────────────────────────────────────────────────── │
│                                                                         │
│  LEFT SIDEBAR (240px)          │  RIGHT CONTENT PANEL (flex)            │
│  ──────────────────────────    │  ──────────────────────────────────    │
│                                │                                        │
│  PIPELINE                      │  [Tab content — see tabs below]        │
│                                │                                        │
│  ① Brief          ✓ done       │                                        │
│  ② PRD            ✓ done       │                                        │
│  ③ Spec           ◉ active     │                                        │
│  ④ Tasks          ○ pending    │                                        │
│  ⑤ Build          ○ locked     │                                        │
│  ⑥ Deploy         ○ locked     │                                        │
│                                │                                        │
│  ──────────────                │                                        │
│  NAVIGATION                    │                                        │
│  Brief                         │                                        │
│  PRD                           │                                        │
│  Spec                          │                                        │
│  Tasks                         │                                        │
│  Deploy                        │                                        │
│                                │                                        │
│  ──────────────                │                                        │
│  Output language               │                                        │
│  [EN ▾] dropdown               │                                        │
│                                │                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

**Left Sidebar — Pipeline stages**

Each stage row:
- Stage number (circle): green filled (done) | coral filled (active) | dark border (pending) | lock icon (locked)
- Stage name: `type-body-strong` (active) | `type-body-md color-text-secondary` (others)
- Gate indicator: `✓` in `color-success` when validation gate passed

**Left Sidebar — Nav links**

Clicking a nav link loads the corresponding tab in the right panel. Active link: left-border 4px coral, label in white. Inactive: `color-text-secondary`.

**Left Sidebar — Output language**

Dropdown `[EN ▾]` / FR / ES — controls the language of AI-generated content for this project, persisted on the project record. Separate from UI language toggle.

**Components**
- `ProjectHeader` — back arrow, project name (display-lg), kebab with Archive/Delete
- `PipelineSidebar` — stage list, nav links, output language selector
- `TabContent` — right panel swaps content based on nav selection

**States**
- **Nominal:** stages shown with correct state per project data
- **Loading (initial):** sidebar shows skeleton placeholders for stage list
- **Error:** "Couldn't load project." + Retry

---

### Screen 04a — Project View: Brief Tab

**Right panel content**

```
  Brief
  ────────────────────────────────────────────────────────

  Project name
  client-name-alpha

  Description
  One-line description of the client project.

  Created
  2026-06-11 — 14:23 UTC

  ┌────────────────────────────────────────────────┐
  │ Generate PRD →                    [coral bg]   │
  └────────────────────────────────────────────────┘

  Note: Generating PRD will advance this project to Stage 2.
```

**Components**
- `FieldDisplay` rows — label (`type-body-sm color-text-secondary`) + value (`type-body-md white`)
- `Button` primary — "Generate PRD →"
- Helper note — `type-body-sm color-text-secondary`

**States**
- **Nominal:** brief data shown, Generate PRD enabled
- **PRD already generated:** button label → "Regenerate PRD" (with warning note: "This will replace the existing PRD")
- **Loading:** brief data shows skeletons while fetching
- **Error:** "Couldn't load brief data." + Retry

---

### Screen 04b — Project View: PRD Tab

**Right panel content**

```
  PRD                           [Regenerate]  [Approve PRD ✓]
  ────────────────────────────────────────────────────────────

  ┌──────────────────────────────────────────────────────────┐
  │                                                          │
  │  [Generated PRD content in JetBrains Mono, 14px]        │
  │  # PRD — client-name-alpha                               │
  │                                                          │
  │  ## 1. Context & Problem                                 │
  │  ...                                                     │
  │                                                          │
  │  [streaming cursor: ▌ blinking coral — during gen]       │
  │                                                          │
  └──────────────────────────────────────────────────────────┘

  Generated: 2026-06-11 — 14:31 UTC          [Copy to clipboard]
```

**During generation — streaming state:**

```
  PRD                                         [Cancel ✕]
  ────────────────────────────────────────────────────────────

  Generating PRD…

  ┌──────────────────────────────────────────────────────────┐
  │  # PRD — client-name-alpha                               │
  │                                                          │
  │  ## 1. Context & Problem                                 │
  │  root_ is an AI-native studio whose▌                    │
  │                                                          │
  └──────────────────────────────────────────────────────────┘
```

**Components**
- `GenerationPanel` — scrollable container, `color-surface` bg, `1px border color-border`, font `type-code-md`
- `StreamingCursor` — blinking `▌` in `color-accent`, visible only during active stream
- `Button` primary — "Approve PRD ✓" (disabled during generation, enabled post-generation)
- `Button` ghost — "Regenerate" (enabled post-generation)
- `Button` ghost danger — "Cancel ✕" (enabled only during active generation)
- `CopyButton` — clipboard icon + label, bottom-right of panel
- Metadata row — timestamp, `type-code-sm color-text-secondary`

**States**
- **Empty (PRD not yet generated):** panel shows "No PRD generated yet." message, only "Generate PRD →" CTA visible (directs to Brief tab or same panel)
- **Generating (streaming):** cursor visible, Cancel available, Approve/Regenerate hidden
- **Nominal (generated, not approved):** full content visible, Approve + Regenerate enabled
- **Approved:** "Approve PRD ✓" button turns green with checkmark, gate in sidebar shows ✓, button label → "PRD approved ✓" (disabled — already approved), Regenerate still available
- **Error:** error banner above panel: "Generation failed — [reason]. No output was saved." + Retry CTA. Partial output cleared.

> Same panel pattern (04b) applies to **Spec Tab (04c)** and **Tasks Tab (04d generation view)**. Only the artifact name, approval labels, and stage gating differ.

---

### Screen 04c — Project View: Spec Tab

Identical structure to 04b.
- Title: "Spec"
- Approval CTA: "Approve Spec ✓"
- Advances project to Stage 4 on approval

---

### Screen 04d — Project View: Tasks Tab

**Two sub-states within this tab:** generation view (if tasks.md not yet built) and checklist view (once tasks are generated).

**Sub-state 1: Generation**

Same panel structure as 04b.
- Title: "Tasks"
- CTA: "Generate tasks →" (no "Approve" — task generation directly populates the checklist on completion, no separate approval gate)
- On stream complete: checklist view renders automatically

**Sub-state 2: Checklist view**

```
  Tasks                                  14 / 20 done  ██████████░░░░ 70%
  ────────────────────────────────────────────────────────────────────────

  [Regenerate tasks]

  ┌────────────────────────────────────────────────────────────────────┐
  │                                                                    │
  │  § Setup & infrastructure                                          │
  │  ─────────────────────────                                         │
  │  [✓] Initialize Next.js project with TypeScript                    │
  │  [✓] Configure Supabase client                                     │
  │  [ ] Set up FastAPI project structure                               │
  │  [ ] Configure SSE endpoint                                         │
  │                                                                    │
  │  § Authentication                                                  │
  │  ───────────────                                                   │
  │  [✓] Implement Supabase Auth login screen                          │
  │  [ ] Protect write routes with auth middleware                     │
  │                                                                    │
  │  [... more sections ...]                                           │
  │                                                                    │
  └────────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────┐
  │  Mark build complete           [disabled/coral]  │
  └──────────────────────────────────────────────────┘
  Note: All tasks must be checked to mark build complete.
```

**Components**
- `ProgressBar` — full-width, segmented, coral fill; count + percentage label right-aligned, `type-body-strong`
- `TaskSection` — section heading in `type-display-md`, divider line
- `TaskItem` — checkbox left, task description `type-body-md`; checked: label `color-text-secondary` + strikethrough
- `Checkbox` — custom styled: 16px square, `border color-border`; checked: coral fill, white checkmark
- `Button` primary — "Mark build complete" — disabled (dark) until 100% checked, then coral
- `Button` ghost — "Regenerate tasks" — top-right, with warning on hover: "This resets all task progress"

**States**
- **Nominal:** tasks listed with current check state
- **Loading (initial):** skeleton rows
- **Empty (no tasks yet):** "No tasks yet. Generate the task list to begin." + CTA
- **All checked:** "Mark build complete" becomes coral/enabled
- **Error (checkbox save):** toast "Couldn't save — check your connection", checkbox reverts to previous state

---

### Screen 04e — Project View: Deploy Tab

**Layout — right panel**

```
  Deploy check
  ────────────────────────────────────────────────────────

  [Run deploy check]                    [coral CTA, full-width]

  ── Last result ──────────────────────────────────────────

  [Empty state when no check run:]
  "No deploy check run yet."

  [After PASS:]
  ┌─────────────────────────────────────────────────────┐
  │  ✓ PASS                         2026-06-12 09:14 UTC│
  │  ─────────────────────────────────────────────────  │
  │  deploy_check: all 7 criteria met                   │
  │  > tasks.md: 20/20 checked          OK              │
  │  > spec_version: 1.2.0              OK              │
  │  > output_language: set             OK              │
  │  > ...                                              │
  └─────────────────────────────────────────────────────┘
  [Advance to Stage 6 — Ready to deploy]   [coral CTA]

  [After FAIL:]
  ┌─────────────────────────────────────────────────────┐
  │  ✗ FAIL                         2026-06-12 09:08 UTC│
  │  ─────────────────────────────────────────────────  │
  │  2 criteria not met:                                │
  │  > tasks.md: 17/20 checked          FAIL            │
  │    → Check all tasks before deploying               │
  │  > spec_version: not found          FAIL            │
  │    → Add spec_version to project config             │
  └─────────────────────────────────────────────────────┘
  [Advance to Stage 6] — disabled (greyed out)
```

**Components**
- `Button` primary — "Run deploy check" — full-width, coral
- `DeployResultPanel` — `color-surface` bg, `1px border color-border`, `type-code-md` for log content
- Pass/fail headline — `type-display-lg`, `color-success` or `color-error`
- Result rows — monospaced, with inline status tags (OK / FAIL in respective colors)
- Timestamp — `type-code-sm color-text-secondary`
- `Button` primary — "Advance to Stage 6 — Ready to deploy" — enabled only on PASS

**States**
- **Nominal (empty):** "No deploy check run yet." in `color-text-secondary`
- **Running:** "Run deploy check" label → "Running…" + spinner, disabled
- **Pass:** result panel with green header, Advance to Stage 6 enabled
- **Fail:** result panel with red header, itemized failures with remediation text, Advance to Stage 6 disabled
- **Error (API failure):** "Deploy check could not run — [reason]." + Retry

---

### Screen 05 — Metrics Dashboard `/metrics`

**Layout**

```
┌──────────────────────────────────────────────────────────────────┐
│ HEADER                                                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Metrics                                   [Copy metrics]        │
│  Last updated: 14:23 UTC  (auto-refresh every 30s)              │
│  ────────────────────────────────────────────────────           │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │ PROJECTS         │  │ TASKS            │  │ GENERATIONS    │ │
│  │                  │  │                  │  │                │ │
│  │  8 active        │  │  47 / 112 done   │  │  23 runs       │ │
│  │  2 archived      │  │  42%             │  │  this month    │ │
│  │                  │  │  ████████░░░░░░░ │  │                │ │
│  └──────────────────┘  └──────────────────┘  └────────────────┘ │
│                                                                  │
│  Projects by stage                                              │
│  ────────────────────────────────────────────────────           │
│                                                                  │
│  Brief    ██ 2                                                   │
│  PRD      ████ 3                                                 │
│  Spec     ██ 1                                                   │
│  Tasks    ██ 1                                                   │
│  Build    █ 0                                                    │
│  Deploy   █ 1                                                    │
│                                                                  │
│  ────────────────────────────────────────────────────           │
│                                                                  │
│  Per-project breakdown                                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Project          Stage      Tasks       Last gen            │ │
│  │ ──────────────── ────────── ─────────── ────────────────── │ │
│  │ client-alpha     PRD        —           2026-06-11 14:31    │ │
│  │ client-beta      Build      17/20 85%   2026-06-10 09:02    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Components**
- `MetricCard` — `color-surface`, 3 cards in a row, stat in `type-display-xl` coral or white
- `HorizontalBarChart` — ASCII-style, filled with `color-accent` for current stage, drawn with `color-success` for deploy-complete; labels `type-code-md`
- `MetricsTable` — `type-body-sm`, alternating row hover state (`color-border` tint)
- `Button` ghost — "Copy metrics" — top-right, copies plain-text summary to clipboard
- Auto-refresh badge — "Last updated: HH:MM UTC", `type-code-sm color-text-secondary`

**States**
- **Nominal:** all data loaded, table populated
- **Loading:** skeleton cards + skeleton table rows
- **Empty (0 projects):** "No project data yet." centered in metric area
- **Error:** "Couldn't load metrics — [reason]." + Retry

---

### Screen 06 — Public Demo View `/demo`

**Layout**

```
┌──────────────────────────────────────────────────────────────────┐
│  root_                          [Sign in →]                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [READ-ONLY BANNER]                                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 👁  You're viewing root_'s live pipeline — read only.      │ │
│  │     Want to work with root_? hello@root.studio             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  [Project View layout — identical to Screen 04]                  │
│  [BUT: all write CTAs (Generate, Approve, Run check,            │
│   Mark complete, Archive, Delete) are ABSENT from DOM]          │
│  [Output language selector: hidden]                             │
│  [Language toggle: visible and functional]                      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Components**
- `ReadOnlyBanner` — full-width, `color-surface` bg, subtle left-border `color-accent`, `type-body-sm`
- All project view components rendered in read-only mode
- No action buttons rendered (not disabled — not in DOM)
- `SignInLink` in header → `/login`

**States**
- **Nominal:** demo project data loads, pipeline shown
- **Loading:** same skeleton pattern as project view
- **Error:** "Couldn't load demo." — no retry CTA for unauthenticated users (static message: "Try again later.")

---

### Screen 07 — 404 / Error `/404`

**Layout**

```
┌──────────────────────────────────────────────────────────────────┐
│ HEADER                                                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│              404_                                               │
│              [Montserrat Bold, 48px, white]                     │
│                                                                  │
│              This route doesn't exist.                          │
│              [Inter, 15px, color-text-secondary]                │
│                                                                  │
│              [← Back to dashboard]                              │
│              [ghost button, white border]                       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**States:** single state. No loading/error sub-states applicable.

---

## 6. Copy UX

All strings below are the **canonical English** values. FR and ES equivalents must be provided in the i18n translation files — not designed here, but all keys must be present.

### Global / Header

| Key | English copy | Notes |
|---|---|---|
| `nav.brand` | `root_` | Wordmark — never change case |
| `nav.metrics` | `Metrics` | Link to `/metrics` |
| `nav.sign_in` | `Sign in →` | Public demo header |
| `nav.sign_out` | `Sign out` | Authenticated header |
| `lang.toggle_label` | `EN / FR / ES` | Toggle — active highlighted |

### Login

| Key | English copy | Notes |
|---|---|---|
| `login.heading` | `root_` | Wordmark as page title |
| `login.email_label` | `Email` | — |
| `login.password_label` | `Password` | — |
| `login.cta` | `Sign in` | Primary CTA |
| `login.loading` | `Signing in…` | Button loading state |
| `login.error` | `Incorrect email or password.` | Inline error |

### Dashboard

| Key | English copy | Notes |
|---|---|---|
| `dashboard.heading` | `Projects` | Page title |
| `dashboard.new_project` | `+ New project` | Primary CTA |
| `dashboard.empty_heading` | `No projects yet.` | Empty state headline |
| `dashboard.empty_body` | `Create your first project to get started.` | Empty state body |
| `dashboard.last_updated` | `Last updated {relative}` | e.g. "2h ago" |
| `dashboard.stage_label` | `Stage {n} — {name}` | e.g. "Stage 2 — PRD" |
| `dashboard.archived_section` | `Archived` | Section label |
| `dashboard.load_error` | `Couldn't load projects.` | Error state |
| `dashboard.retry` | `Retry` | Retry CTA |

### Project card / kebab menu

| Key | English copy | Notes |
|---|---|---|
| `project.archive` | `Archive` | Kebab option |
| `project.delete` | `Delete` | Kebab option |
| `project.archive_confirm` | `Archive {name}?` | Inline toast confirm |
| `project.delete_confirm` | `Delete {name}? This cannot be undone.` | Modal confirm |
| `project.confirm_yes` | `Confirm` | — |
| `project.confirm_cancel` | `Cancel` | — |

### New Project Modal

| Key | English copy | Notes |
|---|---|---|
