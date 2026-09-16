// M10 — Le Bâtisseur : lit tous les JSON, rend docs/ (site statique), --publish pousse sur GitHub Pages.
// usage : node chaine/m10-batisseur.mjs [--publish]
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, CONFIG, index, epDir, readJSON, writeJSON, exists, run, mmss } from './lib.mjs';

const publish = process.argv.includes('--publish');
const OUT = path.join(ROOT, 'docs');
fs.mkdirSync(path.join(OUT, 'ics'), { recursive: true });
const schedule = readJSON(path.join(ROOT, 'schedule.json'));
const casting = readJSON(path.join(ROOT, 'chaine/casting.json'));
const saisons = readJSON(path.join(ROOT, 'cache/saisons.json'), []);
const cache = readJSON(path.join(ROOT, 'cache/geo.json'), {});
const cle = (v) => v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nb = (n) => n == null ? '—' : n >= 1e6 ? (n / 1e6).toFixed(1).replace('.', ',') + ' M' : n >= 1e3 ? Math.round(n / 1e3) + ' k' : String(n);
const hp = (iso) => new Date(iso).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', second: '2-digit' });
async function geocode(ville) {
  const k = cle(ville); if (cache[k]) return cache[k];
  const u = `https://nominatim.openstreetmap.org/search?format=json&limit=5&featureType=city&q=${encodeURIComponent(ville + ', Canada')}`;
  const r = await (await fetch(u, { headers: { 'User-Agent': CONFIG.userAgent } })).json();
  await new Promise(r => setTimeout(r, 1100));
  const b = r[0]; if (!b) return null;
  cache[k] = { nom: ville, lat: +b.lat, lon: +b.lon, libelle: b.display_name.split(',').slice(0, 2).join(',') };
  writeJSON(path.join(ROOT, 'cache/geo.json'), cache); return cache[k];
}

// ---- données ----
const episodes = [];
for (const e of index().episodes) {
  const dir = epDir('ep' + e.ep);
  if (!exists(path.join(dir, 'moments.json')) || !exists(path.join(dir, 'controle.json'))) continue;
  const ctrl = readJSON(path.join(dir, 'controle.json'));
  if (ctrl.verdict !== 'GO') { console.log(`ep${e.ep} ignoré : ${ctrl.verdict}`); continue; }
  const meta = readJSON(path.join(dir, 'meta.json')), T = readJSON(path.join(dir, 'transcript.json')), C = readJSON(path.join(dir, 'candidats.json')), M = readJSON(path.join(dir, 'moments.json')), G = readJSON(path.join(dir, 'trajet.json')), R = readJSON(path.join(dir, 'run.json'));
  const rires = T.balises.filter(b => b.tag === 'rires').map(b => b.t);
  const autour = (t) => rires.filter(r => Math.abs(r - t) <= 30).length;
  const top10 = M.moments.filter(m => m.type === 'CITATION').map(m => ({ ...m, riresAutour: autour(m.debut) })).sort((a, b) => b.riresAutour - a.riresAutour || a.debut - b.debut).slice(0, 10).sort((a, b) => a.debut - b.debut);
  episodes.push({
    ep: meta.ep, videoId: meta.videoId, titre: meta.titre, publieLe: meta.publieLe, dureeS: meta.dureeS, vues: meta.vues, likes: meta.likes, miniature: meta.miniature,
    liens: meta.liens, covers: meta.covers, chapitres: M.chapitres, moments: M.moments.map(m => ({ type: m.type, debut: m.debut, fin: m.fin, citation: m.citation, propre: m.propre, qui: m.qui, detail: m.detail })),
    top10, fenetreS: C.fenetreS, courbeRire: C.courbeRire, pics: C.pics, trajet: { etapes: G.etapes, troncons: G.troncons, mentions: G.mentions, km: G.kmEpisode },
    stats: { rires: T.stats.balises.rires || 0, moments: M.moments.length, rejets: M.rejets.length, plans: C.resume.plans, mots: T.stats.mots, source: T.source },
    run: R.maillons,
  });
}
episodes.sort((a, b) => a.ep - b.ep);
if (!episodes.length) throw new Error('aucun épisode GO à publier');
const dernier = episodes[episodes.length - 1];
const destination = await geocode(schedule.destinationFinale);
const annoncees = [];
for (const v of ['Halifax', 'Québec', 'Montréal', 'Ottawa', 'Toronto']) { const g = await geocode(v); if (g) annoncees.push({ nom: v, lat: g.lat, lon: g.lon }); }
const kmTotal = episodes.reduce((n, e) => n + (e.trajet.km || 0), 0);
const villes = [...new Set(episodes.flatMap(e => e.trajet.etapes.map(x => x.ville)))];
const riresTotal = episodes.reduce((n, e) => n + e.stats.rires, 0);
const impacts = episodes.flatMap(e => e.moments.filter(m => m.type === 'IMPACT_CAMION').map(m => ({ ...m, ep: e.ep, videoId: e.videoId })));
const rencontres = episodes.flatMap(e => e.moments.filter(m => m.type === 'RENCONTRE' && m.detail?.personne).map(m => ({ ...m, ep: e.ep, videoId: e.videoId })));
const refs = []; const vu = new Set();
for (const e of episodes) for (const m of e.moments) if (m.type === 'REFERENCE' && m.detail?.reference) { const k = cle(m.detail.reference); if (vu.has(k)) continue; vu.add(k); refs.push({ ...m, ep: e.ep, videoId: e.videoId }); }
const carnet = episodes.flatMap(e => e.moments.filter(m => ['OBJET', 'GALERE', 'DRONE', 'IMPACT_CAMION', 'DECISION'].includes(m.type)).map(m => ({ ...m, ep: e.ep, videoId: e.videoId }))).sort((a, b) => a.ep - b.ep || a.debut - b.debut);
const aVenir = (schedule.prevus || []).filter(p => !episodes.some(e => e.ep === p.ep));
const genere = new Date().toISOString();

