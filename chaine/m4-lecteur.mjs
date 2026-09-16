// M4 — Le Lecteur : Claude lit le transcript et sort moments.json (citations verbatim obligatoires).
// usage : node chaine/m4-lecteur.mjs ep1
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, CONFIG, epDir, run, readJSON, writeJSON, step, mmss, parseMmss } from './lib.mjs';

const ep = process.argv[2];
const dir = epDir(ep);
const T = readJSON(path.join(dir, 'transcript.json'));
const C = readJSON(path.join(dir, 'candidats.json'));
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

step(ep, 'M4', () => {
  const prompt = fs.readFileSync(path.join(ROOT, 'chaine/prompts/lecteur.md'), 'utf8');
  const pics = C.pics.map(p => `${mmss(p.t)} (${p.rires} rires)`).join(', ');
  const lex = C.lexique.filter(l => ['ville', 'choc', 'drone', 'presentation', 'objet'].includes(l.famille)).slice(0, 80).map(l => `${mmss(l.t)} [${l.famille}] ${l.texte}`).join('\n');
  const entree = `${prompt}\n\n=== ÉPISODE ${T.ep} · durée ${mmss(T.dureeVideoS)} ===\nPICS DE RIRE : ${pics}\n\nINDICES LEXICAUX :\n${lex}\n\nTRANSCRIPT (une ligne ≈ 8 s) :\n${T.lignes.join('\n')}\n`;
  const r = run('claude', ['-p', '--output-format', 'json', '--max-turns', '1', '--model', CONFIG.claudeModel], { input: entree });
  const env = JSON.parse(r.stdout);
  let txt = (env.result || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  const i = txt.indexOf('{'); if (i > 0) txt = txt.slice(i);
  const out = JSON.parse(txt);
  // contrôle verbatim : la citation doit exister dans le transcript (normalisé) autour du timecode
  const tout = norm(T.segments.map(s => s.texte).join(' '));
  const moments = [], rejets = [];
  for (const m of out.moments || []) {
    const debut = parseMmss(m.debut), fin = m.fin ? parseMmss(m.fin) : debut + 20;
    const ok = m.citation && tout.includes(norm(m.citation));
    const rec = { ...m, debut, fin, lien: `https://youtu.be/${T.videoId}?t=${Math.max(0, Math.floor(debut) - 2)}` };
    (ok ? moments : rejets).push(ok ? rec : { ...rec, rejet: 'citation introuvable dans le transcript' });
  }
  const chapitres = (out.chapitres || []).map(c => ({ titre: c.titre, debut: parseMmss(c.debut), fin: parseMmss(c.fin) }));
  writeJSON(path.join(dir, 'moments.json'), { ep: T.ep, videoId: T.videoId, modele: CONFIG.claudeModel, chapitres, moments, rejets, coutUSD: env.total_cost_usd ?? null });
  const parType = {}; for (const m of moments) parType[m.type] = (parType[m.type] || 0) + 1;
  return { moments: moments.length, rejets: rejets.length, chapitres: chapitres.length, parType };
});
