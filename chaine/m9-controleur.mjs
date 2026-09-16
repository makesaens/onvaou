// M9 — Le Contrôleur : vérifie mécaniquement, écrit rapport.md, verdict GO / NO-GO, ntfy optionnel.
// usage : node chaine/m9-controleur.mjs ep1
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, CONFIG, epDir, readJSON, writeJSON, exists, step, mmss } from './lib.mjs';
import path0 from 'node:path';
const ZC = readJSON(path0.join(ROOT, 'chaine/zones-camion.json'));

const ep = process.argv[2];
const dir = epDir(ep);
const meta = readJSON(path.join(dir, 'meta.json'));
const T = readJSON(path.join(dir, 'transcript.json'));
const M = readJSON(path.join(dir, 'moments.json'));
const G = readJSON(path.join(dir, 'trajet.json'), { etapes: [], troncons: [] });
const R = readJSON(path.join(dir, 'run.json'), { maillons: [] });
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const tout = norm(T.segments.map(s => s.texte).join(' '));
const hp = (iso) => new Date(iso).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', second: '2-digit' });

step(ep, 'M9', () => {
  const ctrl = [], bloquants = [];
  const c = (nom, ok, detail, bloquant = false) => { ctrl.push({ nom, ok, detail }); if (!ok && bloquant) bloquants.push(nom); };
  c('transcript complet', meta.dureeS - T.stats.dernierTimecodeS < 90, `dernier segment ${mmss(T.stats.dernierTimecodeS)} / ${mmss(meta.dureeS)}`, true);
  c('assez de moments', M.moments.length >= 15, `${M.moments.length} moments`, true);
  const mauvaisTC = M.moments.filter(m => m.debut < 0 || m.debut > meta.dureeS);
  c('timecodes dans la vidéo', mauvaisTC.length === 0, `${mauvaisTC.length} hors durée`, true);
  const citFausses = M.moments.filter(m => !tout.includes(norm(m.citation)));
  c('citations verbatim', citFausses.length === 0, `${citFausses.length} introuvables (${M.rejets.length} déjà rejetées par M4)`, true);
  const villesSansPreuve = G.etapes.filter(e => !e.citation || !tout.includes(norm(e.citation)));
  c('étapes prouvées par une citation', villesSansPreuve.length === 0, villesSansPreuve.map(e => e.ville).join(', ') || 'toutes', true);
  const zones = Object.keys(ZC.zones).concat(Object.keys(ZC.alias));
  const impacts = M.moments.filter(m => m.type === 'IMPACT_CAMION');
  c('zones d impact valides', impacts.every(m => zones.includes(m.detail?.zone)), `${impacts.length} impacts`);
  c('chapitres sans trou', M.chapitres.every((ch, i, a) => i === 0 || Math.abs(ch.debut - a[i - 1].fin) <= 30), `${M.chapitres.length} chapitres`);
  c('étapes géocodées', G.etapes.length >= 1, G.etapes.map(e => e.ville).join(' → ') || 'aucune');
  const verdict = bloquants.length ? 'NO-GO' : 'GO';
  const parType = {}; for (const m of M.moments) parType[m.type] = (parType[m.type] || 0) + 1;
  const lignes = [
    `# Rapport ${ep} — ${verdict}`, '',
    `Vidéo : ${meta.titre} (${mmss(meta.dureeS)}, publiée ${meta.publieLe})`, '',
    '## Contrôles', ...ctrl.map(x => `- ${x.ok ? '✔' : '✘'} ${x.nom} — ${x.detail}`), '',
    '## Compteurs', `- moments : ${M.moments.length} (${Object.entries(parType).map(([k, v]) => `${k} ${v}`).join(', ')})`,
    `- rejets M4 : ${M.rejets.length}`, `- étapes : ${G.etapes.map(e => e.ville).join(' → ')} (${G.kmEpisode || 0} km)`,
    `- rires : ${T.stats.balises.rires || 0}`, '',
    '## Maillons', ...R.maillons.map(m => `- ${m.maillon} ${m.ok ? 'ok' : 'ERREUR'} ${m.dureeS}s (${hp(m.debut)} → ${hp(m.fin)} Paris)`), '',
  ];
  fs.writeFileSync(path.join(dir, 'rapport.md'), lignes.join('\n'));
  writeJSON(path.join(dir, 'controle.json'), { verdict, controles: ctrl, bloquants });
  if (CONFIG.ntfyTopic) {
    fetch(`https://ntfy.sh/${CONFIG.ntfyTopic}`, { method: 'POST', body: `${ep} ${verdict} · ${M.moments.length} moments · ${G.etapes.map(e => e.ville).join(' → ')} · ${M.rejets.length} rejets`, headers: { Title: `On va où — ${ep}` } }).catch(() => {});
  }
  return { verdict, bloquants, moments: M.moments.length };
});