// ---- .ics ----
for (const p of aVenir) {
  const d = new Date(p.date), f = (x) => x.toISOString().replace(/[-:]|\.\d{3}/g, '');
  fs.writeFileSync(path.join(OUT, `ics/ep${p.ep}.ics`), ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//onvaou//FR', 'BEGIN:VEVENT', `UID:onvaou7-ep${p.ep}@makesaens.github.io`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(d)}`, `DTEND:${f(new Date(d.getTime() + 3600e3))}`, `SUMMARY:On va où 7 · épisode ${p.ep} (prévision)`, `DESCRIPTION:Sortie prévue sur la chaîne de Djilsi. ${CONFIG.pagesUrl}`, 'BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', `DESCRIPTION:Épisode ${p.ep} dans 30 minutes`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n'));
}

// ---- salle des machines ----
const MAILLONS = [
  ['M0', 'Le Veilleur', 'Lit le flux RSS de la chaîne toutes les 5 min. Un nouvel épisode apparaît : il lance la chaîne.'],
  ['M1', 'Le Collecteur', 'Métadonnées, miniature, sous-titres automatiques, vidéo 480p (supprimée ensuite).'],
  ['M2', 'Le Transcripteur', 'Sous-titres → transcript horodaté, balises sonores ([rires], [cri]…). Repli : whisper local.'],
  ['M3', 'Le Découpeur', 'Courbe de rire, lexique horodaté, découpe en plans. Sans IA.'],
  ['M4', 'Le Lecteur', 'Un modèle lit le transcript et sort des moments typés. Chaque moment cite le transcript mot pour mot ou il est rejeté.'],
  ['M5', 'L’Œil', 'Images extraites aux timecodes des moments, lues pour confirmer (texte à l’écran, impacts).'],
  ['M6', 'Les Visages', 'Regroupement local des visages, noms uniquement depuis les mots et les incrustations.'],
  ['M7', 'Le Géographe', 'Villes citées → coordonnées (OpenStreetMap) → tronçons routiers (OSRM).'],
  ['M8', 'Le Carrossier', 'Impacts → zone du camion (14 zones) → modèle 3D.'],
  ['M9', 'Le Contrôleur', 'Vérifie tout mécaniquement : timecodes, citations, étapes prouvées. Verdict GO / NO-GO.'],
  ['M10', 'Le Bâtisseur', 'Rend ce site depuis les JSON et le publie. Aucun modèle n’écrit de HTML.'],
];
const runMap = Object.fromEntries((dernier.run || []).map(m => [m.maillon, m]));
const etat = (id) => id === 'M0' ? ['ok', 'armé · toutes les 5 min'] : id === 'M10' ? ['ok', `rendu ${hp(genere)}`] : ['M5', 'M6', 'M8'].includes(id) ? ['att', 'en construction · samedi'] : runMap[id] ? [runMap[id].ok ? 'ok' : 'ko', `${runMap[id].ok ? 'ok' : 'erreur'} · ${runMap[id].dureeS}s · ${hp(runMap[id].fin)}`] : ['att', 'pas encore passé'];
const outils = [['yt-dlp', run(path.join(ROOT, 'chaine/bin/yt-dlp'), ['--version']).stdout.trim(), 'collecte'], ['Node', process.version, 'chaîne et bâtisseur'], ['Python', run(path.join(ROOT, '.venv/bin/python'), ['--version']).stdout.trim().replace('Python ', ''), 'plans, images, whisper'], ['PySceneDetect', '0.7.1', 'plans'], ['Claude (' + CONFIG.claudeModel + ')', 'claude -p', 'le Lecteur'], ['Nominatim + OSRM', 'OpenStreetMap', 'géographie'], ['Leaflet', '1.9.4', 'la carte'], ['GitHub Pages', 'gratuit', 'hébergement']];

// ---- HTML ----
const DATA = { saison: schedule.saison, schedule, episodes, destination, villesAnnoncees: annoncees, genere };
const epCard = (e) => `<article class="ep"><a class="img" href="https://www.youtube.com/watch?v=${e.videoId}" target="_blank" rel="noopener"><img src="${e.miniature}" alt="" loading="lazy"><span class="num">EP ${e.ep}</span></a><div class="corps"><div class="titre">${esc(e.titre.replace(/\s*-\s*ON VA O.*$/i, ''))}</div><div class="stats"><div><b>${mmss(e.dureeS)}</b><span>durée</span></div><div><b>${nb(e.vues)}</b><span>vues</span></div><div><b>${e.stats.rires}</b><span>rires</span></div><div><b>${e.trajet.km || 0}</b><span>km</span></div></div><div class="villes">${e.trajet.etapes.length ? e.trajet.etapes.map(x => esc(x.ville)).join(' <b>→</b> ') : 'sur place'}</div><div class="liens"><a class="btn sec" href="https://www.youtube.com/watch?v=${e.videoId}" target="_blank" rel="noopener">YouTube</a><span class="cond" style="color:var(--olive);font-size:12px;letter-spacing:.08em;text-transform:uppercase;align-self:center">${e.stats.moments} moments · ${e.chapitres.length} chapitres</span></div></div></article>`;
const epAVenir = (p) => `<article class="ep a-venir"><div class="img"><span>EP ${p.ep}</span></div><div class="corps"><div class="titre">À venir</div><div class="villes">${new Date(p.date).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })} · prévision</div></div></article>`;
const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>On va où 7 — la carte, les épisodes, le camion</title>
<meta name="description" content="Site fan indépendant : la carte du trajet, les étapes, les moments et les épisodes de « On va où 7 » de Djilsi, reconstruits automatiquement à chaque sortie.">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bevan&family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@500;600;700&display=swap">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">
<link rel="stylesheet" href="style.css?v=${Date.now()}">
</head>
<body>
<header class="hero">
  <div id="carte" aria-label="Carte du trajet"></div>
  <div class="voile"></div>
  <div class="haut">
    <div class="marque"><span class="sous">Djilsi · Maxime Biaggi · Joyca · Théodort · Manas</span><h1 class="titre">On va <em>où</em> 7</h1><span class="sous">Le Canada en camping-car · site fan indépendant</span></div>
    <div class="compteur"><div class="n"><b>${episodes.length}</b> / ${schedule.episodesAnnonces}</div><div class="t">épisodes<br>sortis</div></div>
  </div>
  <div class="bas">
    <div class="lecteur">
      <div class="ligne1"><select id="sel-ep" aria-label="Épisode"></select><span class="tc" id="tc">0:00</span><button class="btn sec" id="voir-tc" type="button">Voir ce moment</button></div>
      <div class="chap" id="chap"></div>
      <input id="range" type="range" min="0" max="100" value="100" step="1" aria-label="Position dans l’épisode">
      <div class="legende"><span><i style="background:#efe3c6;border:2px solid #e23a2e"></i>étape</span><span><i style="background:#ff5a4a"></i>vanne</span><span><i style="background:#8fd0f0"></i>rencontre</span><span><i style="background:#f2a33a"></i>galère · choc</span><span>· le camion suit le curseur</span></div>
    </div>
    <div class="duo">
      <a class="carte-ep" href="https://www.youtube.com/watch?v=${dernier.videoId}" target="_blank" rel="noopener"><img src="${dernier.miniature}" alt=""><div class="info"><span class="m">Dernier épisode · ${new Date(dernier.publieLe).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'Europe/Paris' })}</span><span class="t">Ép. ${dernier.ep} · ${esc(dernier.titre.replace(/\s*-\s*ON VA O.*$/i, ''))}</span><span class="m">${mmss(dernier.dureeS)} · ${nb(dernier.vues)} vues</span></div></a>
      <div class="prochain"><span class="eyebrow">Prochain épisode</span><div class="cd" id="cd">—</div><span class="m cond" id="cd-lbl" style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--olive)"></span><div class="actions"><a class="btn" id="ics" href="#" download>Me le rappeler (.ics)</a><a class="btn sec" id="gcal" href="#" target="_blank" rel="noopener">Google Agenda</a></div></div>
    </div>
  </div>
