// Outils communs de la chaîne. Aucune dépendance.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, 'chaine/config.json'), 'utf8'));
export const YTDLP = path.join(ROOT, 'chaine/bin/yt-dlp');
export const PY = path.join(ROOT, '.venv/bin/python');

export const epDir = (ep) => path.join(ROOT, 'episodes', ep);
export const readJSON = (p, fallback) => fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fallback;
export const writeJSON = (p, data) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(data, null, 2)); };
export const exists = (p) => fs.existsSync(p);

export function index() { return readJSON(path.join(ROOT, 'episodes/index.json'), { saison: 7, episodes: [] }); }
export function videoIdOf(ep) {
  const n = Number(ep.replace(/^ep/, ''));
  const e = index().episodes.find((x) => x.ep === n);
  if (!e) throw new Error(`${ep} absent de episodes/index.json`);
  return e.id;
}

export function run(cmd, args, opts = {}) {
  const env = { ...process.env, PATH: `${CONFIG.ffmpegDir}:${process.env.PATH}` };
  delete env.CLAUDECODE;
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 28, env, ...opts });
  if (r.status !== 0 && !opts.allowFail) {
    throw new Error(`${path.basename(cmd)} a échoué (${r.status}) : ${(r.stderr || '').split('\n').filter(l => /ERROR/.test(l)).slice(-3).join(' | ') || r.stderr?.slice(-400)}`);
  }
  return r;
}

export const mmss = (s) => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
export const parseMmss = (t) => { const p = String(t).split(':').map(Number); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + (p[1] || 0); };

// Journal d'exécution : un enregistrement par maillon, dans episodes/epN/run.json
export function step(ep, maillon, fn) {
  const p = path.join(epDir(ep), 'run.json');
  const log = readJSON(p, { ep, maillons: [] });
  const t0 = Date.now();
  const rec = { maillon, debut: new Date(t0).toISOString(), ok: false };
  try {
    const out = fn() || {};
    Object.assign(rec, out, { ok: true });
    return out;
  } catch (e) {
    rec.erreur = String(e.message || e);
    throw e;
  } finally {
    rec.fin = new Date().toISOString();
    rec.dureeS = Math.round((Date.now() - t0) / 1000);
    log.maillons = log.maillons.filter((m) => m.maillon !== maillon).concat(rec);
    writeJSON(p, log);
    console.log(`[${ep}] ${maillon} ${rec.ok ? 'ok' : 'ERREUR'} en ${rec.dureeS}s${rec.erreur ? ' — ' + rec.erreur : ''}`);
  }
}
