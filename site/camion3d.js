/* Le camion, façon diorama jouet. Modélisé en code d'après les photos du CanaDream (Ford E-450).
   Repère : x = longueur (avant = +x) · y = hauteur · z = largeur, GAUCHE (conducteur) = −z, DROITE (porte) = +z.
   Les zones d'impact viennent de chaine/zones-camion.json (window.DATA.camion.zones). */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const conteneur = document.getElementById('camion3d');
if (conteneur) {
  const D = window.DATA;
  const impacts = (D.camion && D.camion.impacts) || [];
  const ZONES = (D.camion && D.camion.zones) || {};
  const G = -1, DR = 1; // signe z : DR (droite) = +z, G (gauche) = −z … lisible dans le code : z = DR * 1.3 → côté droit
  const scene = new THREE.Scene();
  const rendu = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  rendu.setPixelRatio(Math.min(2, devicePixelRatio)); rendu.outputColorSpace = THREE.SRGBColorSpace;
  rendu.shadowMap.enabled = true; rendu.shadowMap.type = THREE.PCFSoftShadowMap;
  rendu.toneMapping = THREE.ACESFilmicToneMapping; rendu.toneMappingExposure = 1.05;
  conteneur.prepend(rendu.domElement);
  scene.environment = new THREE.PMREMGenerator(rendu).fromScene(new RoomEnvironment(), 0.04).texture;

  const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0, ...o });
  const M = {
    blanc: mat(0xf5f2eb), creme: mat(0xe9e4d8), noir: mat(0x25262a, { roughness: .55 }), gris: mat(0x9a9ea6), grisClair: mat(0xd6d8dc), alu: mat(0xcfd2d6, { roughness: .35, metalness: .4 }),
    verre: mat(0x2c4356, { roughness: .2, metalness: .15 }), chrome: mat(0xe6e8ec, { roughness: .25, metalness: .7 }), rouge: mat(0xd8332b), ambre: mat(0xf6b04a, { emissive: 0x7a4200, emissiveIntensity: .3 }),
    pneu: mat(0x232326, { roughness: .95 }), passage: mat(0x3a3b3f, { roughness: .9 }), gazon: mat(0xa9c98a, { roughness: .95 }), terre: mat(0x6b4f3a, { roughness: 1 }), tronc: mat(0x8a6a4a), feuille: mat(0x8fbf7a), feuilleRouge: mat(0xe07a52), pierre: mat(0xb9b6ad),
  };
  const camion = new THREE.Group(); scene.add(camion);
  const add = (geo, m, x, y, z, { rx = 0, ry = 0, rz = 0, parent = camion, ombre = true } = {}) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = ombre; o.receiveShadow = true; parent.add(o); return o; };
  const rbox = (w, h, d, r = 0.1) => new RoundedBoxGeometry(w, h, d, 6, r);
  const L = 2.5; // largeur cellule

  /* ---------- CELLULE ---------- */
  add(rbox(5.7, 2.45, L, 0.22), M.blanc, -1.6, 2.0, 0);                                       // caisse
  add(rbox(5.75, 0.14, L + 0.04, 0.06), M.alu, -1.6, 3.2, 0, { ombre: false });                // profilé alu du toit
  add(rbox(5.75, 0.12, L + 0.03, 0.05), M.alu, -1.6, 0.8, 0, { ombre: false });                // jupe basse
  add(rbox(0.9, 0.3, 0.9, 0.1), M.grisClair, -2.6, 3.42, 0);                                   // climatiseur
  add(rbox(0.6, 0.1, 0.5, 0.04), M.grisClair, 0.0, 3.32, 0.35);                                 // lanterneau
  add(rbox(0.5, 0.1, 0.5, 0.04), M.grisClair, -4.0, 3.32, -0.5);
  // store côté droit : rouleau + deux bras
  add(new THREE.CylinderGeometry(0.09, 0.09, 5.2, 12), M.alu, -1.6, 3.05, DR * (L / 2 + 0.1), { rz: Math.PI / 2 });
  for (const x of [-3.9, 0.7]) add(new THREE.BoxGeometry(0.05, 2.1, 0.05), M.alu, x, 2.0, DR * (L / 2 + 0.06), { ombre: false });
  // fenêtres : cadre crème + vitre. Gauche (−z) : deux grandes. Droite (+z) : une grande, une petite, la porte.
  const fenetre = (w, h, x, y, side) => { const z = side * (L / 2); add(rbox(w + 0.12, h + 0.12, 0.05, 0.03), M.creme, x, y, z + side * 0.01, { ombre: false }); add(new THREE.PlaneGeometry(w, h), M.verre, x, y, z + side * 0.045, { ry: side > 0 ? 0 : Math.PI, ombre: false }); };
  fenetre(1.4, 0.8, 0.0, 2.25, G); fenetre(1.15, 0.8, -2.4, 2.25, G);
  fenetre(1.3, 0.8, 0.3, 2.25, DR); fenetre(0.55, 0.6, -1.5, 2.2, DR);
  // porte côté droit : panneau, hublot, poignée, marchepied
  add(rbox(0.85, 1.9, 0.06, 0.04), M.creme, -3.0, 1.78, DR * (L / 2 + 0.01), { ombre: false });
  add(new THREE.PlaneGeometry(0.5, 0.5), M.verre, -3.0, 2.3, DR * (L / 2 + 0.05), { ombre: false });
  add(rbox(0.05, 0.3, 0.06, 0.02), M.noir, -3.35, 1.65, DR * (L / 2 + 0.06), { ombre: false });
  add(rbox(0.75, 0.06, 0.4, 0.03), M.alu, -3.0, 0.6, DR * (L / 2 + 0.15));
  // trappes de rangement (gauche : deux + une grande ; droite : deux) avec leur petite serrure
  const trappe = (w, x, side) => { const z = side * (L / 2 + 0.015); add(rbox(w, 0.5, 0.04, 0.03), M.grisClair, x, 1.05, z, { ombre: false }); add(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 8), M.noir, x + w / 2 - 0.12, 1.05, z + side * 0.02, { rx: Math.PI / 2, ombre: false }); };
  trappe(0.9, -0.5, G); trappe(0.9, -1.6, G); trappe(1.3, -3.4, G); trappe(1.0, -0.7, DR); trappe(1.0, -3.9, DR);
  // arrière : pare-chocs, feux, échelle, plaque
  add(rbox(0.28, 0.3, L + 0.05, 0.08), M.alu, -4.55, 0.72, 0);
  for (const s of [G, DR]) { add(rbox(0.08, 0.42, 0.28, 0.05), M.rouge, -4.5, 1.35, s * 1.0, { ombre: false }); add(rbox(0.08, 0.14, 0.28, 0.04), M.ambre, -4.5, 1.05, s * 1.0, { ombre: false }); }
  add(rbox(0.04, 0.22, 0.5, 0.02), M.creme, -4.5, 1.0, 0, { ombre: false });
  for (const y of [1.3, 1.7, 2.1, 2.5, 2.9]) add(new THREE.BoxGeometry(0.06, 0.05, 0.4), M.alu, -4.52, y, G * 0.6, { ombre: false });
  for (const z of [0.42, 0.78]) add(new THREE.BoxGeometry(0.06, 2.0, 0.05), M.alu, -4.52, 2.1, G * z, { ombre: false });

  /* ---------- CAPUCINE (au-dessus de la cabine, nez arrondi) ---------- */
  add(rbox(3.1, 1.15, L - 0.1, 0.4), M.blanc, 2.7, 2.72, 0);
  add(rbox(1.2, 0.35, 1.6, 0.12), M.creme, 4.05, 2.45, 0, { ombre: false });                   // bandeau bas du nez
  // feuille d'érable (pas de logo : c'est une marque)
  { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#c7312a'; g.beginPath();
    const P = [[128, 16], [145, 50], [167, 38], [161, 74], [204, 64], [180, 102], [216, 118], [172, 138], [180, 176], [140, 158], [128, 240], [116, 158], [76, 176], [84, 138], [40, 118], [76, 102], [52, 64], [95, 74], [89, 38], [111, 50]];
    g.moveTo(...P[0]); for (const p of P.slice(1)) g.lineTo(...p); g.closePath(); g.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    add(new THREE.PlaneGeometry(0.55, 0.55), new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: .5 }), 4.26, 2.88, 0, { ry: Math.PI / 2, ombre: false }); }

  /* ---------- CABINE FORD E-450 ---------- */
  add(rbox(1.75, 1.6, 2.15, 0.16), M.blanc, 1.95, 1.42, 0);                                     // cabine haute
  add(rbox(1.55, 0.78, 2.05, 0.14), M.blanc, 3.5, 1.2, 0);                                     // capot
  const pb = add(new THREE.PlaneGeometry(2.0, 0.9), M.verre, 2.86, 1.85, 0, { ombre: false }); pb.rotation.set(-0.36, Math.PI / 2, 0);
  add(rbox(2.1, 0.08, 0.06, 0.02), M.noir, 2.86, 2.3, 0, { ry: Math.PI / 2, ombre: false });     // joint haut du pare-brise
  for (const s of [G, DR]) {
    add(rbox(0.8, 0.62, 0.05, 0.03), M.creme, 1.95, 1.78, s * 1.08, { ombre: false });          // cadre de vitre
    add(new THREE.PlaneGeometry(0.7, 0.55), M.verre, 1.95, 1.78, s * 1.115, { ry: s > 0 ? 0 : Math.PI, ombre: false });
    add(rbox(0.05, 0.22, 0.05, 0.02), M.noir, 2.35, 1.35, s * 1.1, { ombre: false });            // poignée
    add(new THREE.BoxGeometry(0.06, 0.06, 0.32), M.noir, 2.5, 1.98, s * 1.22);                   // bras de rétro
    add(rbox(0.18, 0.36, 0.15, 0.05), M.noir, 2.5, 1.98, s * 1.45);                              // rétroviseur
    add(rbox(0.14, 0.3, 0.46, 0.06), M.ambre, 4.28, 1.25, s * 0.82, { ombre: false });           // phare
    add(rbox(0.1, 0.12, 0.2, 0.04), M.ambre, 3.6, 1.2, s * 1.05, { ombre: false });              // répétiteur latéral
  }
  add(rbox(0.16, 0.62, 1.6, 0.05), M.chrome, 4.27, 1.1, 0);                                    // calandre chromée
  for (const y of [0.92, 1.1, 1.28]) add(new THREE.BoxGeometry(0.06, 0.07, 1.4), M.noir, 4.33, y, 0, { ombre: false });
  add(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 24), M.chrome, 4.36, 1.1, 0, { rz: Math.PI / 2, ombre: false }); // écusson
  add(rbox(0.32, 0.34, 2.32, 0.1), M.chrome, 4.2, 0.62, 0);                                    // pare-chocs
  add(rbox(0.04, 0.2, 0.42, 0.02), M.creme, 4.38, 0.62, 0, { ombre: false });                    // plaque

  /* ---------- PASSAGES DE ROUE ET ROUES ---------- */
  const passage = (x, z, r) => { const g = new THREE.CylinderGeometry(r, r, 0.3, 24, 1, false, 0, Math.PI); add(g, M.passage, x, 0.55, z, { rx: Math.PI / 2, rz: 0, ry: 0, ombre: false }); };
  const roue = (x, z) => { add(new THREE.CylinderGeometry(0.47, 0.47, 0.36, 32), M.pneu, x, 0.47, z, { rx: Math.PI / 2 }); add(new THREE.CylinderGeometry(0.26, 0.26, 0.38, 24), M.chrome, x, 0.47, z, { rx: Math.PI / 2, ombre: false }); add(new THREE.CylinderGeometry(0.08, 0.08, 0.42, 12), M.noir, x, 0.47, z, { rx: Math.PI / 2, ombre: false }); };
  for (const s of [G, DR]) { roue(2.95, s * 1.1); roue(-2.55, s * 1.12); roue(-2.55, s * 0.78); }

  /* ---------- LIVRÉE : virgules rouge / bleu / gris, dessinées « photo 1 » (avant à gauche du canvas) ---------- */
  function livree(miroir) {
    const c = document.createElement('canvas'); c.width = 1140; c.height = 490; const g = c.getContext('2d');
    if (miroir) { g.translate(c.width, 0); g.scale(-1, 1); }
    const V = (col, pts) => { g.fillStyle = col; g.beginPath(); g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p); g.closePath(); g.fill(); };
    // bandes basses grise puis bleue, légèrement montantes vers l'arrière (droite du canvas)
    V('#8d939b', [[0, 372], [1140, 322], [1140, 338], [0, 388]]);
    V('#1f3a78', [[0, 396], [1140, 346], [1140, 372], [0, 422]]);
    // grande virgule rouge et bleue qui partent du bas-avant et montent vers l'arrière
    V('#c7312a', [[20, 330], [520, 118], [560, 136], [90, 350]]);
    V('#1f3a78', [[260, 300], [680, 138], [720, 162], [310, 322]]);
    // chevron gris pointé vers l'avant, au milieu en haut
    V('#8d939b', [[700, 128], [880, 62], [858, 104], [724, 166]]);
    // touches à l'arrière
    V('#c7312a', [[900, 62], [1050, 42], [1080, 62], [930, 102]]);
    V('#1f3a78', [[960, 250], [1140, 200], [1140, 240], [990, 290]]);
    V('#8d939b', [[1000, 150], [1140, 120], [1140, 145], [1010, 175]]);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const decal = (tex, side) => add(new THREE.PlaneGeometry(5.6, 2.36), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: .5 }), -1.6, 2.0, side * (L / 2 + 0.006), { ry: side > 0 ? 0 : Math.PI, ombre: false });
  decal(livree(true), DR); decal(livree(false), G);
  // même livrée sur la capucine, en plus petit
  const capu = (side) => add(new THREE.PlaneGeometry(2.6, 0.9), new THREE.MeshStandardMaterial({ map: livree(side > 0), transparent: true, roughness: .5, opacity: .9 }), 2.7, 2.7, side * ((L - 0.1) / 2 + 0.006), { ry: side > 0 ? 0 : Math.PI, ombre: false });
  capu(DR); capu(G);

  /* ---------- LE SOCLE : diorama ---------- */
  const decor = new THREE.Group(); scene.add(decor);
  add(rbox(14, 0.9, 9, 0.35), M.gazon, 0, -0.45, 0, { parent: decor });
  add(rbox(14.02, 0.5, 9.02, 0.3), M.terre, 0, -0.68, 0, { parent: decor, ombre: false });
  { const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#8fa3b3'; g.fillRect(0, 0, 1024, 256); g.fillStyle = '#f4f1ea'; for (let x = 20; x < 1024; x += 120) g.fillRect(x, 121, 60, 14);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    add(new THREE.PlaneGeometry(14, 3.8), new THREE.MeshStandardMaterial({ map: t, roughness: .9 }), 0, 0.012, 0, { parent: decor, rx: -Math.PI / 2, ombre: false }); }
  const arbre = (x, z, h, rouge = false) => { add(new THREE.CylinderGeometry(0.08, 0.1, h * 0.35, 8), M.tronc, x, h * 0.17, z, { parent: decor }); const f = add(new THREE.SphereGeometry(h * 0.32, 20, 16), rouge ? M.feuilleRouge : M.feuille, x, h * 0.65, z, { parent: decor }); f.scale.set(1, 1.35, 1); };
  arbre(-5.6, 3.2, 2.6); arbre(-4.4, 3.6, 1.9); arbre(5.2, -3.3, 2.3, true); arbre(6.1, 2.9, 1.6); arbre(-6.2, -3.0, 2.1, true);
  for (const [x, z, s] of [[4.6, 3.4, .35], [5.1, 3.7, .22], [-5.9, -1.9, .28]]) { const p = add(new THREE.SphereGeometry(s, 12, 10), M.pierre, x, s * 0.5, z, { parent: decor }); p.scale.set(1.4, .7, 1); }
  add(new THREE.ConeGeometry(0.7, 1.6, 10), M.feuille, 5.8, 1.3, -2.2, { parent: decor }); add(new THREE.CylinderGeometry(0.08, 0.1, 0.6, 8), M.tronc, 5.8, 0.3, -2.2, { parent: decor });

  /* ---------- IMPACTS ---------- */
  const pastille = (n) => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.beginPath(); g.arc(64, 64, 54, 0, 7); g.fillStyle = '#e23a2e'; g.fill(); g.lineWidth = 8; g.strokeStyle = '#f4f1ea'; g.stroke(); g.fillStyle = '#f4f1ea'; g.font = '62px Anton, Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), 64, 70); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const trace = (gravite) => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); if (gravite === 'rayure') { g.strokeStyle = 'rgba(70,60,55,.8)'; g.lineWidth = 3; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(10 + i * 6, 70 + i * 9); g.lineTo(118 - i * 8, 48 + i * 7); g.stroke(); } } else { g.fillStyle = 'rgba(70,60,55,.65)'; for (let i = 0; i < 8; i++) { g.beginPath(); g.ellipse(64 + (Math.random() - .5) * 46, 64 + (Math.random() - .5) * 36, 12 + Math.random() * 20, 7 + Math.random() * 10, Math.random() * 3, 0, 7); g.fill(); } } return new THREE.CanvasTexture(c); };
  const sprites = [], traces = [];
  impacts.forEach((imp, k) => {
    const z = ZONES[imp.zone] || ZONES.inconnue; const p = z ? z.p : [0, 4, 0];
    const memeZone = impacts.slice(0, k).filter(x => x.zone === imp.zone).length;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: pastille(k + 1), depthTest: true })); s.scale.setScalar(0.55); s.position.set(p[0] * 1.02, p[1] + 0.3 + memeZone * 0.4, p[2] * 1.12); s.userData.k = k; camion.add(s); sprites.push(s);
    const d = new THREE.Sprite(new THREE.SpriteMaterial({ map: trace(imp.gravite), depthTest: true, opacity: .9 })); d.scale.set(0.75, 0.48, 1); d.position.set(p[0] * 0.995, p[1], p[2] * 0.99); camion.add(d); traces.push(d);
  });

  /* ---------- LUMIÈRE, CAMÉRA, BOUCLE ---------- */
  scene.add(new THREE.HemisphereLight(0xfff6e6, 0x8fa07a, 0.55));
  const soleil = new THREE.DirectionalLight(0xfff1dc, 2.2); soleil.position.set(7, 12, -6); soleil.castShadow = true; soleil.shadow.mapSize.set(2048, 2048); soleil.shadow.radius = 6; Object.assign(soleil.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 }); scene.add(soleil);
  const cam = new THREE.PerspectiveCamera(26, 1, 0.1, 100); cam.position.set(11, 7.5, 12);
  const ctrl = new OrbitControls(cam, rendu.domElement); ctrl.target.set(0, 1.3, 0); ctrl.enableDamping = true; ctrl.autoRotate = true; ctrl.autoRotateSpeed = 0.7; ctrl.minDistance = 7; ctrl.maxDistance = 26; ctrl.maxPolarAngle = Math.PI / 2 - 0.08; ctrl.minPolarAngle = 0.5; ctrl.enablePan = false;
  const taille = () => { const w = conteneur.clientWidth, h = conteneur.clientHeight; rendu.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  taille(); addEventListener('resize', taille);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) ctrl.autoRotate = false;
  (function boucle() { requestAnimationFrame(boucle); ctrl.update(); rendu.render(scene, cam); })();

  const ray = new THREE.Raycaster(), souris = new THREE.Vector2();
  const fiches = [...document.querySelectorAll('#impacts .impact')];
  const activer = (k) => { fiches.forEach(f => f.classList.toggle('actif', +f.dataset.k === k)); const f = fiches.find(f => +f.dataset.k === k); if (f) f.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
  rendu.domElement.addEventListener('click', (e) => { const r = rendu.domElement.getBoundingClientRect(); souris.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(souris, cam); const hit = ray.intersectObjects(sprites)[0]; if (hit) { activer(hit.object.userData.k); ctrl.autoRotate = false; } });
  fiches.forEach(f => f.addEventListener('click', () => { const k = +f.dataset.k; activer(k); const z = ZONES[impacts[k].zone] || ZONES.inconnue; const p = z.p; ctrl.autoRotate = false; const dir = new THREE.Vector3(p[0], p[1], p[2]).sub(ctrl.target).setY(0).normalize(); if (!dir.length()) dir.set(1, 0, 0); cam.position.copy(ctrl.target.clone().add(dir.multiplyScalar(12)).add(new THREE.Vector3(0, 5, 0))); }));
  ['pointerdown', 'wheel'].forEach(ev => rendu.domElement.addEventListener(ev, () => { ctrl.autoRotate = false; }, { passive: true }));

  /* ---------- vue du dessus pour la carte ---------- */
  try {
    [...sprites, ...traces].forEach(s => s.visible = false);
    const r2 = new THREE.WebGLRenderer({ antialias: true, alpha: true }); r2.setSize(192, 192); r2.outputColorSpace = THREE.SRGBColorSpace;
    const s2 = new THREE.Scene(); s2.add(camion.clone(true)); s2.add(new THREE.HemisphereLight(0xffffff, 0x777777, 1.6)); const l2 = new THREE.DirectionalLight(0xffffff, 1.4); l2.position.set(4, 10, 3); s2.add(l2);
    const c2 = new THREE.OrthographicCamera(-5.2, 5.2, 5.2, -5.2, 0.1, 50); c2.position.set(0, 20, 0); c2.up.set(0, 0, -1); c2.lookAt(0, 0, 0);
    r2.render(s2, c2); const url = r2.domElement.toDataURL('image/png'); r2.dispose();
    [...sprites, ...traces].forEach(s => s.visible = true);
    window.camionDessusUrl = url; if (window.poserCamionDessus) window.poserCamionDessus(url);
  } catch (e) { /* pas de WebGL : le marqueur SVG reste */ }
}