</header>

<main class="wrap">
  <section id="episodes">
    <div class="sec-head"><h2>Les épisodes</h2><p>${kmTotal} km de route reconstitués, ${villes.length} étape${villes.length > 1 ? 's' : ''} (${villes.join(', ')}), ${riresTotal} rires détectés, destination ${esc(schedule.destinationFinale)}.</p></div>
    <div class="grille-ep">${episodes.slice().reverse().map(epCard).join('')}${aVenir.map(epAVenir).join('')}</div>
  </section>

  <section id="citations-sec">
    <div class="sec-head"><h2>Les moments</h2><p>La courbe de rire vient des balises sonores des sous-titres. Les dix citations sont celles qui tombent le plus près d’un pic. Le texte est celui du transcript automatique, corrigé pour l’orthographe, jamais reformulé.</p></div>
    <div class="onglets" id="onglets" role="tablist"></div>
    <div class="courbe" id="courbe"></div>
    <div class="citations" id="citations"></div>
    <h3 style="margin-top:28px">Chapitres</h3>
    <div class="chapitres" id="chapitres"></div>
  </section>

  <section id="casting">
    <div class="sec-head"><h2>Le casting</h2><p>Les cinq de la saison 7, et les rencontres nommées dans les épisodes.</p></div>
    <div class="casting">${casting.map(c => `<article class="perso">${c.avatar ? `<img src="${c.avatar}" alt="">` : `<div style="width:84px;height:84px;border-radius:50%;background:var(--nuit3);border:3px solid var(--creme);box-shadow:0 4px 0 var(--rouge)"></div>`}<div class="nom">${esc(c.nom)}</div><div class="role">${esc(c.role)}${c.abonnes ? ' · ' + nb(c.abonnes) + ' abonnés' : ''}</div><div class="liens">${c.liens.map(l => `<a href="${l.u}" target="_blank" rel="noopener">${esc(l.l)}</a>`).join('')}</div></article>`).join('')}</div>
    ${rencontres.length ? `<h3 style="margin-top:28px">Rencontres</h3><div class="rencontres">${rencontres.map(r => `<div class="renc"><span class="qui">${esc(r.detail.personne)}</span><span class="ctx">${esc(r.detail.contexte || '')}</span><a href="https://youtu.be/${r.videoId}?t=${Math.max(0, Math.floor(r.debut) - 2)}" target="_blank" rel="noopener">Ép. ${r.ep} · ${mmss(r.debut)} →</a></div>`).join('')}</div>` : '<p class="note">Aucune rencontre nommée dans les épisodes analysés. La chaîne ne met un nom que lorsqu’il est prononcé ou affiché à l’écran.</p>'}
  </section>

  <section id="camion">
    <div class="sec-head"><h2>Le camion</h2><p>Le camping-car en 3D avec ses impacts arrive samedi, avec l’épisode 5. En attendant, le carnet de bord : ce qui a été cassé, perdu, décidé.</p></div>
    ${impacts.length ? `<div class="note">${impacts.length} impact${impacts.length > 1 ? 's' : ''} relevé${impacts.length > 1 ? 's' : ''} dans les mots : ${impacts.map(i => `${esc(i.detail.zone)} (ép. ${i.ep}, ${mmss(i.debut)})`).join(' · ')}</div>` : ''}
    <div class="liste" style="margin-top:14px">${carnet.map(m => `<div class="item"><div class="l"><b>${esc(m.type === 'OBJET' ? (m.detail.objet || 'objet') + ' · ' + (m.detail.sort || '') : m.type === 'GALERE' ? 'galère' : m.type === 'DRONE' ? 'drone' : m.type === 'IMPACT_CAMION' ? 'choc · ' + (m.detail.zone || '') : 'décision')}</b><span>${esc(m.detail.quoi || m.detail.sort || m.propre || m.citation)}</span><div class="ep-tag">épisode ${m.ep}</div></div><a href="https://youtu.be/${m.videoId}?t=${Math.max(0, Math.floor(m.debut) - 2)}" target="_blank" rel="noopener">${mmss(m.debut)} →</a></div>`).join('') || '<p class="vide">Rien pour l’instant.</p>'}</div>
  </section>

  <section id="references">
    <div class="sec-head"><h2>Les références</h2><p>Films, memes, musiques, personnalités cités dans les épisodes, et les covers listés par Djilsi en description.</p></div>
    <div class="liste">${refs.map(r => `<div class="item"><div class="l"><b>${esc(r.detail.reference)}</b><span>${esc(r.detail.type || '')} · ${esc(r.propre || r.citation)}</span><div class="ep-tag">épisode ${r.ep}</div></div><a href="https://youtu.be/${r.videoId}?t=${Math.max(0, Math.floor(r.debut) - 2)}" target="_blank" rel="noopener">${mmss(r.debut)} →</a></div>`).join('')}</div>
    ${episodes.some(e => e.covers.length) ? `<h3 style="margin-top:28px">Les covers de la bande-son</h3><div class="liste">${episodes.flatMap(e => e.covers.map(c => `<div class="item"><div class="l"><span>${esc(c)}</span><div class="ep-tag">épisode ${e.ep}</div></div></div>`)).join('')}</div>` : ''}
  </section>

  <section id="saisons">
    <div class="sec-head"><h2>Les saisons d’avant</h2><p>Sept saisons depuis 2019 : la France en Clio, l’Europe, les États-Unis en camping-car, et maintenant le Canada.</p></div>
    <div class="saisons">${saisons.map(s => `<a class="saison ${s.saison === schedule.saison ? 'actuelle' : ''}" href="https://www.youtube.com/playlist?list=${s.playlist}" target="_blank" rel="noopener"><span class="n"><small>Saison</small>${s.saison}</span><span class="d">${s.episodes} épisode${s.episodes > 1 ? 's' : ''}</span><span class="d">${nb(s.vues)} vues</span><span class="d">${Math.round(s.dureeS / 3600 * 10) / 10} h</span></a>`).join('')}</div>
  </section>

  <section id="machines">
    <div class="sec-head"><h2>La salle des machines</h2><p>Ce site n’est écrit par personne. À chaque sortie, une chaîne de maillons va chercher la donnée dans la vidéo, la vérifie, et reconstruit la page. Voici la chaîne, et son dernier passage.</p></div>
    <div class="machines">
      <p class="intro">Dernier passage : épisode ${dernier.ep}, ${dernier.stats.moments} moments retenus, ${dernier.stats.rejets} rejeté${dernier.stats.rejets > 1 ? 's' : ''} pour citation introuvable, transcript ${esc(dernier.stats.source)}. Rendu le ${new Date(genere).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}.</p>
      <div class="maillons">${MAILLONS.map(([id, nm, io]) => { const [st, txt] = etat(id); return `<div class="maillon ${st}"><span class="id">${id}</span><span class="nm">${esc(nm)}</span><span class="io">${esc(io)}</span><span class="st">${esc(txt)}</span></div>`; }).join('')}</div>
      <div class="tw"><table><thead><tr><th>Épisode</th>${['M1', 'M2', 'M3', 'M4', 'M7', 'M9'].map(m => `<th>${m}</th>`).join('')}<th>Moments</th><th>Rejets</th></tr></thead><tbody>${episodes.map(e => { const r = Object.fromEntries((e.run || []).map(m => [m.maillon, m])); return `<tr><td>Ép. ${e.ep}</td>${['M1', 'M2', 'M3', 'M4', 'M7', 'M9'].map(m => `<td>${r[m] ? r[m].dureeS + ' s' : '—'}</td>`).join('')}<td>${e.stats.moments}</td><td>${e.stats.rejets}</td></tr>`; }).join('')}</tbody></table></div>
      <div class="tw"><table><thead><tr><th>Outil</th><th>Version</th><th>Rôle</th></tr></thead><tbody>${outils.map(o => `<tr><td>${esc(o[0])}</td><td>${esc(o[1])}</td><td>${esc(o[2])}</td></tr>`).join('')}</tbody></table></div>
      <div class="pied"><a class="btn" href="https://github.com/makesaens/onvaou" target="_blank" rel="noopener">Le code de la chaîne sur GitHub</a><span class="cond" style="color:var(--olive);font-size:12px;letter-spacing:.08em;text-transform:uppercase">tout est gratuit : yt-dlp, OpenStreetMap, OSRM, Leaflet, GitHub Pages</span></div>
    </div>
  </section>
