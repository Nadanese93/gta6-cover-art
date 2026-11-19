// serve.ts — a tiny static server for developing the app locally.
// Serves app/ at the root: `node serve.ts --port 8080` then open
// http://localhost:8080. Node 22, standard library only.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = join(dirname(fileURLToPath(import.meta.url)), 'app');

const mimeByExt: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8'
};

function portFromArgs(): number {
  const i = process.argv.indexOf('--port');
  const raw = i >= 0 ? process.argv[i + 1] : undefined;
  const n = Number(raw ?? 8080);
  return Number.isSafeInteger(n) && n > 0 && n < 65536 ? n : 8080;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    let rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
    rel = normalize(rel).replace(/^(\.\.[/\\])+/, '');
    const file = join(appDir, rel);
    if (!file.startsWith(appDir)) {
      res.writeHead(403);
      res.end('forbidden');
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': mimeByExt[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});

const port = portFromArgs();
server.listen(port, () => {
  console.log(`Neon Skyline Studio at http://localhost:${port}`);
});
