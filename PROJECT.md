# root-ui — Documentation produit & technique complète

> Document vivant. Couvre le **métier**, le **fonctionnel**, le **technique** et
> **toutes les décisions** prises pendant le build. Source de vérité initiale :
> `docs/` (brief → PRD → design → tech-spec → tasks). Ce document décrit ce qui
> a **réellement** été construit, qui dépasse largement le périmètre initial.

---

## 1. Contexte & vision (métier)

**root_** est un studio AI-native dont le pipeline de delivery (6 étapes, spec-driven)
est un actif commercial. L'UI historique (Streamlit) était fonctionnelle mais peu
présentable. **root-ui** est l'interface web de production de ce pipeline —
brandée, déployable, et elle-même **construite via le pipeline root_** (dogfooding).

- **Utilisatrice principale :** Sévi (opératrice unique).
- **Utilisateurs secondaires :** prospects/recruteurs en démo lecture seule.
- **Promesse :** montrer « l'IA au travail » (génération en streaming), du brief
  jusqu'au déploiement, dans une charte brutaliste (noir/blanc + coral 10 %).

Au-delà du périmètre initial (parité Streamlit), le produit a évolué vers une
**plateforme de delivery produit** : itérations/change-requests, capture de
réunions → PRD, templates de prompts multilingues éditables, et **import de
projets existants** (code réel + docs).

---

## 2. Stack & architecture technique

```
Navigateur (Next.js App Router, React 19, TS, Tailwind v3)
   │  cookies de session (@supabase/ssr)
   ├──────────────► Supabase (Postgres + Auth + RLS)   ← source de données
   │  Route Handlers (BFF, app/api/*)
   └──────────────► FastAPI (service de génération)
                       └── LLM Anthropic (claude-sonnet-4-6) ou mock
   Transcription : Whisper **dans le navigateur** (WebAssembly, @huggingface/transformers)
```

- **Frontend / BFF :** Next.js 15 (App Router). Les Route Handlers font tout le
  BFF ; pas de couche Express. SSR via `@supabase/ssr`, middleware de session.
- **Données :** Supabase (Postgres, Auth email+password, Row Level Security).
  Projet hébergé `root-ui` (ref `orfvhjkrkhxdcpkcfdtk`, org Nexboard, eu-west-1).
- **Génération IA :** micro-service **FastAPI** appelé server-side uniquement
  (la clé LLM ne touche jamais le navigateur), streaming **SSE** proxifié par
  Next jusqu'au navigateur.
