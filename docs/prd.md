# PRD — root-ui: The Web Front-End for root_

**Project:** root-ui
**Client:** root_ (internal — Sévi)
**Date:** 2026-06-11
**Status:** Draft — awaiting validation

---

## 1. Context & Problem

root_ is an AI-native studio whose delivery pipeline is a core commercial asset. Today, that pipeline is piloted through a Streamlit interface: functional, but visually constrained, impossible to deploy cleanly for public access, and inconsistent with the level of finish root_ promises its clients.

This gap matters commercially. When root_ pitches its process to prospects or recruiters, the demo is the pitch. A tool that looks like an internal prototype undermines the credibility of a studio selling polished, spec-driven AI delivery.

**The problem in one sentence:** The current UI works for Sévi but cannot serve as a credible public showcase of root_'s standards.

The solution is to replace the Streamlit front-end with a purpose-built web application — branded, deployable, and spec-driven — that runs the full root_ pipeline in production quality. The project is also a proof of concept: root-ui is built using the root_ pipeline itself (dogfooding).

---

## 2. Objectives

1. **Achieve full functional parity with the Streamlit UI** — every workflow Sévi uses today (project management, PRD/spec/task generation, spec checklist, deploy check, metrics, trilingual support) works in root-ui with no regression.
2. **Replace Streamlit as Sévi's daily driver within 30 days of launch** — measured by zero use of the Streamlit UI in the following month.
3. **Enable a convincing demo in under 5 minutes** — a prospect or recruiter with no technical background can watch the pipeline run end-to-end and understand what root_ does.
4. **Deliver the build itself via the root_ pipeline** — `tasks.md` reaches 100% checked at ship, proving the system works on a real project.
5. **Establish a deployable, publicly accessible version** — root-ui is live on a stable URL, accessible to external viewers without local setup.

---

## 3. Personas

| Persona | Key Need | Usage Context |
|---|---|---|
| **Sévi — root_ operator** | Run every project workflow efficiently from a single interface, daily | Desktop, alone, managing multiple active client projects in parallel |
| **Prospect / Recruiter — demo viewer** | Understand root_'s process and standards quickly, without friction | Shared screen or live URL during a call or interview; no account, no prior knowledge of the tool |
| **Alfonso — future lead dev** *(deferred)* | Read project state, understand tasks, contribute to builds | Remote, async; needs clear structure and readable specs — not yet in scope |

---

## 4. User Stories

### US-01 — Project Management
**As Sévi, I want to create, list, and open client projects so that I can keep all active work organized in one place.**

- [ ] I can create a new project by entering a name and an optional description; the project appears immediately in the project list.
- [ ] I can open an existing project and see its current pipeline stage and history.
- [ ] I can archive or delete a project without affecting others.
- [ ] The project list loads in under 2 seconds.

---

### US-02 — Pipeline Stage Visualization
**As Sévi, I want to see the 6-stage pipeline with its validation gates clearly displayed so that I always know where a project stands.**

- [ ] Each project shows a visual indicator of its current stage (e.g., Brief → PRD → Spec → Tasks → Build → Deploy).
- [ ] Completed stages are visually distinct from the current and pending stages.
- [ ] Validation gates are displayed as explicit checkpoints — a stage cannot show as complete unless its gate is passed.
- [ ] The pipeline view is immediately readable to a non-technical viewer during a demo.

---

### US-03 — AI Generation in Streaming
**As Sévi, I want PRD, spec, and task list generation to stream live in the interface so that I can watch the output build in real time and intervene quickly if needed.**

- [ ] When I trigger a generation, text appears token-by-token (or in small chunks) in the output area without a full page reload.
- [ ] A clear loading/streaming state is visible (e.g., animated cursor or progress indicator) for the duration of the generation.
- [ ] I can cancel an ongoing generation.
- [ ] If the stream fails or times out, a clear error message is shown and no partial output is silently saved.

---

### US-04 — Spec-Driven Checklist
**As Sévi, I want to check off tasks in a spec-driven checklist so that I can track build progress task by task and know when a project is ready to ship.**

- [ ] Each task in `tasks.md` is displayed as a checkbox item.
- [ ] Checking a task updates its state persistently (survives page refresh).
- [ ] The checklist shows overall completion as a percentage or count (e.g., "14 / 20 done").
- [ ] A project cannot be marked as build-complete unless all checklist items are checked.

---

### US-05 — Deploy Check
**As Sévi, I want to run the deploy check from the interface so that I can validate that a project meets deployment criteria before shipping.**

- [ ] A "Run deploy check" action is available at the appropriate pipeline stage.
- [ ] The check runs using the existing `deploy_check` module and returns a pass/fail result with detail.
- [ ] Results are displayed clearly with actionable feedback if the check fails.
- [ ] The last deploy check result and its timestamp are persisted on the project.

