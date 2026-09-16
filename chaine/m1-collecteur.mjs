// M1 — Le Collecteur : métadonnées, miniature, sous-titres auto, vidéo 480p.
// usage : node chaine/m1-collecteur.mjs ep1 [--no-video]
import fs from 'node:fs';
import path from 'node:path';
import { CONFIG, YTDLP, epDir, videoIdOf, run, writeJSON, exists, step } from './lib.mjs';

const ep = process.argv[2];
const noVideo = process.argv.includes('--no-video');
if (!ep) throw new Error('usage : m1-collecteur.mjs epN');
const dir = epDir(ep);
fs.mkdirSync(dir, { recursive: true });
const id = videoIdOf(ep);
const url = `https://www.youtube.com/watch?v=${id}`;
const yt = (args) => run(YTDLP, ['--js-runtimes', 'node', '--no-warnings', ...args]);

function typerLiens(desc) {
  const liens = [];
  const re = /https?:\/\/[^\s)]+/g;
  for (const m of desc.matchAll(re)) {
    const u = m[0].replace(/[.,;:!?]+$/, '');
    let type = 'autre', label = null;
    if (/onvaoushop/i.test(u)) type = 'merch';
    else if (/revolut|nordvpn|sponsor/i.test(u)) type = 'sponsor';
    else if (/instagram\.com\/([^/?]+)/i.test(u)) { type = 'instagram'; label = '@' + u.match(/instagram\.com\/([^/?]+)/i)[1]; }
    else if (/twitch\.tv\/([^/?]+)/i.test(u)) { type = 'twitch'; label = u.match(/twitch\.tv\/([^/?]+)/i)[1]; }
    else if (/twitter\.com\/([^/?]+)|x\.com\/([^/?]+)/i.test(u)) { type = 'x'; label = '@' + (u.match(/(?:twitter|x)\.com\/([^/?]+)/i)[1]); }
    else if (/tiktok/i.test(u)) type = 'tiktok';
    else if (/youtube\.com|youtu\.be/i.test(u)) type = 'youtube';
    // la ligne qui précède le lien dit à quoi il sert
    const idx = desc.indexOf(m[0]);
    const avant = desc.slice(Math.max(0, idx - 120), idx).split('\n').filter(Boolean).pop() || '';
    liens.push({ type, url: u, label, contexte: avant.trim().slice(0, 100) });
  }
  return liens;
}
function coversDe(desc) {
  const i = desc.search(/covers? utilis/i);
  if (i < 0) return [];
  return desc.slice(i).split('\n').slice(1).map(l => l.trim()).filter(l => l && !/^https?:/.test(l));
}

step(ep, 'M1', () => {
  // 1. métadonnées
  const j = JSON.parse(yt(['-j', '--no-download', url]).stdout);
  if (j.live_status && j.live_status !== 'not_live' && j.live_status !== 'was_live') {
    throw new Error(`vidéo pas encore disponible (live_status=${j.live_status})`);
  }
  const num = Number((j.title.match(/ep\s?(\d+)/i) || [])[1]) || Number(ep.replace('ep', ''));
  const meta = {
    ep: num, videoId: j.id, titre: j.title, chaine: j.channel, chaineId: j.channel_id,
    publieLe: new Date(j.timestamp * 1000).toISOString(), dureeS: j.duration,
    vues: j.view_count, likes: j.like_count, commentaires: j.comment_count,
    releveLe: new Date().toISOString(),
    miniature: `https://i.ytimg.com/vi/${j.id}/maxresdefault.jpg`,
    chapitresYouTube: j.chapters || [], heatmap: j.heatmap || null,
    description: j.description || '',
    liens: typerLiens(j.description || ''),
    covers: coversDe(j.description || ''),
    sousTitres: Object.keys(j.automatic_captions || {}).filter(k => k.startsWith('fr')),
  };
  writeJSON(path.join(dir, 'meta.json'), meta);
  // 2. miniature
  run('curl', ['-sL', '-o', path.join(dir, 'miniature.jpg'), meta.miniature]);
  // 3. sous-titres auto (fr-orig = la piste d'origine)
  yt(['--skip-download', '--write-auto-sub', '--sub-lang', 'fr-orig,fr', '--sub-format', 'json3', '-o', path.join(dir, 'captions'), url]);
  const caps = fs.readdirSync(dir).filter(f => f.startsWith('captions.') && f.endsWith('.json3'));
  // 4. vidéo 480p + piste audio (pour whisper et les images)
  let video = false;
  if (!noVideo && !exists(path.join(dir, 'video.mp4'))) {
    yt(['-f', 'bv*[height<=480][ext=mp4]+ba[ext=m4a]/b[height<=480][ext=mp4]/b', '--merge-output-format', 'mp4', '-o', path.join(dir, 'video.mp4'), url]);
    video = true;
  } else video = exists(path.join(dir, 'video.mp4'));
  return { videoId: j.id, dureeS: j.duration, sousTitres: caps, video, vues: j.view_count };
});
