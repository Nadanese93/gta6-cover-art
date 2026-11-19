// main.ts — hands the Neon Skyline Studio entry in.
// Node 22, standard library only. Copies app/ and screenshots/ from beside
// this file into the output directory, then writes dossier.json with the
// kit's buildDossier. Paths are anchored on this file's own location, never
// on the process working directory (the grader runs with cwd != /bot).

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoDir = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const dossierCaps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000
};

function copyTree(name: string): void {
  const from = join(repoDir, name);
  if (!existsSync(from)) throw new Error(`missing ${name}/ beside main.ts`);
  cpSync(from, join(outDir, name), { recursive: true });
}

function main(): void {
  mkdirSync(outDir, { recursive: true });
  copyTree('app');
  copyTree('screenshots');
  const dossier = buildDossier(outDir, dossierCaps);
  writeFileSync(join(outDir, 'dossier.json'), dossier);
}

main();
