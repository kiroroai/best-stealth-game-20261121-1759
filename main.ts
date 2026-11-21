// main.ts — the entrypoint (Node 22, standard library only).
// Night Archive is plain static files under game/ plus screenshots/ of the game
// running in a browser. This program hands the entry in: it copies game/ and
// screenshots/ from beside this file into /output and writes /output/dossier.json
// with buildDossier from the vendored make.fun library, so the judge can read
// the game. Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The copy is byte-for-byte deterministic: two runs write identical files.

import { cpSync, existsSync, mkdirSync, writeFileSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

if (!existsSync(join(here, 'game', 'index.html'))) {
  throw new Error('game/index.html is missing next to main.ts');
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps: only text_max_bytes shapes the bytes; the rest refuse
// an entry the scorer would refuse (more than 4 screenshots or one over
// 256 KiB; more than 993 files in game/ or 48 MiB of game files in all).
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);

// One deterministic summary line on stdout; nothing here affects /output.
console.log(
  'Night Archive handed in: '
    + readdirSync(join(out, 'screenshots')).length + ' screenshots, dossier '
    + statSync(join(out, 'dossier.json')).size + ' bytes.',
);
