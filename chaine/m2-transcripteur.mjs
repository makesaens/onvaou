// M2 — Le Transcripteur : json3 YouTube → transcript.json ; repli mlx-whisper local.
// usage : node chaine/m2-transcripteur.mjs ep1
import fs from 'node:fs';
import path from 'node:path';
import { PY, CONFIG, epDir, run, readJSON, writeJSON, exists, step, mmss } from './lib.mjs';

const ep = process.argv[2];
const dir = epDir(ep);
const meta = readJSON(path.join(dir, 'meta.json'));

function depuisJson3(p) {
  const d = JSON.parse(fs.readFileSync(p, 'utf8'));
  const segs = [], tags = [];
  for (const e of d.events || []) {
    if (!e.segs) continue;
    const raw = e.segs.map(s => s.utf8 || '').join('').replace(/\n/g, ' ').trim();
    if (!raw) continue;
    const t = e.tStartMs / 1000, fin = t + (e.dDurationMs || 0) / 1000;
    for (const m of raw.matchAll(/\[([^\]]+)\]/g)) {
      const tag = m[1].trim().toLowerCase();
      if (!/^_+$/.test(tag)) tags.push({ t: +t.toFixed(2), tag });
    }
    const texte = raw.replace(/\[[^\]]+\]/g, '').replace(/\s+/g, ' ').trim();
    if (texte) segs.push({ debut: +t.toFixed(2), fin: +fin.toFixed(2), texte });
  }
  return { segs, tags };
}

function depuisWhisper() {
  const audio = path.join(dir, 'video.mp4');
  if (!exists(audio)) throw new Error('pas de vidéo pour whisper');
  const out = path.join(dir, 'whisper.json');
  const code = `
import json, mlx_whisper
r = mlx_whisper.transcribe(${JSON.stringify(audio)}, path_or_hf_repo="mlx-community/whisper-large-v3-turbo", language="fr", word_timestamps=False)
json.dump(r, open(${JSON.stringify(out)}, "w"), ensure_ascii=False)
`;
  run(PY, ['-c', code]);
  const r = JSON.parse(fs.readFileSync(out, 'utf8'));
  return { segs: r.segments.map(s => ({ debut: +s.start.toFixed(2), fin: +s.end.toFixed(2), texte: s.text.trim() })).filter(s => s.texte), tags: [] };
}

step(ep, 'M2', () => {
  const caps = fs.readdirSync(dir).filter(f => f.startsWith('captions.') && f.endsWith('.json3'));
  const pref = caps.find(f => f.includes('fr-orig')) || caps[0];
  let src, data;
  if (pref) { src = 'youtube-auto:' + pref; data = depuisJson3(path.join(dir, pref)); }
  else { src = 'mlx-whisper-large-v3-turbo'; data = depuisWhisper(); }
  const { segs, tags } = data;
  const dernier = segs.length ? segs[segs.length - 1].fin : 0;
  const mots = segs.reduce((n, s) => n + s.texte.split(/\s+/).length, 0);
  const compte = {};
  for (const t of tags) compte[t.tag] = (compte[t.tag] || 0) + 1;
  const transcript = {
    ep: meta.ep, videoId: meta.videoId, source: src, dureeVideoS: meta.dureeS,
    stats: { segments: segs.length, mots, dernierTimecodeS: dernier, motsParMinute: +(mots / (meta.dureeS / 60)).toFixed(1), balises: compte },
    segments: segs, balises: tags,
    // version compacte pour les lecteurs : une ligne par ~8 s
    lignes: (() => { const L = []; let cur = null; for (const s of segs) { if (!cur || s.debut - cur.t > 8) { if (cur) L.push(cur); cur = { t: s.debut, texte: s.texte }; } else cur.texte += ' ' + s.texte; } if (cur) L.push(cur); return L.map(l => `${mmss(l.t)} ${l.texte}`); })(),
  };
  writeJSON(path.join(dir, 'transcript.json'), transcript);
  if (meta.dureeS - dernier > 90) throw new Error(`transcript incomplet : dernier segment à ${mmss(dernier)} pour ${mmss(meta.dureeS)}`);
  return { source: src, segments: segs.length, mots, balises: compte };
});
