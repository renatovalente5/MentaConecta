// O TRAVÃO antes de publicar (`node scripts/auditar.mjs`, depois do gerar).
// Lê o _site/ como um visitante e pára a publicação se alguma coisa estiver mal.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { RAIZ, BASE, dominio, marca, produtos, cores, conferencia, foraDoSite } from './site.mjs';
import { problemasDoArtigo, familiasDe } from './regras.mjs';
import { PARES, COR, medir } from './contrastes.mjs';
import { total, minimo, euros, comIva } from '../assets/js/preco.js';

const SAIDA = process.env.SAIDA || join(RAIZ, '_site');
const erros = [];
const mal = (m) => erros.push(m);
const ficheiros = (d) => readdirSync(d).flatMap((f) => { const c = join(d, f); return statSync(c).isDirectory() ? ficheiros(c) : [c]; });
const todos = ficheiros(SAIDA);
const paginas = todos.filter((f) => f.endsWith('.html'));
const existe = (url) => {
  const sem = decodeURIComponent(url.split(/[?#]/)[0]);
  if (!sem.startsWith(`${BASE}/`)) return false;
  const c = join(SAIDA, sem.slice(BASE.length));
  return existsSync(c) && (statSync(c).isFile() || existsSync(join(c, 'index.html')));
};
const titulos = new Map(), descricoes = new Map();
const PERMITIDOS = /^(https:\/\/wa\.me\/|mailto:|tel:|https:\/\/www\.livroreclamacoes\.pt|https:\/\/www\.google\.com\/maps\/search|https:\/\/(www\.)?(instagram|facebook|linkedin)\.com\/|https:\/\/www\.cnpd\.pt|https?:\/\/[a-z0-9.-]+\.(pt|eu|org)\/)/;

for (const f of paginas) {
  const rel = relative(SAIDA, f);
  const h = readFileSync(f, 'utf8');
  const h1 = (h.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) mal(`${rel}: ${h1} H1 (tem de ser 1)`);
  const t = h.match(/<title>([^<]+)<\/title>/)?.[1];
  const d = h.match(/<meta name="description" content="([^"]+)"/)?.[1];
  if (!t) mal(`${rel}: sem <title>`); else { if (titulos.has(t)) mal(`${rel}: título repetido de ${titulos.get(t)}`); titulos.set(t, rel); }
  if (!d) mal(`${rel}: sem descrição`); else if (!rel.startsWith('404')) { if (descricoes.has(d)) mal(`${rel}: descrição repetida de ${descricoes.get(d)}`); descricoes.set(d, rel); }
  if ((!dominio || marca.demo) && !h.includes('<meta name="robots" content="noindex">')) mal(`${rel}: ${dominio ? 'pré-visualização' : 'sem domínio'} e sem noindex`);
  if (marca.demo && h.includes('"@type":"Product"')) mal(`${rel}: dados estruturados de produto numa pré-visualização`);
  // Carregamentos: tudo do próprio site.
  for (const [, u] of h.matchAll(/<(?:script|img|iframe|source|video|audio)[^>]+\bsrc="([^"]+)"/g)) if (/^https?:/.test(u)) mal(`${rel}: carrega de fora: ${u}`);
  for (const [tag] of h.matchAll(/<link[^>]+>/g)) { const u = tag.match(/href="([^"]+)"/)?.[1]; if (u && /rel="(stylesheet|preload|icon|apple-touch-icon|manifest|modulepreload)"/.test(tag) && /^https?:/.test(u)) mal(`${rel}: carrega de fora: ${u}`); }
  // Ligações internas resolvem; externas só as conhecidas.
  for (const [, u] of h.matchAll(/\bhref="([^"]+)"/g)) {
    if (u.startsWith('#') || u.startsWith('data:')) continue;
    if (/^https?:|^mailto:|^tel:/.test(u)) { if (!u.startsWith('https://renatovalente5.github.io') && !PERMITIDOS.test(u)) mal(`${rel}: ligação externa não prevista: ${u}`); continue; }
    if (!u.startsWith(`${BASE}/`)) mal(`${rel}: caminho sem o prefixo ${BASE}: ${u}`);
    else if (!existe(u)) mal(`${rel}: ligação partida: ${u}`);
  }
  for (const [, u] of h.matchAll(/\bsrc="([^"]+)"/g)) if (u.startsWith('/') && !existe(u)) mal(`${rel}: ficheiro em falta: ${u}`);
  // Ids únicos e referências resolvidas (os símbolos e os gradientes do sprite).
  const ids = [...h.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  if (dup.length) mal(`${rel}: ids repetidos: ${[...new Set(dup)].join(', ')}`);
  const conj = new Set(ids);
  for (const [, x] of h.matchAll(/href="#([^"]+)"/g)) if (!conj.has(x) && !['conteudo', 'livre-resolucao'].includes(x) && !x.startsWith('kit-')) mal(`${rel}: referência a #${x} que não existe`);
  for (const [, x] of h.matchAll(/url\(#([^)]+)\)/g)) if (!conj.has(x)) mal(`${rel}: url(#${x}) sem destino`);
  // O mapa de importação cobre os módulos.
  const mapa = h.match(/<script type="importmap">([^<]+)<\/script>/)?.[1];
  if (!mapa) mal(`${rel}: sem mapa de importação`);
  else for (const [k, v] of Object.entries(JSON.parse(mapa).imports)) if (!existe(v)) mal(`${rel}: o mapa aponta para ${v}, que não existe (${k})`);
}

// Os preços que se vêem = as contas do preco.js.
const familiasDasRegras = familiasDe(conferencia.dados.familias);
for (const p of produtos) {
  const f = join(SAIDA, `produtos/${p.familia}/${p.slug}/index.html`);
  if (!existsSync(f)) { mal(`falta a página de ${p.slug}`); continue; }
  const h = readFileSync(f, 'utf8');
  const t = total(p, minimo(p));
  const sem = h.match(/data-preco-sem>([^<]+)</)?.[1]?.trim();
  const com = h.match(/data-preco-com>([^<]+)</)?.[1]?.trim();
  if (sem !== euros(t)) mal(`${p.slug}: preço sem IVA «${sem}» ≠ contas «${euros(t)}»`);
  if (com !== euros(comIva(t, marca.iva ?? 23))) mal(`${p.slug}: preço com IVA «${com}» ≠ contas`);
  // As regras (scripts/regras.mjs, as da guarda e do painel: o preço por unidade que não sobe, a
  // composição dos têxteis…): um produto no site não tem nenhum erro — o gerador escondeu os que tinham.
  const { coresDet, ...artigo } = p;
  for (const x of problemasDoArtigo(artigo, { nome: p.slug, familias: familiasDasRegras, cores })) if (x.classe !== 'avisa') mal(`${p.slug}: está no site com um erro das regras — ${x.mensagem}`);
}

// O que está fora do site (os rascunhos, os artigos e os packs com erros, as famílias sem artigos)
// não aparece em lado nenhum: nem página, nem ligação, nem no catálogo, nem no sitemap.
{
  const catalogo = JSON.parse(readFileSync(join(SAIDA, 'assets/catalogo.json'), 'utf8'));
  const sitemap = existsSync(join(SAIDA, 'sitemap.xml')) ? readFileSync(join(SAIDA, 'sitemap.xml'), 'utf8') : '';
  const htmls = paginas.map((f) => [relative(SAIDA, f), readFileSync(f, 'utf8')]);
  const emLadoNenhum = (o, caminho, marcas) => {
    if (caminho && existsSync(join(SAIDA, caminho))) mal(`${o}: está fora do site, mas tem página (${caminho})`);
    if (caminho && sitemap.includes(`/${caminho}<`)) mal(`${o}: está fora do site, mas está no sitemap`);
    for (const [rel, h] of htmls) for (const m of marcas) if (h.includes(m)) mal(`${rel}: mostra ${o}, que está fora do site (${m})`);
  };
  for (const a of foraDoSite.artigos) {
    if (catalogo.produtos.some((x) => x.slug === a.slug)) mal(`produto ${a.slug}: está fora do site, mas está no catálogo`);
    emLadoNenhum(`o produto ${a.slug}`, `produtos/${a.familia}/${a.slug}/`, [`${BASE}/produtos/${a.familia}/${a.slug}/`, `"slug":"${a.slug}"`]);
  }
  for (const f of foraDoSite.familias) {
    if (catalogo.familias.some((x) => x.slug === f)) mal(`família ${f}: está fora do site, mas está no catálogo`);
    emLadoNenhum(`a família ${f}`, `produtos/${f}/`, [`${BASE}/produtos/${f}/`]);
  }
  for (const k of foraDoSite.kits) {
    if (catalogo.kits.some((x) => x.slug === k)) mal(`pack ${k}: está fora do site, mas está no catálogo`);
    emLadoNenhum(`o pack ${k}`, null, [`id="kit-${k}"`, `data-kit="${k}"`]);
  }
}

// Contrastes medidos.
for (const [a, b, min, onde] of PARES) { const r = medir(COR[a], COR[b]); if (r < min) mal(`contraste ${a} sobre ${b} = ${r.toFixed(2)} < ${min} (${onde})`); }

// Orçamentos (gzip, como o GitHub Pages serve).
const gz = (fs) => fs.reduce((s, f) => s + gzipSync(readFileSync(f)).length, 0);
const js = gz(todos.filter((f) => f.endsWith('.js'))), css = gz(todos.filter((f) => f.endsWith('.css')));
if (js > 60 * 1024) mal(`JS com ${Math.round(js / 1024)} KB comprimido (máximo 60)`);
if (css > 70 * 1024) mal(`CSS com ${Math.round(css / 1024)} KB comprimido (máximo 70)`);

// O movimento tem travão.
const mov = readFileSync(join(RAIZ, 'assets/css/movimento.css'), 'utf8');
if (!/prefers-reduced-motion: reduce/.test(mov) || !/data-movimento="parado"/.test(mov)) mal('movimento.css sem a versão parada');
if (dominio && marca.demo && existsSync(join(SAIDA, 'sitemap.xml'))) mal('sitemap numa pré-visualização (as páginas dizem noindex)');

console.log(`${paginas.length} páginas · JS ${Math.round(js / 1024)} KB · CSS ${Math.round(css / 1024)} KB (gzip)`);
if (erros.length) { console.log(`✗ ${erros.length} problema(s):\n  ${erros.join('\n  ')}`); process.exit(1); }
console.log('✓ auditoria sem problemas');
