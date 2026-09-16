// M3 — Le Découpeur : courbe de rire, lexique horodaté, plans (si vidéo). Sans IA.
// usage : node chaine/m3-decoupeur.mjs ep1
import path from 'node:path';
import { PY, epDir, run, readJSON, writeJSON, exists, step, mmss } from './lib.mjs';

const ep = process.argv[2];
const dir = epDir(ep);
const T = readJSON(path.join(dir, 'transcript.json'));

const VILLES = ['Québec', 'Montréal', 'Ottawa', 'Toronto', 'Kingston', 'Gatineau', 'Trois-Rivières', 'Niagara', 'Mississauga', 'Hamilton', 'Laval', 'Sherbrooke', 'Tadoussac', 'Charlevoix', 'Tremblant', 'Oshawa', 'Peterborough', 'Cornwall', 'Brockville', 'Drummondville', 'Lévis', 'Saguenay', 'Longueuil', 'Vaudreuil', 'Brossard', 'Hull', 'Belleville', 'Ajax', 'Scarborough', 'Markham', 'Vancouver', 'Calgary', 'Winnipeg', 'Halifax', 'Paris', 'Montreal', 'Quebec', 'Levis'];
const FAMILLES = {
  ville: new RegExp(`\\b(${VILLES.join('|')})\\b`, 'i'),
  choc: /\b(tap[ée]s?|ray[ée]s?|cass[ée]s?|accroch[ée]s?|cogn[ée]s?|choc|percut[ée]s?|frott[ée]s?|bosse|carrosserie|rétro|pare-?chocs?|marchepied|toit|aile|flanc|c'est cassé|dégât)\b/i,
  drone: /\bdrone\b/i,
  presentation: /\b(voilà|je vous présente|on est avec|il s'appelle|elle s'appelle|c'est lui|c'est elle|salut à)\b/i,
  merch: /\b(merch|onvaoushop|t-?shirt|hoodie|sweat|casquette)\b/i,
  marque: /\b(revolut|canadream|dinoz|tim hortons|walmart|costco)\b/i,
  objet: /\b(perdu|tombé|craché|oublié|cassé|volé|pété|mort)\b/i,
  galere: /\b(panne|police|amende|bloqué|coincé|perdu|essence|batterie|crev[ée])\b/i,
  gps: /\b(gps|point gps|destination|direction)\b/i,
};

step(ep, 'M3', () => {
  // 1. courbe de rire par fenêtre de 30 s
  const W = 30, n = Math.ceil(T.dureeVideoS / W);
  const courbe = Array.from({ length: n }, (_, i) => ({ t: i * W, rires: 0, cris: 0 }));
  for (const b of T.balises) {
    const i = Math.min(n - 1, Math.floor(b.t / W));
    if (b.tag === 'rires') courbe[i].rires++;
    if (['cri', 'acclamation', 'applaudissements'].includes(b.tag)) courbe[i].cris++;
  }
  const pics = courbe.map((c, i) => ({ ...c, score: c.rires * 2 + c.cris }))
    .filter((c, i, a) => c.score >= 3 && (!a[i - 1] || c.score >= a[i - 1].score) && (!a[i + 1] || c.score >= a[i + 1].score))
    .sort((a, b) => b.score - a.score).slice(0, 15);
  // 2. lexique horodaté
  const lexique = [];
  for (const s of T.segments) for (const [fam, re] of Object.entries(FAMILLES)) {
    const m = s.texte.match(re);
    if (m) lexique.push({ t: s.debut, famille: fam, terme: m[0], texte: s.texte });
  }
  // 3. plans (si la vidéo est là)
  let plans = null;
  const video = path.join(dir, 'video.mp4');
  if (exists(video)) {
    const code = `
import json
from scenedetect import detect, ContentDetector
scenes = detect(${JSON.stringify(video)}, ContentDetector(threshold=27.0), show_progress=False)
print(json.dumps([[round(s.get_seconds(),2), round(e.get_seconds(),2)] for s,e in scenes]))`;
    plans = JSON.parse(run(PY, ['-c', code]).stdout.trim().split('\n').pop()).map(([d, f]) => ({ debut: d, fin: f }));
  }
  const out = { ep: T.ep, fenetreS: W, courbeRire: courbe, pics, lexique, plans,
    resume: { rires: T.stats.balises.rires || 0, minuteLaPlusDrole: pics[0] ? mmss(pics[0].t) : null, plans: plans ? plans.length : null, hitsLexique: lexique.length } };
  writeJSON(path.join(dir, 'candidats.json'), out);
  return out.resume;
});
