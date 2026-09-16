/* Le camion, façon diorama jouet : plastique doux, ombres douces, socle de gazon avec sa route et ses arbres.
   Modélisé en code d'après les photos du CanaDream (Ford E-450 : cabine haute, capucine ronde, cellule
   blanche, virgules rouge / bleu / gris, roues jumelées, porte et marchepied à droite, échelle à l'arrière).
   Les zones d'impact viennent de chaine/zones-camion.json (via window.DATA.camion.zones). */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const conteneur = document.getElementById('camion3d');
if (conteneur) {
  const D = window.DATA;
  const impacts = (D.camion && D.camion.impacts) || [];
  const ZONES = (D.camion && D.camion.zones) || {};

  const scene = new THREE.Scene();
  const rendu = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  rendu.setPixelRatio(Math.min(2, devicePixelRatio)); rendu.outputColorSpace = THREE.SRGBColorSpace;
  rendu.shadowMap.enabled = true; rendu.shadowMap.type = THREE.PCFSoftShadowMap;
  rendu.toneMapping = THREE.ACESFilmicToneMapping; rendu.toneMappingExposure = 1.05;
  conteneur.prepend(rendu.domElement);
  scene.environment = new THREE.PMREMGenerator(rendu).fromScene(new RoomEnvironment(), 0.04).texture;

  /* ---------- matières « plastique doux » ---------- */
  const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0, ...o });
  const M = {
    blanc: mat(0xf4f1ea), blancSombre: mat(0xe3dfd5), noir: mat(0x2a2a2e, { roughness: .6 }), gris: mat(0x9a9ea6), grisClair: mat(0xd4d6da),
    verre: mat(0x30465a, { roughness: .25, metalness: .1 }), chrome: mat(0xe2e4e8, { roughness: .3, metalness: .6 }), rouge: mat(0xd8332b), orange: mat(0xf6b04a, { emissive: 0x6a3a00, emissiveIntensity: .25 }),
    pneu: mat(0x26262a, { roughness: .9 }), gazon: mat(0xa9c98a, { roughness: .95 }), terre: mat(0x6b4f3a, { roughness: 1 }), route: mat(0x8fa3b3, { roughness: .9 }), tronc: mat(0x8a6a4a), feuille: mat(0x8fbf7a), feuilleRouge: mat(0xe07a52), pierre: mat(0xb9b6ad),
  };
  const camion = new THREE.Group(); scene.add(camion);
  const add = (geo, m, x, y, z, { rx = 0, ry = 0, rz = 0, parent = camion, ombre = true } = {}) => {
    const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = ombre; o.receiveShadow = true; parent.add(o); return o;
  };
  const rbox = (w, h, d, r = 0.1) => new RoundedBoxGeometry(w, h, d, 5, r);

  /* ---------- carrosserie (x = longueur, avant = +x ; z = largeur, gauche = +z) ---------- */
  add(rbox(5.7, 2.5, 2.5, 0.18), M.blanc, -1.6, 2.0, 0);                     // cellule
  add(rbox(3.0, 1.15, 2.5, 0.32), M.blanc, 2.7, 2.72, 0);                    // capucine, bien ronde devant
  add(rbox(1.7, 1.55, 2.15, 0.14), M.blanc, 1.95, 1.4, 0);                   // cabine haute (E-450)
  add(rbox(1.5, 0.85, 2.05, 0.12), M.blanc, 3.45, 1.15, 0);                  // capot
  add(rbox(0.12, 0.6, 1.55, 0.04), M.chrome, 4.2, 1.05, 0);                  // calandre chromée
  for (const y of [0.88, 1.05, 1.22]) add(new THREE.BoxGeometry(0.05, 0.06, 1.35), M.noir, 4.25, y, 0, { ombre: false });
  add(rbox(0.3, 0.32, 2.3, 0.08), M.grisClair, 4.15, 0.62, 0);               // pare-chocs avant
  add(rbox(0.12, 0.28, 0.42, 0.06), M.orange, 4.22, 1.2, 0.85);              // phares
  add(rbox(0.12, 0.28, 0.42, 0.06), M.orange, 4.22, 1.2, -0.85);
  add(rbox(0.26, 0.32, 2.55, 0.08), M.grisClair, -4.45, 0.75, 0);            // pare-chocs arrière
  add(rbox(0.1, 0.36, 0.3, 0.05), M.rouge, -4.5, 1.32, 1.0, { ombre: false }); // feux arrière
  add(rbox(0.1, 0.36, 0.3, 0.05), M.rouge, -4.5, 1.32, -1.0, { ombre: false });
  add(rbox(0.9, 0.32, 0.9, 0.08), M.grisClair, -2.4, 3.4, 0);                // clim
  add(rbox(0.6, 0.12, 0.5, 0.05), M.grisClair, 0.2, 3.3, 0.4);               // lanterneau
  add(new THREE.BoxGeometry(5.4, 0.07, 0.14), M.grisClair, -1.6, 3.1, -1.28, { ombre: false }); // rail du store (droite)
  add(new THREE.BoxGeometry(5.4, 0.07, 0.1), M.grisClair, -1.6, 3.1, 1.28, { ombre: false });
  // pare-brise et vitres de cabine
  const pb = add(new THREE.PlaneGeometry(2.0, 0.85), M.verre, 2.82, 1.78, 0, { ombre: false }); pb.rotation.set(-0.38, Math.PI / 2, 0);
  add(new THREE.PlaneGeometry(0.75, 0.6), M.verre, 1.95, 1.72, 1.085, { ombre: false });
  add(new THREE.PlaneGeometry(0.75, 0.6), M.verre, 1.95, 1.72, -1.085, { ry: Math.PI, ombre: false });
  // rétroviseurs sur bras
  for (const sgn of [1, -1]) { add(new THREE.BoxGeometry(0.06, 0.06, 0.3), M.noir, 2.45, 1.95, sgn * 1.2); add(rbox(0.16, 0.34, 0.14, 0.05), M.noir, 2.45, 1.95, sgn * 1.42); }
  // fenêtres de la cellule (gauche : deux grandes ; droite : une grande, une petite, la porte)
  const vitre = (w, h, x, y, z, ry = 0) => add(new THREE.PlaneGeometry(w, h), M.verre, x, y, z, { ry, ombre: false });
  vitre(1.35, 0.75, 0.1, 2.25, 1.255); vitre(1.1, 0.75, -2.3, 2.25, 1.255);
  vitre(1.3, 0.75, 0.3, 2.25, -1.255, Math.PI); vitre(0.55, 0.55, -1.5, 2.25, -1.255, Math.PI);
  add(rbox(0.8, 1.85, 0.04, 0.03), M.blancSombre, -2.9, 1.75, -1.26, { ombre: false });   // porte
  vitre(0.48, 0.48, -2.9, 2.3, -1.285, Math.PI);
  add(rbox(0.06, 0.25, 0.04, 0.02), M.noir, -3.22, 1.6, -1.29, { ombre: false });         // poignée
  add(rbox(0.7, 0.07, 0.35, 0.03), M.grisClair, -2.9, 0.6, -1.4);                          // marchepied
  // trappes de rangement (deux petites + une grande côté gauche, deux côté droit)
  for (const [w, x, z, ry] of [[0.9, -0.5, 1.255, 0], [0.9, -1.6, 1.255, 0], [1.3, -3.4, 1.255, 0], [1.0, -0.6, -1.255, Math.PI], [1.0, -3.7, -1.255, Math.PI]]) add(rbox(w, 0.5, 0.03, 0.03), M.grisClair, x, 1.0, z, { ry, ombre: false });
  // échelle arrière
  for (const y of [1.3, 1.7, 2.1, 2.5, 2.9]) add(new THREE.BoxGeometry(0.06, 0.05, 0.4), M.grisClair, -4.48, y, 0.6, { ombre: false });
  for (const z of [0.42, 0.78]) add(new THREE.BoxGeometry(0.06, 2.0, 0.05), M.grisClair, -4.48, 2.1, z, { ombre: false });

  /* ---------- livrée dessinée (virgules rouge / bleu / gris, d'après les photos) ---------- */
  function livree(miroir) {
    const c = document.createElement('canvas'); c.width = 1140; c.height = 500; const g = c.getContext('2d');
    if (miroir) { g.translate(c.width, 0); g.scale(-1, 1); }
    const V = (col, pts) => { g.fillStyle = col; g.beginPath(); g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p); g.closePath(); g.fill(); };
    // bande basse bleue / grise sur toute la longueur, un peu inclinée
    V('#8d939b', [[0, 372], [1140, 330], [1140, 344], [0, 386]]);
    V('#1f3a78', [[0, 392], [1140, 350], [1140, 372], [0, 414]]);
    // grande virgule rouge qui monte vers l'arrière, puis bleue
    V('#c7312a', [[40, 330], [560, 130], [600, 148], [110, 352]]);
    V('#1f3a78', [[300, 300], [720, 150], [760, 172], [350, 322]]);
    // chevron gris pointé vers l'avant, milieu haut
    V('#8d939b', [[700, 120], [880, 60], [860, 100], [720, 160]]);
    // touches rouges et bleues à l'arrière haut
    V('#c7312a', [[900, 60], [1050, 40], [1080, 60], [930, 100]]);
    V('#1f3a78', [[960, 250], [1140, 200], [1140, 240], [990, 290]]);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const decal = (tex, z, ry) => add(new THREE.PlaneGeometry(5.6, 2.42), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: .55 }), -1.6, 2.0, z, { ry, ombre: false });
  decal(livree(false), 1.258, 0); decal(livree(true), -1.258, Math.PI);
  // feuille d'érable sur la capucine (pas de logo : c'est une marque)
  { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#c7312a'; g.beginPath();
    const P = [[128, 16], [145, 50], [167, 38], [161, 74], [204, 64], [180, 102], [216, 118], [172, 138], [180, 176], [140, 158], [128, 240], [116, 158], [76, 176], [84, 138], [40, 118], [76, 102], [52, 64], [95, 74], [89, 38], [111, 50]];
    g.moveTo(...P[0]); for (const p of P.slice(1)) g.lineTo(...p); g.closePath(); g.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    add(new THREE.PlaneGeometry(0.6, 0.6), new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: .55 }), 4.215, 2.78, 0, { ry: Math.PI / 2, ombre: false }); }

  /* ---------- roues ---------- */
  const roue = (x, z) => { add(new THREE.CylinderGeometry(0.46, 0.46, 0.34, 28), M.pneu, x, 0.46, z, { rx: Math.PI / 2 }); add(new THREE.CylinderGeometry(0.24, 0.24, 0.36, 20), M.chrome, x, 0.46, z, { rx: Math.PI / 2, ombre: false }); add(new THREE.CylinderGeometry(0.07, 0.07, 0.4, 12), M.noir, x, 0.46, z, { rx: Math.PI / 2, ombre: false }); };
  roue(2.9, 1.08); roue(2.9, -1.08); roue(-2.55, 1.1); roue(-2.55, 0.76); roue(-2.55, -1.1); roue(-2.55, -0.76);

  /* ---------- le socle : diorama ---------- */
  const decor = new THREE.Group(); scene.add(decor);
  const socle = add(rbox(14, 0.9, 9, 0.35), M.gazon, 0, -0.45, 0, { parent: decor }); socle.material = M.gazon;
  add(rbox(14.02, 0.5, 9.02, 0.3), M.terre, 0, -0.68, 0, { parent: decor, ombre: false });
  // la route : une bande qui traverse, avec sa ligne pointillée
  { const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#8fa3b3'; g.fillRect(0, 0, 1024, 256); g.fillStyle = '#f4f1ea'; for (let x = 20; x < 1024; x += 120) g.fillRect(x, 120, 60, 14);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const r = add(new THREE.PlaneGeometry(14, 3.6), new THREE.MeshStandardMaterial({ map: t, roughness: .9 }), 0, 0.012, 0, { parent: decor, rx: -Math.PI / 2, ombre: false }); r.receiveShadow = true; }
  // arbres « œuf » et un érable rouge, quelques cailloux
  const arbre = (x, z, h, rouge = false) => { add(new THREE.CylinderGeometry(0.08, 0.1, h * 0.35, 8), M.tronc, x, h * 0.17, z, { parent: decor }); const f = add(new THREE.SphereGeometry(h * 0.32, 20, 16), rouge ? M.feuilleRouge : M.feuille, x, h * 0.35 + h * 0.3, z, { parent: decor }); f.scale.set(1, 1.35, 1); };
  arbre(-5.6, 3.2, 2.6); arbre(-4.4, 3.6, 1.9); arbre(5.2, -3.3, 2.3, true); arbre(6.1, 2.9, 1.6); arbre(-6.2, -3.0, 2.1, true);
  for (const [x, z, s] of [[4.6, 3.4, .35], [5.1, 3.7, .22], [-5.9, -1.9, .28]]) { const p = add(new THREE.SphereGeometry(s, 12, 10), M.pierre, x, s * 0.5, z, { parent: decor }); p.scale.set(1.4, .7, 1); }
  // un pin (cône) pour rappeler l'intro
  add(new THREE.ConeGeometry(0.7, 1.6, 10), M.feuille, 5.8, 1.3, -2.2, { parent: decor }); add(new THREE.CylinderGeometry(0.08, 0.1, 0.6, 8), M.tronc, 5.8, 0.3, -2.2, { parent: decor });

  /* ---------- impacts : pastilles numérotées + traces ---------- */
  const pastille = (n) => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.beginPath(); g.arc(64, 64, 54, 0, 7); g.fillStyle = '#e23a2e'; g.fill(); g.lineWidth = 8; g.strokeStyle = '#f4f1ea'; g.stroke(); g.fillStyle = '#f4f1ea'; g.font = '62px Anton, Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), 64, 70); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const trace = (gravite) => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); if (gravite === 'rayure') { g.strokeStyle = 'rgba(70,60,55,.85)'; g.lineWidth = 3; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(10 + i * 6, 70 + i * 9); g.lineTo(118 - i * 8, 48 + i * 7); g.stroke(); } } else { g.fillStyle = 'rgba(70,60,55,.7)'; for (let i = 0; i < 8; i++) { g.beginPath(); g.ellipse(64 + (Math.random() - .5) * 46, 64 + (Math.random() - .5) * 36, 12 + Math.random() * 20, 7 + Math.random() * 10, Math.random() * 3, 0, 7); g.fill(); } } return new THREE.CanvasTexture(c); };
  const sprites = [];
  impacts.forEach((imp, k) => {
    const z = ZONES[imp.zone] || ZONES.inconnue; const p = z ? z.p : [0, 4, 0];
    const memeZone = impacts.slice(0, k).filter(x => x.zone === imp.zone).length;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: pastille(k + 1), depthTest: false }));
    s.scale.setScalar(0.6); s.position.set(p[0], p[1] + 0.32 + memeZone * 0.42, p[2]); s.userData.k = k; camion.add(s); sprites.push(s);
    const d = new THREE.Sprite(new THREE.SpriteMaterial({ map: trace(imp.gravite), depthTest: true, opacity: .9 })); d.scale.set(0.8, 0.5, 1); d.position.set(p[0] * 0.995, p[1], p[2] * 0.995); camion.add(d);
  });

  /* ---------- lumières, caméra, rendu ---------- */
  scene.add(new THREE.HemisphereLight(0xfff6e6, 0x8fa07a, 0.55));
  const soleil = new THREE.DirectionalLight(0xfff1dc, 2.2); soleil.position.set(7, 12, 6); soleil.castShadow = true;
  soleil.shadow.mapSize.set(2048, 2048); soleil.shadow.radius = 6; Object.assign(soleil.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 }); scene.add(soleil);
  const cam = new THREE.PerspectiveCamera(26, 1, 0.1, 100); cam.position.set(11, 7.5, 12);
  const ctrl = new OrbitControls(cam, rendu.domElement); ctrl.target.set(0, 1.3, 0); ctrl.enableDamping = true; ctrl.autoRotate = true; ctrl.autoRotateSpeed = 0.7; ctrl.minDistance = 7; ctrl.maxDistance = 26; ctrl.maxPolarAngle = Math.PI / 2 - 0.08; ctrl.minPolarAngle = 0.5; ctrl.enablePan = false;
  const taille = () => { const w = conteneur.clientWidth, h = conteneur.clientHeight; rendu.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  taille(); addEventListener('resize', taille);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) ctrl.autoRotate = false;
  (function boucle() { requestAnimationFrame(boucle); ctrl.update(); rendu.render(scene, cam); })();

  /* clic pastille ↔ fiche */
  const ray = new THREE.Raycaster(), souris = new THREE.Vector2();
  const fiches = [...document.querySelectorAll('#impacts .impact')];
  const activer = (k) => { fiches.forEach(f => f.classList.toggle('actif', +f.dataset.k === k)); const f = fiches.find(f => +f.dataset.k === k); if (f) f.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
  rendu.domElement.addEventListener('click', (e) => { const r = rendu.domElement.getBoundingClientRect(); souris.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(souris, cam); const hit = ray.intersectObjects(sprites)[0]; if (hit) { activer(hit.object.userData.k); ctrl.autoRotate = false; } });
  fiches.forEach(f => f.addEventListener('click', () => { const k = +f.dataset.k; activer(k); const z = ZONES[impacts[k].zone] || ZONES.inconnue; const p = z.p; ctrl.autoRotate = false; const dir = new THREE.Vector3(p[0], p[1], p[2]).sub(ctrl.target).setY(0).normalize(); cam.position.copy(ctrl.target.clone().add(dir.multiplyScalar(12)).add(new THREE.Vector3(0, 5, 0))); }));
  ['pointerdown', 'wheel'].forEach(ev => rendu.domElement.addEventListener(ev, () => { ctrl.autoRotate = false; }, { passive: true }));

  /* ---------- vue du dessus pour la carte (le camion seul, rendu une fois) ---------- */
  try {
    sprites.forEach(s => s.visible = false); decor.visible = false; camion.children.forEach(c => { if (c.isSprite) c.visible = false; });
    const r2 = new THREE.WebGLRenderer({ antialias: true, alpha: true }); r2.setSize(160, 160); r2.outputColorSpace = THREE.SRGBColorSpace;
    const s2 = new THREE.Scene(); s2.add(camion.clone(true)); s2.add(new THREE.HemisphereLight(0xffffff, 0x777777, 1.6)); const l2 = new THREE.DirectionalLight(0xffffff, 1.4); l2.position.set(4, 10, 3); s2.add(l2);
    const c2 = new THREE.OrthographicCamera(-5.2, 5.2, 5.2, -5.2, 0.1, 50); c2.position.set(0, 20, 0); c2.up.set(0, 0, -1); c2.lookAt(0, 0, 0);
    r2.render(s2, c2); const url = r2.domElement.toDataURL('image/png'); r2.dispose();
    sprites.forEach(s => s.visible = true); decor.visible = true; camion.children.forEach(c => { if (c.isSprite) c.visible = true; });
    window.camionDessusUrl = url; if (window.poserCamionDessus) window.poserCamionDessus(url);
  } catch (e) { /* pas de WebGL : le marqueur SVG reste */ }
}
