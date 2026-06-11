# Note de cadrage — root-ui (le front web de root_)

> Dogfooding : le système root_ construit sa propre interface. Ce projet suit le pipeline complet — PRD validé, spec, build spec-driven.

- **Client :** root_ (interne — Sévi)
- **Date :** 2026-06-11
- **Auteur :** Sévi

---

## 1. Le problème (en une phrase)
L'UI actuelle du pipeline (Streamlit) est fonctionnelle mais limitée : design contraint, pas déployable proprement pour la démo publique, et elle ne reflète pas le niveau de finition que root_ vend à ses clients — la vitrine doit être au niveau de la promesse.

## 2. Les utilisateurs
- **Utilisateur principal :** Sévi, qui pilote tous ses projets clients dans l'outil au quotidien.
- **Utilisateurs secondaires :** prospects et recruteurs à qui root_ montre le système en démo (lecture seule) ; à terme Alfonso (lead dev).
- **Qui paie :** root_ (investissement portfolio/outillage).

## 3. Le marché
- **Contexte :** les outils internes des studios AI-native sont devenus un argument commercial (« regarde comment on travaille »). La démo du système EST le pitch de root_.
- **Concurrents / alternatives :** rester sur Streamlit (statu quo), Notion + scripts (bricolage), outils SaaS de gestion de delivery (génériques, pas pilotés par l'IA).
- **Notre angle :** une interface qui matérialise le pipeline en 6 étapes avec ses portes de validation, brandée root_, et qui montre l'IA au travail (génération en streaming).

## 4. Hypothèse de solution
Une application web monopage qui reprend tout ce que fait l'UI Streamlit actuelle — gestion de projets, génération PRD/spec/tâches en streaming, checklist spec-driven, deploy check, métriques, trilingue EN/FR/ES — avec un design fidèle à la charte root_ (noir/blanc, coral 10 %, Montserrat/Inter/JetBrains Mono, minimalisme brutal). Front moderne (React/Next.js **ou** Vue 3 — voir question ouverte) adossé à une petite API Python (FastAPI) qui réutilise les modules existants (`_llm.py`, prompts, deploy_check).

## 5. Critères de succès
- Parité fonctionnelle avec l'UI Streamlit (aucune régression de workflow).
- Sévi l'utilise par défaut au quotidien à la place de Streamlit.
- Démontrable en entretien/démo client en moins de 5 minutes, et visuellement au niveau de la charte.
- Le build lui-même est exécuté en spec-driven via le pipeline (tasks.md coché à 100 %) — preuve que le système marche.

## 6. Risques & inconnues
- Risque : maintenir deux UIs (Streamlit + web) double l'effort — décider du sort de Streamlit à la livraison.
- Risque : le streaming de génération (SSE/WebSocket) est le point technique le plus délicat — à prototyper tôt.
- ✅ **Tranché (2026-06-11) : React/Next.js.** Alfonso ne fait plus partie de root_ — Sévi est seule, le stack s'aligne sur le boilerplate du pipeline (Next.js + Supabase). La mention « Vue.js 3 » de la charte est obsolète, à mettre à jour.
- ❓ Question ouverte : l'accès démo public est-il en lecture seule totale, ou avec un projet sandbox manipulable ?

## 7. Inputs design
> Ce que le système utilisera pour générer le design (étape 3).

- **Charte / marque :** root_ — #1A1A1A (noir) + #FFFFFF (blanc) à 90 %, #FF6B6B (coral) à 10 % max. Typo display : Montserrat Bold ; body : Inter ; code : JetBrains Mono. Pas de dégradés, pas d'ombres — minimalisme brutal. Logo toujours `root_` (minuscules, underscore).
- **Références / inspirations :** Linear (netteté, vitesse), Vercel dashboard (sobriété), terminaux/CLI (esthétique monospace pour les statuts).
- **Devices cibles :** desktop-first (outil de travail), lisible sur laptop 13" ; pas de mobile en v1.
- **Ton / personnalité :** direct, no bullshit, technique mais accessible — la voix root_.
- **Design system existant :** aucun — root-ui fonde le design system réutilisable des futurs produits root_.
- **Contraintes :** UI trilingue EN/FR/ES (textes = clés i18n, prévoir des longueurs variables), contrastes AA, navigation clavier sur les actions principales.
