// Palm Bay Cover Studio — local static server for trying the app.
// Serves app/ at http://localhost:8080. Node 22, standard library only.

import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname, extname } from 'node:path';

const here = fileURLToPath(new URL('.', import.meta.url));
const appDir = join(dirname(here), 'app');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const server = createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://localhost:8080');
  let path = url.pathname === '/' ? '/index.html' : url.pathname;
  const file = join(appDir, path);
  if (!file.startsWith(appDir) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});

server.listen(8080, () => {
  console.log('Palm Bay Cover Studio at http://localhost:8080');
});
