/* On va où 7 — logique du site. Tout vient de window.DATA, généré par la chaîne. */
(function () {
  const D = window.DATA;
  const $ = (s, r = document) => r.querySelector(s);
  const mmss = (s) => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
  const lien = (ep, t) => `https://youtu.be/${ep.videoId}?t=${Math.max(0, Math.floor(t) - 2)}`;
  const eps = D.episodes.slice().sort((a, b) => a.ep - b.ep);
  const dernier = eps[eps.length - 1];

  /* ---------- trajet cumulé ---------- */
  const etapes = [], troncons = [];
  for (const e of eps) {
    for (const et of e.trajet.etapes) {
      const last = etapes[etapes.length - 1];
      if (last && last.ville.toLowerCase() === et.ville.toLowerCase()) { last.fin = et.fin; last.ep = e.ep; continue; }
      etapes.push({ ...et, ep: e.ep });
    }
    for (const t of e.trajet.troncons) troncons.push({ ...t, ep: e.ep });
    // tronçon entre le dernier lieu de l'épisode précédent et le premier de celui-ci
  }
  const dest = D.schedule.destinationFinale;
  const destGeo = D.destination; // {lat,lon} géocodé par la chaîne
  const actuelle = etapes[etapes.length - 1];

  /* position d'un timecode d'un épisode sur la carte */
  function position(ep, t) {
    const E = etapes.filter(x => x.ep === ep.ep), T = troncons.filter(x => x.ep === ep.ep);
    for (const tr of T) if (t >= tr.debut && t <= tr.fin) {
      const f = (t - tr.debut) / Math.max(1, tr.fin - tr.debut);
      const c = tr.coords, i = Math.min(c.length - 2, Math.floor(f * (c.length - 1))), g = f * (c.length - 1) - i;
      return [c[i][1] + (c[i + 1][1] - c[i][1]) * g, c[i][0] + (c[i + 1][0] - c[i][0]) * g];
    }
    let best = null;
    for (const et of E) { if (t >= et.debut - 1) best = et; }
    if (!best && E[0]) best = E[0];
    if (!best) { // pas d'étape : la dernière connue avant cet épisode
      const avant = etapes.filter(x => x.ep < ep.ep); best = avant[avant.length - 1]; }
    return best ? [best.lat, best.lon] : null;
  }

  /* ---------- carte ---------- */
  const carte = L.map('carte', { zoomControl: false, attributionControl: true, scrollWheelZoom: false });
  L.control.zoom({ position: 'bottomright' }).addTo(carte);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 17, attribution: 'Imagerie © Esri, Maxar, Earthstar Geographics · Routes © OpenStreetMap / OSRM' }).addTo(carte);
  const faits = troncons.flatMap(t => t.coords.map(c => [c[1], c[0]]));
  if (faits.length) L.polyline(faits, { className: 'route-faite' }).addTo(carte);
  if (actuelle && destGeo && actuelle.ville.toLowerCase() !== dest.toLowerCase()) {
    L.polyline([[actuelle.lat, actuelle.lon], [destGeo.lat, destGeo.lon]], { className: 'route-future' }).addTo(carte);
  }
  const etiquette = (txt, cls = '') => L.divIcon({ className: '', html: `<div class="ville-etiquette ${cls}">${txt}</div>`, iconSize: [0, 0] });
  const point = (cls) => L.divIcon({ className: '', html: `<div class="${cls}"></div>`, iconSize: [0, 0] });
  for (const et of etapes) {
    L.marker([et.lat, et.lon], { icon: point('pt-etape'), interactive: true }).addTo(carte)
      .bindPopup(`<div class="type">Étape · épisode ${et.ep}</div><div class="cit">${et.propre || et.citation}</div><a href="${et.lien}" target="_blank" rel="noopener">Voir à ${mmss(et.debut)} →</a>`);
    L.marker([et.lat, et.lon], { icon: etiquette(et.ville), interactive: false }).addTo(carte);
  }
  if (destGeo) {
    L.marker([destGeo.lat, destGeo.lon], { icon: L.divIcon({ className: '', html: `<svg class="pin-dest" width="34" height="46" viewBox="0 0 34 46"><path d="M17 45C17 45 2 27 2 16A15 15 0 0 1 32 16C32 27 17 45 17 45Z" fill="#e23a2e" stroke="#efe3c6" stroke-width="2"/><circle cx="17" cy="16" r="6" fill="#efe3c6"/></svg>`, iconSize: [0, 0] }), interactive: false }).addTo(carte);
    L.marker([destGeo.lat, destGeo.lon], { icon: etiquette(dest, 'dest'), interactive: false }).addTo(carte);
    if (D.villesAnnoncees) for (const v of D.villesAnnoncees) {
      if (etapes.some(e => e.ville.toLowerCase() === v.nom.toLowerCase()) || v.nom.toLowerCase() === dest.toLowerCase()) continue;
      L.marker([v.lat, v.lon], { icon: etiquette('?', 'future'), interactive: false }).addTo(carte);
    }
  }
  // moments sur la route
  const TYPES = ['CITATION', 'RENCONTRE', 'GALERE', 'IMPACT_CAMION', 'DRONE', 'OBJET'];
  for (const e of eps) for (const m of e.moments) {
    if (!TYPES.includes(m.type)) continue;
    const p = position(e, m.debut); if (!p) continue;
    const j = 0.012; const pos = [p[0] + (Math.random() - .5) * j, p[1] + (Math.random() - .5) * j * 1.6];
    L.marker(pos, { icon: point('pt-moment ' + m.type) }).addTo(carte)
      .bindPopup(`<div class="type">${m.type.replace('_', ' ')} · ép. ${e.ep} · ${mmss(m.debut)}</div><div class="cit">${m.propre || m.citation}</div><a href="${lien(e, m.debut)}" target="_blank" rel="noopener">Voir sur YouTube →</a>`);
  }
  const tous = faits.concat(etapes.map(e => [e.lat, e.lon]), destGeo ? [[destGeo.lat, destGeo.lon]] : []);
  if (tous.length) carte.fitBounds(L.latLngBounds(tous).pad(0.18)); else carte.setView([46.5, -70], 5);

  // le camion
  const camionIcon = L.divIcon({ className: '', html: `<svg class="camion-marqueur" width="54" height="34" viewBox="0 0 54 34"><rect x="12" y="4" width="40" height="20" rx="3" fill="#efe3c6" stroke="#2a1f14" stroke-width="2"/><path d="M12 12H4a3 3 0 0 0-3 3v7a2 2 0 0 0 2 2h9z" fill="#efe3c6" stroke="#2a1f14" stroke-width="2"/><rect x="4" y="14" width="7" height="5" fill="#8fd0f0"/><rect x="18" y="8" width="9" height="6" fill="#8fd0f0"/><rect x="36" y="8" width="9" height="6" fill="#8fd0f0"/><path d="M14 19h36" stroke="#e23a2e" stroke-width="3"/><circle cx="14" cy="26" r="5" fill="#2a1f14"/><circle cx="14" cy="26" r="2" fill="#efe3c6"/><circle cx="42" cy="26" r="5" fill="#2a1f14"/><circle cx="42" cy="26" r="2" fill="#efe3c6"/></svg>`, iconSize: [0, 0] });
  const camion = L.marker(actuelle ? [actuelle.lat, actuelle.lon] : [46, -70], { icon: camionIcon, interactive: false, zIndexOffset: 1000 }).addTo(carte);

  /* ---------- lecteur (curseur temps) ---------- */
  const sel = $('#sel-ep'), range = $('#range'), tcEl = $('#tc'), chapEl = $('#chap');
  for (const e of eps) { const o = document.createElement('option'); o.value = e.ep; o.textContent = `Épisode ${e.ep} · ${mmss(e.dureeS)}`; sel.appendChild(o); }
  let cur = dernier;
  function majLecteur() {
    const t = +range.value;
    tcEl.textContent = mmss(t);
    const ch = cur.chapitres.find(c => t >= c.debut && t < c.fin);
    chapEl.textContent = ch ? ch.titre : '';
    const p = position(cur, t); if (p) camion.setLatLng(p);
  }
  sel.value = dernier.ep;
  sel.addEventListener('change', () => { cur = eps.find(e => e.ep === +sel.value); range.max = cur.dureeS; range.value = cur.dureeS; majLecteur(); });
  range.max = cur.dureeS; range.value = cur.dureeS; range.addEventListener('input', majLecteur); majLecteur();
  $('#voir-tc').addEventListener('click', () => window.open(lien(cur, +range.value), '_blank'));

  /* ---------- compte à rebours ---------- */
  const now = Date.now();
  const proch = (D.schedule.prevus || []).map(p => ({ ...p, d: new Date(p.date) })).filter(p => p.d > now && !eps.some(e => e.ep === p.ep))[0];
  const cd = $('#cd'), cdLbl = $('#cd-lbl');
  function tick() {
    if (!proch) { cd.textContent = 'Saison terminée'; return; }
    let s = Math.max(0, Math.floor((proch.d - Date.now()) / 1000));
    const j = Math.floor(s / 86400); s -= j * 86400; const h = Math.floor(s / 3600); s -= h * 3600; const m = Math.floor(s / 60); s -= m * 60;
    cd.innerHTML = (j ? j + '<small>j</small> ' : '') + String(h).padStart(2, '0') + '<small>h</small> ' + String(m).padStart(2, '0') + '<small>min</small> ' + String(s).padStart(2, '0') + '<small>s</small>';
  }
  if (proch) {
    cdLbl.textContent = `Épisode ${proch.ep} · ${proch.d.toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })} (prévision)`;
    $('#ics').href = `ics/ep${proch.ep}.ics`;
    const g = (d) => d.toISOString().replace(/[-:]|\.\d{3}/g, '');
    $('#gcal').href = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('On va où 7 · épisode ' + proch.ep)}&dates=${g(proch.d)}/${g(new Date(proch.d.getTime() + 3600e3))}&details=${encodeURIComponent('Sortie prévue sur la chaîne de Djilsi. ' + location.href)}`;
    tick(); setInterval(tick, 1000);
  } else { cd.textContent = 'Saison terminée'; cdLbl.textContent = '6 épisodes sur 6'; $('#ics').hidden = true; $('#gcal').hidden = true; }

  /* ---------- onglets citations + courbe ---------- */
  const ong = $('#onglets'), grille = $('#citations'), courbe = $('#courbe');
  function rendreEp(e) {
    for (const b of ong.children) b.setAttribute('aria-selected', String(+b.dataset.ep === e.ep));
    const W = e.fenetreS, max = Math.max(1, ...e.courbeRire.map(c => c.rires));
    const w = 1000, h = 80, n = e.courbeRire.length;
    const pts = e.courbeRire.map((c, i) => `${(i / (n - 1)) * w},${h - (c.rires / max) * (h - 8)}`).join(' ');
    courbe.innerHTML = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline points="0,${h} ${pts} ${w},${h}" fill="rgba(226,58,46,.25)" stroke="none"/><polyline points="${pts}" fill="none" stroke="#ff5a4a" stroke-width="2"/>${e.pics.slice(0, 3).map(p => `<circle cx="${(p.t / e.dureeS) * w}" cy="${h - (p.rires / max) * (h - 8)}" r="5" fill="#efe3c6"/>`).join('')}</svg><div class="lg"><span>0:00</span><span>${e.stats.rires} rires détectés · minute la plus drôle ${e.pics[0] ? mmss(e.pics[0].t) : '—'}</span><span>${mmss(e.dureeS)}</span></div>`;
    grille.innerHTML = e.top10.map(m => `<article class="cit"><span class="rires">${m.riresAutour} rires autour</span><p class="q">${m.propre || m.citation}</p><div class="meta"><span>${m.qui || 'quelqu’un'} · ${mmss(m.debut)}</span><a href="${lien(e, m.debut)}" target="_blank" rel="noopener">Voir →</a></div><div class="preuve"><b>transcript automatique</b> · ${m.citation}</div></article>`).join('') || '<p class="vide">Aucune citation retenue.</p>';
    $('#chapitres').innerHTML = e.chapitres.map(c => `<a class="chap" href="${lien(e, c.debut)}" target="_blank" rel="noopener"><span class="tc">${mmss(c.debut)}</span><span class="ti">${c.titre}</span></a>`).join('');
  }
  for (const e of eps) { const b = document.createElement('button'); b.dataset.ep = e.ep; b.textContent = `Ép. ${e.ep}`; b.setAttribute('role', 'tab'); b.addEventListener('click', () => rendreEp(e)); ong.appendChild(b); }
  rendreEp(dernier);
})();