---

### US-06 — Metrics Dashboard
**As Sévi, I want to see key metrics for my projects so that I can report progress and spot bottlenecks.**

- [ ] The metrics view shows at minimum: number of projects by stage, tasks completed vs. total, and generation runs triggered.
- [ ] Metrics update without requiring a manual refresh.
- [ ] **[Proposition à valider]** A simple export (CSV or copy-to-clipboard) is available for sharing metrics in client reports.

---

### US-07 — Trilingual Interface
**As Sévi, I want to switch the interface language between English, French, and Spanish so that I can demo the tool to any audience without friction.**

- [ ] A language toggle (EN / FR / ES) is visible and accessible from any screen.
- [ ] Switching language applies immediately to all UI labels, buttons, and status messages without a page reload.
- [ ] AI-generated content language follows a separate setting (the prompt language), not the UI language toggle.
- [ ] The selected language persists across sessions.

---

### US-08 — Public Demo Access
**As a prospect or recruiter, I want to view a live project running through the pipeline so that I can understand root_'s process without needing an account.**

- [ ] A public URL exists that does not require login.
- [ ] The public view shows a real or representative project in read-only mode.
- [ ] No write actions (create, generate, check, delete) are available to unauthenticated viewers.
- [ ] *(Sandbox mode — see Questions Ouvertes: if approved, a visitor can interact with a sandboxed demo project without affecting real data.)*

---

## 5. Scope

### ✅ IN — Delivered in v1

- Full project CRUD (create, read, update, archive/delete)
- 6-stage pipeline view with validation gates
- AI generation in streaming (PRD, spec, tasks) via SSE, reusing `_llm.py` and existing prompts
- Spec-driven task checklist with persistent state
- Deploy check integration (reusing `deploy_check` module)
- Metrics view (project-level and global)
- Trilingual UI: EN / FR / ES
- root_ brand design system: black/white, coral accent (~10%), Montserrat / Inter / JetBrains Mono, brutalist minimalism
- Next.js front-end + FastAPI back-end
- Supabase for data persistence (aligned with pipeline boilerplate)
- Public read-only access at a stable URL
- Authenticated access for Sévi (single-user)
- Deployed and accessible without local setup

### ❌ OUT — Not in v1

- Multi-user accounts or role management (beyond single operator + public viewer)
- Real-time collaboration or live cursors
- In-app editing of prompts or LLM configuration
- Custom branding / white-labeling for client projects
- Mobile-native experience (responsive is best-effort; mobile is not a primary surface)
- Integrations with external project management tools (Jira, Linear, Notion, etc.)
- Billing, invoicing, or client-facing portals
- Audit logs or compliance features
- Automated testing suite beyond manual QA (deferred to a later sprint)
- Migration tooling to import Streamlit session history
- Vue.js 3 — the stack decision is final: Next.js only

### 🔜 Later — Post-v1 Backlog

- Alfonso onboarding: contributor access with task-level permissions
- Sandbox mode for demo visitors (interactive demo project — pending decision, see Questions Ouvertes)
- Mobile-optimized layout
- Email or webhook notifications on pipeline stage changes
- Extended metrics: time-per-stage, LLM cost tracking
- Streamlit deprecation plan and final migration

---

## 6. Main User Journey (Happy Path)

> **Persona:** Sévi — starting a new client project from scratch.

1. Sévi opens root-ui at the authenticated URL and lands on the **project dashboard**.
2. She clicks **"New project"**, enters the client name and a one-line description, and confirms.
3. The new project appears in the list at **Stage 1 — Brief**. She opens it.
4. She reviews the brief inputs and clicks **"Generate PRD"**. The generation streams live in the output panel — she watches the PRD build in real time.
5. She reviews the output, approves it, and the pipeline advances to **Stage 2 — PRD validated**. The validation gate is marked as passed.
6. She triggers **"Generate Spec"** from Stage 3. Same streaming experience. She approves.
7. She triggers **"Generate Tasks"**. The `tasks.md` checklist populates.
8. During the build, she opens the **checklist view** and checks off tasks one by one as she completes them. The progress counter updates.
9. When all tasks are checked, she runs the **deploy check**. It passes. The project advances to **Stage 6 — Ready to deploy**.
10. She opens the **metrics view** to confirm the project stats before the client handoff.
11. *(Demo scenario)* She shares the public URL with a prospect, who watches the pipeline state in read-only without logging in.

---

## 7. Non-Functional Requirements

### Performance
- Page initial load (first contentful paint): under 2 seconds on a standard broadband connection.
- API responses for non-generative actions (project list, stage update, checklist save): under 500ms.
- Streaming generation begins displaying output within 1 second of the request being sent.

