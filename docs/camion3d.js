/* Le camion en 3D cartoon — modélisé en code d'après les photos du CanaDream (Ford E-450, cellule blanche,
   capucine au-dessus de la cabine, virgules rouge / bleu / gris). Rendu toon, contours noirs.
   Les 14 zones d'impact sont des points connus du modèle : la donnée pose les pastilles toute seule. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const conteneur = document.getElementById('camion3d');
if (conteneur) {
  const D = window.DATA;
  const impacts = (D.camion && D.camion.impacts) || [];

  /* ---------- matières toon ---------- */
  const grad = new THREE.DataTexture(new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 235, 235, 235, 255, 255, 255, 255, 255]), 4, 1, THREE.RGBAFormat);
  grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
  const toon = (color, extra = {}) => new THREE.MeshToonMaterial({ color, gradientMap: grad, ...extra });
  const M = {
    blanc: toon(0xf3efe6), blancSombre: toon(0xe6e1d4), noir: toon(0x1b1b1b), gris: toon(0x8e9198), grisClair: toon(0xc9ccd0),
    verre: toon(0x2a3d4d), chrome: toon(0xd8d8dc), rouge: toon(0xd8332b), orange: toon(0xf2a33a), pneu: toon(0x202020),
  };
  const contour = new THREE.MeshBasicMaterial({ color: 0x14110c, side: THREE.BackSide });

  const scene = new THREE.Scene();
  const racine = new THREE.Group(); scene.add(racine);
  const add = (geo, mat, x, y, z, { rx = 0, ry = 0, rz = 0, outline = 1.035, parent = racine } = {}) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); parent.add(m);
    if (outline) { const o = new THREE.Mesh(geo, contour); o.scale.setScalar(outline); m.add(o); }
    return m;
  };
  const box = (w, h, d, r = 0.08) => new RoundedBoxGeometry(w, h, d, 4, r);

  /* ---------- carrosserie (x = longueur, avant = +x ; z = largeur, gauche = +z) ---------- */
  add(box(5.6, 2.45, 2.45, 0.14), M.blanc, -1.5, 1.95, 0);                 // cellule
  add(box(3.1, 1.1, 2.45, 0.22), M.blanc, 2.55, 2.65, 0);                  // capucine au-dessus de la cabine
  add(box(1.5, 1.4, 2.1, 0.12), M.blanc, 1.95, 1.3, 0);                    // cabine
  add(box(1.4, 0.8, 2.0, 0.12), M.blanc, 3.4, 1.05, 0);                    // capot
  add(new THREE.BoxGeometry(0.1, 0.55, 1.5), M.chrome, 4.12, 1.0, 0);      // calandre
  add(new THREE.BoxGeometry(0.06, 0.3, 1.2), M.noir, 4.18, 1.0, 0, { outline: 0 });
  add(new THREE.BoxGeometry(0.25, 0.28, 2.2), M.noir, 4.05, 0.62, 0);      // pare-chocs avant
  add(new THREE.BoxGeometry(0.1, 0.22, 0.34), M.orange, 4.13, 1.12, 0.85); // phares
  add(new THREE.BoxGeometry(0.1, 0.22, 0.34), M.orange, 4.13, 1.12, -0.85);
  add(new THREE.BoxGeometry(0.22, 0.3, 2.5), M.noir, -4.32, 0.75, 0);     // pare-chocs arrière
  add(new THREE.BoxGeometry(0.08, 0.3, 0.3), M.rouge, -4.34, 1.35, 1.0, { outline: 0 }); // feux
  add(new THREE.BoxGeometry(0.08, 0.3, 0.3), M.rouge, -4.34, 1.35, -1.0, { outline: 0 });
  add(box(0.8, 0.35, 0.8, 0.06), M.grisClair, -2.2, 3.3, 0);               // clim sur le toit
  add(new THREE.BoxGeometry(5.4, 0.06, 0.12), M.grisClair, -1.5, 3.05, 1.25, { outline: 0 }); // rail de store
  // pare-brise, vitres de cabine
  const pb = add(new THREE.PlaneGeometry(1.9, 0.75), M.verre, 2.72, 1.72, 0, { ry: Math.PI / 2, rx: -0.35, outline: 0 }); pb.rotation.set(-0.4, Math.PI / 2, 0);
  add(new THREE.PlaneGeometry(0.7, 0.55), M.verre, 2.0, 1.65, 1.06, { outline: 0 });
  add(new THREE.PlaneGeometry(0.7, 0.55), M.verre, 2.0, 1.65, -1.06, { ry: Math.PI, outline: 0 });
  // rétroviseurs
  add(new THREE.BoxGeometry(0.16, 0.3, 0.12), M.noir, 2.4, 1.85, 1.32);
  add(new THREE.BoxGeometry(0.16, 0.3, 0.12), M.noir, 2.4, 1.85, -1.32);
  // fenêtres de la cellule (gauche : deux grandes ; droite : une grande + la porte avec hublot)
  const vitre = (w, h, x, y, z, ry) => add(new THREE.PlaneGeometry(w, h), M.verre, x, y, z, { ry, outline: 0 });
  vitre(1.3, 0.7, 0.2, 2.2, 1.235, 0); vitre(1.1, 0.7, -2.1, 2.2, 1.235, 0);
  vitre(1.2, 0.7, 0.4, 2.2, -1.235, Math.PI); vitre(0.5, 0.5, -1.4, 2.2, -1.235, Math.PI);
  add(new THREE.PlaneGeometry(0.75, 1.75), M.blancSombre, -2.9, 1.7, -1.232, { ry: Math.PI, outline: 0 }); // porte
  vitre(0.45, 0.45, -2.9, 2.25, -1.238, Math.PI);
  add(new THREE.BoxGeometry(0.6, 0.06, 0.3), M.grisClair, -2.9, 0.62, -1.35); // marchepied
  // trappes de rangement
  for (const [x, z, ry] of [[-3.4, 1.232, 0], [-0.9, 1.232, 0], [-3.6, -1.232, Math.PI], [-0.6, -1.232, Math.PI]]) add(new THREE.PlaneGeometry(0.9, 0.42), M.grisClair, x, 1.0, z, { ry, outline: 0 });
  // échelle arrière
  for (const y of [1.2, 1.6, 2.0, 2.4, 2.8]) add(new THREE.BoxGeometry(0.06, 0.05, 0.4), M.grisClair, -4.32, y, 0.6, { outline: 0 });
  add(new THREE.BoxGeometry(0.06, 1.9, 0.05), M.grisClair, -4.32, 2.0, 0.42, { outline: 0 });
  add(new THREE.BoxGeometry(0.06, 1.9, 0.05), M.grisClair, -4.32, 2.0, 0.78, { outline: 0 });

  /* ---------- virgules rouge / bleu / gris (texture dessinée) ---------- */
  function livree(miroir) {
    const c = document.createElement('canvas'); c.width = 1120; c.height = 490; const g = c.getContext('2d');
    if (miroir) { g.translate(c.width, 0); g.scale(-1, 1); }
    const virgule = (col, pts) => { g.fillStyle = col; g.beginPath(); g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p); g.closePath(); g.fill(); };
    virgule('#c7312a', [[0, 300], [420, 150], [470, 165], [80, 330]]);
    virgule('#1f3a78', [[60, 360], [520, 185], [560, 200], [130, 395]]);
    virgule('#8e9198', [[300, 380], [700, 250], [720, 268], [340, 405]]);
    virgule('#1f3a78', [[760, 60], [900, 40], [1000, 210], [960, 250]]);
    virgule('#c7312a', [[860, 250], [1000, 260], [1040, 400], [980, 400]]);
    virgule('#8e9198', [[940, 120], [1120, 90], [1120, 140], [960, 160]]);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const decal = (tex, z, ry) => add(new THREE.PlaneGeometry(5.5, 2.35), new THREE.MeshToonMaterial({ map: tex, transparent: true, gradientMap: grad }), -1.5, 1.95, z, { ry, outline: 0 });
  decal(livree(false), 1.24, 0); decal(livree(true), -1.24, Math.PI);
  // feuille d'érable sur la capucine (pas de logo : c'est une marque)
  { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#c7312a'; g.beginPath();
    const P = [[128, 20], [150, 70], [185, 50], [175, 100], [225, 90], [195, 130], [235, 150], [185, 170], [195, 210], [150, 190], [128, 240], [106, 190], [61, 210], [71, 170], [21, 150], [61, 130], [31, 90], [81, 100], [71, 50], [106, 70]];
    g.moveTo(...P[0]); for (const p of P.slice(1)) g.lineTo(...p); g.closePath(); g.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    add(new THREE.PlaneGeometry(0.7, 0.7), new THREE.MeshToonMaterial({ map: t, transparent: true, gradientMap: grad }), 4.12, 2.7, 0, { ry: Math.PI / 2, outline: 0 }); }

  /* ---------- roues (jumelées à l'arrière) ---------- */
  const roue = (x, z) => { const g = new THREE.CylinderGeometry(0.44, 0.44, 0.32, 24); add(g, M.pneu, x, 0.44, z, { rx: Math.PI / 2, outline: 1.04 }); add(new THREE.CylinderGeometry(0.22, 0.22, 0.34, 16), M.chrome, x, 0.44, z, { rx: Math.PI / 2, outline: 0 }); };
  roue(2.9, 1.05); roue(2.9, -1.05); roue(-2.55, 1.05); roue(-2.55, 0.72); roue(-2.55, -1.05); roue(-2.55, -0.72);
  // ombre au sol
  const ombre = new THREE.Mesh(new THREE.CircleGeometry(4.6, 48), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 }));
  ombre.rotation.x = -Math.PI / 2; ombre.scale.set(1, 0.4, 1); ombre.position.y = 0.01; scene.add(ombre);

  /* ---------- zones d'impact → points du modèle ---------- */
  const ZONES = {
    'avant': [4.25, 1.0, 0], 'aile-avant-gauche': [3.5, 1.0, 1.1], 'aile-avant-droite': [3.5, 1.0, -1.1],
    'flanc-gauche-avant': [0.3, 1.5, 1.32], 'flanc-gauche-arriere': [-3.1, 1.5, 1.32], 'flanc-droit-avant': [0.3, 1.5, -1.32], 'flanc-droit-arriere': [-3.1, 1.5, -1.32],
    'arriere': [-4.45, 1.6, 0], 'toit': [-0.5, 3.3, 0], 'capucine': [4.15, 2.75, 0.5], 'retro-gauche': [2.4, 1.85, 1.45], 'retro-droit': [2.4, 1.85, -1.45],
    'marchepied': [-2.9, 0.6, -1.45], 'roue': [2.9, 0.44, 1.3], 'inconnue': [-1.5, 3.6, 0],
  };
  const pastille = (n, col) => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.beginPath(); g.arc(64, 64, 52, 0, 7); g.fillStyle = col; g.fill(); g.lineWidth = 8; g.strokeStyle = '#efe3c6'; g.stroke(); g.fillStyle = '#efe3c6'; g.font = 'bold 60px Anton, Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), 64, 68); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const scuff = () => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.fillStyle = 'rgba(40,30,25,.75)'; for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(64 + (Math.random() - .5) * 50, 64 + (Math.random() - .5) * 40, 14 + Math.random() * 22, 8 + Math.random() * 12, Math.random() * 3, 0, 7); g.fill(); } const t = new THREE.CanvasTexture(c); return t; };
  const sprites = [];
  impacts.forEach((imp, k) => {
    const p = ZONES[imp.zone] || ZONES.inconnue;
    const jitter = impacts.slice(0, k).filter(x => x.zone === imp.zone).length * 0.35;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: pastille(k + 1, '#e23a2e'), depthTest: false }));
    s.scale.setScalar(0.62); s.position.set(p[0], p[1] + 0.25 + jitter, p[2]); s.userData.k = k; racine.add(s); sprites.push(s);
    if (imp.gravite !== 'rayure') { const d = new THREE.Sprite(new THREE.SpriteMaterial({ map: scuff(), depthTest: true })); d.scale.set(0.9, 0.6, 1); d.position.set(p[0] * 0.99, p[1], p[2] * 0.99); racine.add(d); }
  });

  /* ---------- lumière, caméra, rendu ---------- */
  scene.add(new THREE.HemisphereLight(0xfff2d8, 0x3a3a2a, 1.1));
  const soleil = new THREE.DirectionalLight(0xfff0d0, 1.6); soleil.position.set(6, 9, 5); scene.add(soleil);
  const rendu = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  rendu.setPixelRatio(Math.min(2, devicePixelRatio)); rendu.outputColorSpace = THREE.SRGBColorSpace;
  conteneur.prepend(rendu.domElement);
  const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 100); cam.position.set(9, 4.5, 10);
  const ctrl = new OrbitControls(cam, rendu.domElement); ctrl.target.set(0, 1.6, 0); ctrl.enableDamping = true; ctrl.autoRotate = true; ctrl.autoRotateSpeed = 0.8; ctrl.minDistance = 6; ctrl.maxDistance = 22; ctrl.maxPolarAngle = Math.PI / 2 - 0.05; ctrl.enablePan = false;
  const taille = () => { const w = conteneur.clientWidth, h = conteneur.clientHeight; rendu.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  taille(); addEventListener('resize', taille);
  const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches; if (reduit) ctrl.autoRotate = false;
  (function boucle() { requestAnimationFrame(boucle); ctrl.update(); rendu.render(scene, cam); })();

  /* clic sur une pastille → surligne la fiche */
  const ray = new THREE.Raycaster(), souris = new THREE.Vector2();
  const fiches = [...document.querySelectorAll('#impacts .impact')];
  const activer = (k) => { fiches.forEach(f => f.classList.toggle('actif', +f.dataset.k === k)); const f = fiches.find(f => +f.dataset.k === k); if (f) f.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
  rendu.domElement.addEventListener('click', (e) => { const r = rendu.domElement.getBoundingClientRect(); souris.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(souris, cam); const hit = ray.intersectObjects(sprites)[0]; if (hit) { activer(hit.object.userData.k); ctrl.autoRotate = false; } });
  fiches.forEach(f => f.addEventListener('click', () => { activer(+f.dataset.k); const imp = impacts[+f.dataset.k]; const p = ZONES[imp.zone] || ZONES.inconnue; ctrl.autoRotate = false; const dir = new THREE.Vector3(p[0], p[1], p[2]).sub(ctrl.target).normalize(); cam.position.copy(ctrl.target.clone().add(dir.multiplyScalar(11)).add(new THREE.Vector3(0, 3, 0))); }));
  ['pointerdown', 'wheel'].forEach(ev => rendu.domElement.addEventListener(ev, () => { ctrl.autoRotate = false; }, { passive: true }));

  /* ---------- vue du dessus pour la carte (rendue une fois, sans pastilles) ---------- */
  try {
    sprites.forEach(s => s.visible = false); ombre.visible = false;
    const r2 = new THREE.WebGLRenderer({ antialias: true, alpha: true }); r2.setSize(128, 128); r2.outputColorSpace = THREE.SRGBColorSpace;
    const c2 = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 50); c2.position.set(0, 20, 0); c2.up.set(0, 0, -1); c2.lookAt(0, 0, 0);
    r2.render(scene, c2); const url = r2.domElement.toDataURL('image/png'); r2.dispose();
    sprites.forEach(s => s.visible = true); ombre.visible = true;
    window.camionDessusUrl = url; if (window.poserCamionDessus) window.poserCamionDessus(url);
  } catch (e) { /* pas de WebGL : le marqueur SVG reste */ }
}