- **Transcription :** **Whisper en local** (WASM) — aucune clé, aucun upload.
- **i18n :** next-intl, cookie-based (pas de préfixe d'URL), EN/FR/ES.

---

## 3. Modèle de données (Postgres, 7 tables)

Migrations dans `supabase/migrations/` :
`001` schéma initial · `002` RLS · `003` brief ≤20000 car. · `004` itérations ·
`005` import de code.

| Table | Rôle | Points clés |
|---|---|---|
| `profiles` | 1-1 avec `auth.users` | `ui_language`, `role`. Auto-créée par trigger `handle_new_user`. |
| `projects` | Le produit | `name`, `description` (= brief, ≤20000), `prompt_language`, `status` (active/archived/deleted, **soft-delete**), `is_demo`, `current_iteration_id`, `import_source`. Les colonnes `stage`/`gate_*` y subsistent (legacy) mais **l'état du pipeline vit sur l'itération**. |
| `iterations` | Une passe du pipeline | `number` (v1, v2…), `change_request`, `stage` (1–6) + `gate_prd/spec/tasks/build/deploy`. v1 = build initial ; v2+ = change request. |
| `artifacts` | Documents générés | `type` (prd/spec/tasks), `content` (markdown), `approved`, `iteration_id`. Index unique partiel **`(iteration_id, type) WHERE approved`** = un seul approuvé par type/itération. |
| `tasks` | Checklist de build | parsées depuis le tasks.md approuvé, `iteration_id`, `checked`, `position`, `section`. |
| `generation_runs` | Audit des générations | `status` (pending/streaming/completed/cancelled/failed), `iteration_id`. |
| `codebase_snapshots` | Digest du code importé | `source`, `ref`, `digest`, `file_count`, `truncated`, `summary`. Historisé ; le courant = le plus récent. |

**Triggers :** `handle_updated_at` (projects, tasks, iterations) ; `handle_new_user`.

**RLS (résumé) :** owner full-access partout (via `owner_id` du projet) ;
lecture **anon** uniquement sur les projets `is_demo = true AND status = 'active'`
et leurs artifacts/tasks/iterations ; **pas** d'accès anon aux `generation_runs`
ni aux `codebase_snapshots` (sensibles). Le service-role bypasse la RLS.

---

## 4. Fonctionnel — ce que fait le produit

### 4.1 Pipeline spec-driven (6 étapes)
Brief → PRD → Spec → Tasks → Build → Deploy. Piloté par des **gates** : une étape
n'est franchie que lorsque son gate passe.
- **Brief (étape 1) :** éditeur de brief (= `projects.description`, jusqu'à 20000
  car.) qui alimente la génération du PRD.
- **PRD/Spec/Tasks :** bouton *Generate* → **streaming SSE** token par token →
  *Approve* → gate posé, stage avancé. L'approbation des Tasks **parse** le
  markdown en lignes de checklist.
- **Build (étape 5) :** checklist des tâches ; quand toutes sont cochées →
  `gate_build` (forward-only, ne revient pas).
- **Deploy (étape 6) :** *Run deploy check* → FastAPI valide 4 critères → si OK,
  `gate_deploy` + stage 6.

### 4.2 Itérations / change requests (ajout de features sur l'existant)
Un projet = **une suite d'itérations**. v1 = build initial ; v2+ = change request.
- Bouton *New iteration* → on décrit les features (ou on colle un transcript).
- Le pipeline **redémarre** pour l'itération, mais la génération est
  **conditionnée par l'état approuvé du produit** (derniers PRD/spec/tasks) + la
  change request + une instruction « intègre à l'existant ».
- Les **tasks de l'itération = le delta** à implémenter. Historique conservé.

### 4.3 Meeting → PRD (capture de réunion)
Page `/meetings` : enregistrer (micro **ou** écran+audio d'onglet via
`MediaRecorder`), transcription **live** (Web Speech API, micro) **et**
transcription **complète du fichier** (toutes les voix) via **Whisper local
(WASM)** — sans clé. Le transcript devient le **brief** d'un nouveau projet → PRD.

### 4.4 Templates de prompts, multilingues & éditables
Les prompts système (PRD/Spec/Tasks) reproduisent la structure root_ (PRD 10
sections, Spec 8 sections, Tasks checklist). **Par langue** (`{type}.{en,fr,es}.txt`).
Éditables sur la page `/templates` **et** en ligne dans chaque étape de
génération ; l'affichage suit la **langue de l'UI**, la génération utilise la
**langue du projet** (`prompt_language`).

### 4.5 Import de projets existants
Page dashboard *Import* : depuis un **repo GitHub** (clone) ou un **chemin local**
(le serveur lit le fs en contexte local). Construit un **digest** du code
(arborescence + fichiers clés, gitignore-aware, plafonné ~120k car.), stocké en
`codebase_snapshots` et **injecté dans la génération** (les features sont ancrées
dans le code réel). Option « importer aussi les docs » → prd/spec/tasks détectés
deviennent artifacts approuvés (tasks parsées), gates/stage positionnés.

### 4.6 Le reste
Auth email+password ; **i18n EN/FR/ES** (toggle, persisté en cookie + profil) ;
**design system** brutaliste (tokens + 7 primitives hand-codées) ; **démo
publique** lecture seule (`/demo/[id]`, clé anon + RLS) ; **métriques** globales
(cartes + graphe par étape + export CSV + refresh 30s).

---

## 5. Surface d'API (Route Handlers)

| Endpoint | Rôle |
|---|---|
| `GET/PATCH /api/profile` | Profil (ui_language). |
| `GET/POST /api/projects` | Liste (pagination/filtre, stage de l'itération courante) / création (+ itération #1). |
| `GET/PATCH/DELETE /api/projects/[id]` | Détail (overlay itération courante + liste itérations) / update / **soft-delete** (via service-role). |
| `GET/POST /api/projects/[id]/iterations` | Liste / créer une nouvelle itération (change request). |
| `POST /api/projects/[id]/approve` | Approuve un artifact, parse les tasks, avance gate+stage de l'itération. |
| `GET /api/projects/[id]/tasks` · `PATCH /api/tasks/[taskId]` | Liste / toggle (effet `gate_build` par itération). |
| `POST /api/projects/[id]/deploy-check` | Wrappe FastAPI, persiste, gate_deploy/stage 6. |
| `GET /api/generate` | **SSE** proxy vers FastAPI : pré-flight, run streaming, contexte (artifacts approuvés + change request + **digest du code**), persiste l'artifact. |
| `POST /api/projects/import` | Ingestion code + docs → projet + itération #1 + snapshot. |
| `GET /api/metrics` | Agrégations. |
| `GET /api/public/projects/[id]` | Démo publique (anon, itération courante). |
| `GET /api/prompts` · `PUT /api/prompts/[type]` | Lire/écrire les templates (par langue, lecture fs directe). |
| FastAPI : `POST /internal/generate` (SSE), `POST /internal/deploy-check` | Bearer `INTERNAL_API_SECRET`. |

Enveloppe d'erreur standard : `{ "error": "message", "code": "MACHINE_CODE" }`.

---

## 6. Décisions & arbitrages (et leur pourquoi)

1. **Stack Next.js (pas Vue).** Tranché dans le brief : Sévi est seule, on
   s'aligne sur le boilerplate du pipeline (Next + Supabase).
2. **FastAPI séparé pour le LLM.** Garde la clé LLM côté serveur ; SSE proxifié.
   Modèle par défaut **claude-sonnet-4-6**, **fallback mock** sans clé (toute
   l'app reste testable/démo sans dépense).
3. **i18n cookie-based, sans préfixe d'URL.** Cohérent avec un toggle de langue
   instantané et la persistance ; pas de middleware next-intl.
4. **Soft-delete via service-role.** La RLS du spec (`FOR ALL`, `USING status !=
   'deleted'`) **empêche** le owner de passer `status='deleted'` par sa propre
   session. Décision : vérifier la propriété avec le client user, puis écrire
   avec le client **service-role** (`lib/supabase/admin.ts`). Migration RLS non
   modifiée (spec = source de vérité).
5. **Brief = `projects.description`, limite portée à 20000** (migration `003`,
   autorisée explicitement) pour coller un vrai doc de discovery.
6. **Itérations comme objet de 1ʳᵉ classe** (migration `004`). Le pipeline
   (stage+gates) déménage au niveau itération ; l'index unique d'artifact approuvé
   passe à `(iteration_id, type)`. Migration **non destructive** : chaque projet
   existant est backfillé en itération #1. Choix vs « bricolage » de re-génération.
7. **Import : digest plafonné, pas de RAG en v1.** Un vrai codebase dépasse le
   budget de prompt → digest (arbre + fichiers clés) capé ~120k car. avec drapeau
   `truncated`. Le RAG (embeddings) pour gros repos est **déféré**.
8. **Transcription : Whisper local (WASM) plutôt que cloud.** Répond à « gratuit
   et sans outil externe ». Fix clé : le build **q4 (4-bit) échoue dans le
   runtime WASM** (`MatMulNBits / missing scale`) → on force **`whisper-tiny`
   fp32** (`dtype:'fp32'`). Compromis assumé : téléchargement du modèle au 1ᵉʳ
   usage, plus lent, qualité moindre (upgrade `whisper-base` possible).
9. **Meet/Teams non intégrés.** La transcription via leurs API exige une licence
   entreprise (Workspace Business Standard+ / Teams Premium) **non disponible** →
   déféré. La capture navigateur + Whisper couvre le besoin sans licence.
10. **`test-plan.md` incohérent.** Il décrit un **autre** modèle de données
    (`pipeline_stages`/`documents`/`generation_jobs`) absent de tout le reste du
    repo → c'est le seul document hors-piste (généré depuis une autre spec). À
    **régénérer** depuis la vraie tech-spec avant la mise en prod.
11. **`docs/` en lecture seule** (règle CLAUDE.md) → cette doc vit à la racine
    (`PROJECT.md`).

---

## 7. Sécurité & secrets

- **RLS** sur toutes les tables ; anon limité aux démos.
- Clé LLM et `INTERNAL_API_SECRET` **server-side** uniquement.
- Secrets locaux dans `.env.local` (gitignored) : `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  `INTERNAL_API_SECRET`, `FASTAPI_BASE_URL`, `NEXT_PUBLIC_DEMO_PROJECT_ID`.
  FastAPI : `fastapi-service/.env` (`ANTHROPIC_API_KEY`, `LLM_MODEL`).
- **Import :** clone/lecture fs avec une valeur fournie par l'opérateur — sûr en
  **contexte local mono-utilisateur** ; à durcir (allowlist/sandbox) avant tout
  déploiement multi-tenant.
- Service-role : `lib/supabase/admin.ts`, jamais importé côté client.

---

## 8. Limites connues & travail déféré

- **Génération document-only par défaut** : sans projet importé, le système se
  base sur les PRD/spec, **pas** sur du code. L'import comble ce trou.
- **Gros codebases** : digest tronqué → RAG/embeddings à faire.
- **Meet/Teams** : Phase 2 sous réserve de licence.
- **Résumé IA du codebase** (compresser le digest) : prévu, non implémenté.
- **`test-plan.md`** à régénérer ; puis exécution + `deploy_check` avant prod.
- **Déploiement** (Vercel + hébergeur FastAPI) à faire ; l'import fs/clone ne
  fonctionne qu'en contexte local.
- Tests automatisés limités au parser (vitest) ; le reste validé en E2E manuel/API.

---

## 9. Comment lancer

```bash
# 1) Service de génération (optionnel ; sans clé = mock)
cd fastapi-service
INTERNAL_API_SECRET="$(grep '^INTERNAL_API_SECRET=' ../.env.local | cut -d= -f2)" \
  ./.venv/bin/python -m uvicorn main:app --port 8000
# (ANTHROPIC_API_KEY dans l'env => vraie génération claude-sonnet-4-6)

# 2) L'app
npm run dev      # http://localhost:3000

# Tests unitaires
npm test         # vitest (parser de tasks)
```

Connexion : `marchalsevi@gmail.com` (compte créé pour la démo ; mot de passe à
changer).

---

## 10. Repère des fichiers

- `app/(auth)/*` — pages authentifiées (dashboard, projects/[id] + prd/spec/tasks,
  metrics, templates, meetings).
- `app/(public)/*` — login, demo/[id].
- `app/api/*` — Route Handlers (BFF).
- `components/{ui,layout,dashboard,project}/*` — design system + écrans.
- `hooks/*` — `useI18n`, `useStreamingGeneration`, `useTaskList`.
- `lib/*` — `supabase/{server,browser,admin,anon}`, `iterations`, `tasks/parser`,
  `ingest/codebase`, `whisper/worker`, `api/http`.
- `fastapi-service/*` — `main.py`, `_llm.py`, `deploy_check.py`, `prompts/`.
- `supabase/migrations/*` — `001`…`005`.
