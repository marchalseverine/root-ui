# Build spec-driven — projet root-ui

Ce repo est buildé via le pipeline root_. Règles non négociables :

1. **Source de vérité :** `docs/tech-spec.md` (architecture, modèle de données,
   contrats d'API) et le plan de tâches. Les fichiers de `docs/` sont des
   instantanés de lecture — ne les modifie pas.
2. **Boucle de build :** utilise les outils MCP `root-pipeline` avec
   `project="root-ui"` :
   - `get_next_task` → implémente UNIQUEMENT cette tâche, avec son test ;
   - tests verts + critères d'acceptation vérifiés → `complete_task` ;
   - recommence. Une tâche à la fois, jamais d'avance sur le plan.
3. **Jamais de tâche cochée sans test qui passe.** Si une tâche est ambiguë,
   demande à l'utilisateur au lieu d'inventer.
4. Avant la prod : le plan de tests (`docs/test-plan.md`) doit être exécuté et
   coché à 100 % (via `read_document`/`save_document`), puis `deploy_check`.
