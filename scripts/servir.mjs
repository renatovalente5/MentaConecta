// Servidor local para rever o _site/ como o GitHub Pages o serve (em /MentaConecta/).
// `node scripts/servir.mjs [porta]` — sem cache, com a 404 do site.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { RAIZ, BASE } from './site.mjs';
const SAIDA = process.env.SAIDA || join(RAIZ, '_site');
const PORTA = Number(process.argv[2] || process.env.PORTA || 8940);
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml' };
createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  let caminho = decodeURIComponent(url.pathname);
  if (BASE && caminho === '/') { res.writeHead(302, { location: `${BASE}/` }); return res.end(); }
  if (BASE && !caminho.startsWith(`${BASE}/`) && caminho !== BASE) return enviar404(res);
  caminho = caminho.slice(BASE.length) || '/';
  let f = normalize(join(SAIDA, caminho));
  if (!f.startsWith(SAIDA)) return enviar404(res);
  try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); } catch { /* 404 abaixo */ }
  try {
    const corpo = await readFile(f);
    res.writeHead(200, { 'content-type': TIPOS[extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(corpo);
  } catch { enviar404(res); }
}).listen(PORTA, () => console.log(`a servir ${SAIDA} em http://localhost:${PORTA}${BASE}/`));
async function enviar404(res) {
  try { res.writeHead(404, { 'content-type': TIPOS['.html'] }); res.end(await readFile(join(SAIDA, '404.html'))); } catch { res.writeHead(404); res.end('404'); }
}
