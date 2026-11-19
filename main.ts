/**
 * main.ts — hands this entry to the grader.
 * Copies app/ and screenshots/ into the output directory and writes
 * /output/dossier.json with buildDossier from vendor/makefun-app.ts.
 * Paths are resolved from this file, never from process.cwd(): the grader
 * runs with a working directory that is not the repository.
 */
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-app.ts";

const here = fileURLToPath(new URL(".", import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";

function main(): void {
  mkdirSync(outDir, { recursive: true });
  for (const name of ["app", "screenshots"]) {
    const target = join(outDir, name);
    if (existsSync(target)) rmSync(target, { recursive: true, force: true });
    cpSync(join(here, name), target, { recursive: true });
  }
  const dossier = buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  });
  writeFileSync(join(outDir, "dossier.json"), dossier);
  console.log(`wrote ${outDir}/dossier.json (${dossier.length} bytes)`);
}

main();
