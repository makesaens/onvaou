// L'orchestrateur : node chaine/run.mjs ep4 [--from M3] [--auto] [--no-video]
// Ordre : M1 M2 M3 M4 M7 M9 puis M10 (publication) si --auto ou si le verdict est GO et --publish.
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { ROOT, epDir, readJSON } from './lib.mjs';
// le verrou posé par le veilleur est levé quand la chaîne se termine, quoi qu'il arrive
process.on('exit', () => { try { fs.unlinkSync(path.join(ROOT, 'cache/veilleur.lock')); } catch {} });

const args = process.argv.slice(2);
const ep = args.find(a => /^ep\d+$/.test(a));
if (!ep) { console.error('usage : run.mjs epN [--from M3] [--auto] [--no-video]'); process.exit(2); }
const from = (args[args.indexOf('--from') + 1] || 'M1').toUpperCase();
const auto = args.includes('--auto');
const ORDRE = [
  ['M1', 'm1-collecteur.mjs', args.includes('--no-video') ? ['--no-video'] : []],
  ['M2', 'm2-transcripteur.mjs', []],
  ['M3', 'm3-decoupeur.mjs', []],
  ['M4', 'm4-lecteur.mjs', []],
  ['M7', 'm7-geographe.mjs', []],
  ['M9', 'm9-controleur.mjs', []],
];
const start = ORDRE.findIndex(([m]) => m === from);
for (const [m, script, extra] of ORDRE.slice(start < 0 ? 0 : start)) {
  const r = spawnSync('node', [path.join(ROOT, 'chaine', script), ep, ...extra], { stdio: 'inherit' });
  if (r.status !== 0) { console.error(`⛔ ${m} a échoué, la chaîne s'arrête ici.`); process.exit(1); }
}
const ctrl = readJSON(path.join(epDir(ep), 'controle.json'), { verdict: 'NO-GO' });
console.log(`\n=== ${ep} : ${ctrl.verdict} ${ctrl.bloquants?.length ? '(' + ctrl.bloquants.join(', ') + ')' : ''} ===`);
if (ctrl.verdict === 'GO' && auto) {
  const r = spawnSync('node', [path.join(ROOT, 'chaine/m10-batisseur.mjs'), '--publish'], { stdio: 'inherit' });
  process.exit(r.status);
} else if (ctrl.verdict === 'GO') {
  console.log(`Barrière : lis episodes/${ep}/rapport.md puis : node chaine/m10-batisseur.mjs --publish`);
}
