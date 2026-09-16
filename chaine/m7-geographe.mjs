// M7 — Le Géographe : villes des moments → Nominatim (cache) → OSRM → trajet.geojson
// usage : node chaine/m7-geographe.mjs ep1
import path from 'node:path';
import { ROOT, CONFIG, epDir, readJSON, writeJSON, step } from './lib.mjs';

const ep = process.argv[2];
const dir = epDir(ep);
const M = readJSON(path.join(dir, 'moments.json'));
const cachePath = path.join(ROOT, 'cache/geo.json');
const cache = readJSON(cachePath, {});
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const H = { 'User-Agent': CONFIG.userAgent, 'Accept-Language': 'fr' };
const cle = (v) => v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

async function geocode(ville) {
  const k = cle(ville);
  if (cache[k]) return cache[k];
  for (const q of [`${ville}, Canada`, ville]) {
    const u = `https://nominatim.openstreetmap.org/search?format=json&limit=5&featureType=city&q=${encodeURIComponent(q)}`;
    const r = await (await fetch(u, { headers: H })).json();
    await sleep(1100);
    const best = r.find(x => ['city', 'town', 'village', 'municipality', 'administrative'].includes(x.type) || x.class === 'place') || r[0];
    if (best) { cache[k] = { nom: ville, lat: +best.lat, lon: +best.lon, libelle: best.display_name.split(',').slice(0, 2).join(',') }; writeJSON(cachePath, cache); return cache[k]; }
  }
  return null;
}
async function route(a, b) {
  const k = `route:${cle(a.nom)}>${cle(b.nom)}`;
  if (cache[k]) return cache[k];
  const u = `https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=simplified&geometries=geojson`;
  const r = await (await fetch(u, { headers: H })).json();
  const rt = r.routes?.[0];
  if (!rt) return null;
  cache[k] = { km: Math.round(rt.distance / 1000), minutes: Math.round(rt.duration / 60), coords: rt.geometry.coordinates };
  writeJSON(cachePath, cache);
  return cache[k];
}

const res = await (async () => {
  const villes = M.moments.filter(m => m.type === 'VILLE' && m.detail?.ville && ['arrivee', 'passage'].includes(m.detail.action)).sort((a, b) => a.debut - b.debut);
  // une étape par ville, à la première arrivée ; on garde le dernier départ connu
  const etapes = [];
  for (const m of villes) {
    const last = etapes[etapes.length - 1];
    if (last && cle(last.ville) === cle(m.detail.ville)) { last.fin = Math.max(last.fin, m.fin); continue; }
    const g = await geocode(m.detail.ville);
    if (!g) continue;
    etapes.push({ ville: m.detail.ville, lat: g.lat, lon: g.lon, libelle: g.libelle, debut: m.debut, fin: m.fin, action: m.detail.action, citation: m.citation, lien: m.lien });
  }
  const troncons = [];
  // liaison avec l'épisode précédent : de sa dernière étape à la première de celui-ci
  const num = Number(ep.replace('ep', ''));
  const prev = num > 1 ? readJSON(path.join(ROOT, 'episodes', 'ep' + (num - 1), 'trajet.json'), null) : null;
  const derniere = prev?.etapes?.[prev.etapes.length - 1];
  if (derniere && etapes[0] && cle(derniere.ville) !== cle(etapes[0].ville)) {
    const r = await route(derniere, etapes[0]);
    if (r) troncons.push({ de: derniere.ville, a: etapes[0].ville, km: r.km, minutes: r.minutes, coords: r.coords, debut: 0, fin: etapes[0].debut, liaison: true });
  }
  for (let i = 0; i + 1 < etapes.length; i++) {
    const r = await route(etapes[i], etapes[i + 1]);
    if (r) troncons.push({ de: etapes[i].ville, a: etapes[i + 1].ville, km: r.km, minutes: r.minutes, coords: r.coords, debut: etapes[i].fin, fin: etapes[i + 1].debut });
  }
  const mentions = M.moments.filter(m => m.type === 'VILLE' && m.detail?.action === 'mention').map(m => ({ ville: m.detail.ville, debut: m.debut, citation: m.citation }));
  const out = { ep: M.ep, videoId: M.videoId, etapes, troncons, mentions, kmEpisode: troncons.reduce((n, t) => n + t.km, 0) };
  writeJSON(path.join(dir, 'trajet.json'), out);
  return { etapes: etapes.map(e => e.ville), km: out.kmEpisode, mentions: mentions.length };
})();
step(ep, 'M7', () => res);