</main>
<footer><div class="wrap"><p>Projet indépendant de fan, sans lien avec Djilsi, son équipe ou ses partenaires. Les vidéos restent sur YouTube : chaque lien renvoie au moment exact de l’épisode. Les textes cités viennent du transcript automatique et peuvent contenir des erreurs. Fond de carte : imagerie Esri ; routes : OpenStreetMap et OSRM. Une demande de retrait sera honorée immédiatement.</p><p>Construit à Lyon par <a href="https://makesaens.github.io/" target="_blank" rel="noopener">Saens</a>, comme démonstration d’une chaîne qui extrait, vérifie et publie une donnée sans qu’on la ressaisisse.</p></div></footer>
<script>window.DATA=${JSON.stringify(DATA)};</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<script src="app.js?v=${Date.now()}"></script>
</body>
</html>`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
fs.copyFileSync(path.join(ROOT, 'site/style.css'), path.join(OUT, 'style.css'));
fs.copyFileSync(path.join(ROOT, 'site/app.js'), path.join(OUT, 'app.js'));
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
writeJSON(path.join(OUT, 'data.json'), DATA);
console.log(`[M10] docs/ rendu : ${episodes.length} épisodes, ${kmTotal} km, ${villes.join(' → ') || 'aucune étape'}, ${(html.length / 1024).toFixed(0)} Ko`);
if (publish) {
  run('git', ['add', '-A'], { cwd: ROOT });
  run('git', ['-c', 'user.name=onvaou-chaine', '-c', 'user.email=guigs.prat@gmail.com', 'commit', '-q', '-m', `site : épisode ${dernier.ep} (${episodes.length}/${schedule.episodesAnnonces}) — rendu automatique`], { cwd: ROOT, allowFail: true });
  run('git', ['push', '-q', 'origin', 'HEAD:main'], { cwd: ROOT });
  console.log(`[M10] publié → ${CONFIG.pagesUrl}`);
}