### Security & Data
- Authentication for write access: Sévi's session is protected (token-based auth via Supabase or equivalent).
- The public demo URL exposes only read-only data; no API route accessible without auth can modify project state.
- No client data is logged to third-party analytics services without explicit review.
- LLM API keys are stored as environment variables server-side, never exposed to the client.

### Accessibility
- Minimum WCAG 2.1 AA compliance for interactive elements (contrast ratios, keyboard navigation, focus states).
- The streaming output area is announced to screen readers when content updates. **[Proposition à valider — to confirm priority with Sévi]**

### Compatibility
- Supported browsers: latest Chrome, Firefox, Safari (desktop).
- Mobile: no explicit support commitment in v1, but the layout must not break on a tablet screen used for a demo.
- The FastAPI back-end runs on Python 3.11+; deployment target to be confirmed (see Questions Ouvertes).

---

## 8. Success Metrics

| Metric | Target | Measurement Method |
|---|---|---|
| Streamlit usage post-launch | 0 sessions in the 30 days after go-live | Self-reported by Sévi; Streamlit access logs if available |
| Demo duration | Full pipeline demo completable in ≤ 5 minutes | Timed dry run before first external demo |
| Pipeline task completion | `tasks.md` at 100% checked at ship | Checklist in root-ui itself (dogfood proof) |
| Generation streaming reliability | < 5% of streaming sessions result in a failed or silent error in the first month | Error logs from FastAPI |
| Time-to-first-generation for new project | Sévi can go from "new project" to first streamed PRD output in under 3 minutes | Timed walkthrough on launch day |
| Public URL uptime | ≥ 99% in the first 30 days post-launch | Uptime monitoring (e.g., UptimeRobot — **[proposition à valider]**) |

---

## 9. Risks & Dependencies

| Risk | Impact | Mitigation |
|---|---|---|
| **Streaming (SSE) proves brittle in production** — network interruptions, proxy timeouts, or Vercel/hosting constraints break the live generation experience | High — this is a core visible feature | Prototype SSE end-to-end in the first sprint before any other build work; test on the target hosting environment early |
| **Maintaining two UIs (Streamlit + root-ui) during transition** doubles maintenance burden and creates confusion about the source of truth | Medium | Define a hard deprecation date for Streamlit at project kick-off; communicate clearly that root-ui is the target |
| **Solo operator risk** — Sévi is building and using the tool alone; a blocking technical issue has no fallback | High | Keep Streamlit available as emergency fallback until root-ui has been used in production for ≥ 2 weeks without issues |
| **Supabase schema decisions made early are hard to undo** — data model for projects, stages, and tasks needs to be correct from the start | Medium | Finalize the data model in the spec phase before any database work begins |
| **Public demo URL exposes sensitive client data** — if real projects are visible, this is a confidentiality risk | High | Either use a dedicated demo/sandbox project, or implement strict data filtering before the public URL goes live |
| **Next.js + FastAPI deployment complexity** — two services to deploy and keep in sync adds operational overhead for a solo operator | Medium | Use a deployment setup Sévi already knows (e.g., Vercel for Next.js + Railway or Render for FastAPI); document the deploy process in the project README |

---

## 10. Open Questions

> Items that must be resolved before design and build begin.

**Q1 — Public demo mode: read-only or interactive sandbox?**
The current brief specifies read-only public access, but a sandbox project (where a visitor can trigger a generation and watch it stream) would be significantly more compelling as a demo. Which mode is required for v1?
*Decision needed from: Sévi.*

**Q2 — What data does the public URL show?**
If the public view shows real client projects, there is a confidentiality risk. Should the public view be restricted to a dedicated demo project, or is there a filtering mechanism planned? Who decides what is visible publicly?
*Decision needed from: Sévi.*

**Q3 — Deployment target for FastAPI back-end?**
Where does the API run in production? Options include Railway, Render, Fly.io, or a VPS. The choice affects cost, latency, and streaming compatibility (some platforms have SSE limitations).
*Decision needed from: Sévi before infrastructure setup.*

**Q4 — Authentication mechanism for Sévi's access?**
Supabase Auth is the natural fit given the stack, but the exact method (magic link, password, OAuth) needs to be confirmed. Is single-factor authentication acceptable, or is there a preference?
*Decision needed from: Sévi.*

**Q5 — What happens to Streamlit at launch?**
The note flags the risk of maintaining two UIs but does not set a deprecation date. Is the decision: (a) deprecate Streamlit immediately at root-ui launch, (b) keep it as a fallback for a defined period, or (c) keep it indefinitely for specific use cases?
*Decision needed from: Sévi before launch.*

**Q6 — Scope of the metrics view?**
The brief mentions "métriques" as a feature to carry over from Streamlit, but does not specify which metrics matter most. What does the current Streamlit metrics view show, and is there anything to add or remove?
*Decision needed from: Sévi during spec phase.*
