// M0 — Le Veilleur : lit le flux RSS de la chaîne, détecte un nouvel épisode, l'inscrit et lance la chaîne.
// usage : node chaine/m0-veilleur.mjs [--auto]   (lancé toutes les 5 min par launchd)
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { ROOT, CONFIG, index, writeJSON, readJSON, run, YTDLP } from './lib.mjs';

const auto = process.argv.includes('--auto');
const logp = path.join(ROOT, 'cache/veilleur.log');
const log = (m) => { const l = `${new Date().toISOString()} ${m}\n`; fs.appendFileSync(logp, l); process.stdout.write(l); };
const lock = path.join(ROOT, 'cache/veilleur.lock');
if (fs.existsSync(lock) && Date.now() - fs.statSync(lock).mtimeMs < 90 * 60 * 1000) { log('chaîne déjà en cours, je passe'); process.exit(0); }

const xml = await (await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CONFIG.channelId}`, { headers: { 'User-Agent': CONFIG.userAgent } })).text();
const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m => ({
  id: (m[1].match(/<yt:videoId>([^<]+)/) || [])[1],
  titre: (m[1].match(/<title>([^<]+)/) || [])[1]?.replace(/&amp;/g, '&'),
  publie: (m[1].match(/<published>([^<]+)/) || [])[1],
}));
const idx = index();
const connus = new Set(idx.episodes.map(e => e.id));
const nouveaux = entries.filter(e => e.id && !connus.has(e.id) && e.titre.toUpperCase().includes(CONFIG.titreMotif) && new RegExp(`O[ÙU] ${CONFIG.saison}\\b`, 'i').test(e.titre));
if (!nouveaux.length) { log(`rien de neuf (${entries.length} entrées, dernier : ${entries[0]?.titre?.slice(0, 50)})`); process.exit(0); }

for (const n of nouveaux.reverse()) {
  // disponible ? (une Première apparaît dans le flux avant d'être lisible)
  const r = run(YTDLP, ['--js-runtimes', 'node', '--no-warnings', '-j', '--no-download', `https://www.youtube.com/watch?v=${n.id}`], { allowFail: true });
  let j = null; try { j = JSON.parse(r.stdout); } catch {}
  if (!j || (j.live_status && !['not_live', 'was_live'].includes(j.live_status))) { log(`${n.id} « ${n.titre} » annoncé mais pas encore lisible (${j?.live_status || 'erreur'}), on réessaie au prochain tour`); continue; }
  const num = Number((n.titre.match(/ep\s?(\d+)/i) || [])[1]) || (Math.max(0, ...idx.episodes.map(e => e.ep)) + 1);
  idx.episodes.push({ ep: num, id: n.id, detecteLe: new Date().toISOString(), publieLe: n.publie });
  idx.episodes.sort((a, b) => a.ep - b.ep);
  writeJSON(path.join(ROOT, 'episodes/index.json'), idx);
  log(`NOUVEL ÉPISODE ep${num} ${n.id} « ${n.titre} » publié ${n.publie} → lancement de la chaîne${auto ? ' (auto)' : ''}`);
  fs.writeFileSync(lock, String(process.pid));
  const out = fs.openSync(path.join(ROOT, `cache/run-ep${num}.log`), 'a');
  const child = spawn('node', [path.join(ROOT, 'chaine/run.mjs'), `ep${num}`, ...(auto ? ['--auto'] : [])], { detached: true, stdio: ['ignore', out, out], cwd: ROOT });
  child.on('exit', () => { try { fs.unlinkSync(lock); } catch {} });
  child.unref();
}
