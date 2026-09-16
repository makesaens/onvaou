# On va où 7 — le site qui se reconstruit à chaque épisode

Site fan indépendant de la série « On va où 7 » de Djilsi. Personne n'écrit ce site : à chaque
sortie d'épisode, une chaîne de maillons va chercher la donnée dans la vidéo, la vérifie et
reconstruit la page. Le site : https://makesaens.github.io/onvaou/

## La chaîne (`chaine/`)

| Maillon | Fichier | Ce qu'il fait |
|---|---|---|
| M0 | `m0-veilleur.mjs` | lit le flux RSS de la chaîne toutes les 5 min (launchd), détecte un nouvel épisode, lance `run.mjs` |
| M1 | `m1-collecteur.mjs` | yt-dlp : métadonnées, miniature, sous-titres auto, vidéo 480p |
| M2 | `m2-transcripteur.mjs` | sous-titres → `transcript.json` horodaté + balises sonores ; repli mlx-whisper |
| M3 | `m3-decoupeur.mjs` | courbe de rire, lexique horodaté, plans (PySceneDetect) — sans IA |
| M4 | `m4-lecteur.mjs` | `claude -p` lit le transcript → `moments.json` ; toute citation non verbatim est rejetée |
| M7 | `m7-geographe.mjs` | villes → Nominatim → OSRM → `trajet.json` |
| M9 | `m9-controleur.mjs` | contrôles mécaniques → `rapport.md`, verdict GO / NO-GO |
| M10 | `m10-batisseur.mjs` | JSON → `docs/` (site statique) → `git push` → GitHub Pages |

À venir : M5 l'Œil (images), M6 les Visages, M8 le Carrossier (camion 3D).

```
node chaine/run.mjs ep4            # toute la chaîne, s'arrête à la barrière
node chaine/run.mjs ep4 --from M4  # rejouer depuis un maillon
node chaine/m10-batisseur.mjs --publish
```

Tout est gratuit : yt-dlp, OpenStreetMap, OSRM, Leaflet, GitHub Pages. Le seul modèle appelé
est Claude, via l'abonnement Claude Code. La chaîne tourne sur un Mac (YouTube bloque les IP des
clouds).

## Données par épisode (`episodes/epN/`)

`meta.json` · `transcript.json` · `candidats.json` · `moments.json` · `trajet.json` ·
`controle.json` · `rapport.md` · `run.json` (journal des maillons).

Projet indépendant, non affilié. Les vidéos restent sur YouTube. Une demande de retrait sera
honorée immédiatement.
