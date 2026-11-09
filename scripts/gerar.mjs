// GERA O SITE em _site/ (sem dependências: `node scripts/gerar.mjs`).
// Lê dados/, escreve uma página por endereço, o catálogo que o browser usa
// (orçamento, kits), o manifesto, o robots e — só com domínio — o sitemap.
import { writeFileSync, mkdirSync, rmSync, cpSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';
import { RAIZ, BASE, SITE, u, abs, dominio, marca, familias, produtos, kits, cores } from './site.mjs';
import * as P from './paginas.mjs';
import { verificarIdentificacao } from '../legal-comum/index.mjs';

const SAIDA = process.env.SAIDA ? resolve(process.env.SAIDA) : join(RAIZ, '_site');

if (dominio && marca.demo) {
  console.error('ERRO: há CNAME (domínio próprio) e a pré-visualização continua ligada (marca.demo). Desligue-a antes de publicar no domínio.');
  process.exit(1);
}
// A identificação do prestador (DL 7/2004, art. 10.º): em pré-visualização avisa;
// com o site a sério, pára a publicação se faltar alguma coisa.
const id = verificarIdentificacao({ nome: marca.firma, formaJuridica: marca.formaJuridica, nif: marca.nif, morada: [marca.morada, marca.codigoPostal, marca.localidade].filter(Boolean).join(', '), email: marca.email, telefone: marca.telefone, sociedade: marca.sociedade }, { modo: marca.demo ? 'avisar' : 'bloquear', ecra: 'dados/marca.json' });
if (id?.problemas?.length) console.log(`  aviso (pré-visualização): identificação por completar — ${[...new Set(id.problemas.map((p) => p.campo))].join(', ')}`);

// O CSS: as partes por ordem num só ficheiro (um pedido).
const PARTES = ['base', 'desenhos', 'componentes', 'paginas', 'movimento'];
writeFileSync(join(RAIZ, 'assets/css/site.css'), PARTES.map((n) => `/* ===== ${n}.css ===== */\n` + readFileSync(join(RAIZ, `assets/css/${n}.css`), 'utf8')).join('\n'));

rmSync(SAIDA, { recursive: true, force: true });
mkdirSync(SAIDA, { recursive: true });
cpSync(join(RAIZ, 'assets'), join(SAIDA, 'assets'), { recursive: true, filter: (src) => !/\/assets\/css\/(base|desenhos|componentes|paginas|movimento)\.css$/.test(src) });

const escrever = (caminho, html) => {
  const destino = join(SAIDA, caminho);
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, html, 'utf8');
};
const paginas = [];
const pag = (caminho, html) => { escrever(caminho.endsWith('.html') ? caminho : join(caminho, 'index.html'), html); if (!caminho.endsWith('404.html')) paginas.push(caminho); };

pag('', P.inicio());
pag('produtos/', P.produtosIndice());
for (const f of familias) pag(`produtos/${f.slug}/`, P.paginaFamilia(f));
for (const p of produtos) pag(`produtos/${p.familia}/${p.slug}/`, P.paginaProduto(p));
pag('packs/', P.paginaKits());
pag('orcamento/', P.paginaOrcamento());
pag('sobre/', P.paginaSobre());
pag('contactos/', P.paginaContactos());
pag('ligacoes/', P.paginaLigacoes());
pag('termos/', P.paginaTermos());
pag('privacidade/', P.paginaPrivacidade());
escrever('404.html', P.pagina404());

// O catálogo que o browser lê (orçamento, kits): sem preços calculados — o
// browser calcula com o mesmo preco.js.
const catalogo = {
  marca: { nome: marca.nome, whatsapp: marca.whatsapp, email: marca.email, iva: marca.iva ?? 23, demo: !!marca.demo, teste: marca.mensagens.teste, endereco: abs('') },
  familias: familias.map((f) => ({ slug: f.slug, nome: f.nome })),
  produtos: produtos.map((p) => ({ slug: p.slug, familia: p.familia, nome: p.nome, titulo: p.titulo, tipo: p.tipo, desenho: p.desenho, alvo: p.corAlvo || '', unidade: p.unidade || 'un.', quantidades: p.quantidades, opcoes: p.opcoes || [], cores: p.coresDet.map(({ chave, nome, hex, grupo }) => ({ chave, nome, hex, grupo })), tecnica: undefined })),
  kits: kits.map((k) => ({ slug: k.slug, nome: k.nome, preco: Math.round(k.preco * 100), minimo: k.minimo, pecas: k.pecas })),
  cores,
};
escrever('assets/catalogo.json', JSON.stringify(catalogo));

escrever('manifest.webmanifest', JSON.stringify({ name: marca.nome, short_name: marca.nome, start_url: u(''), display: 'standalone', background_color: '#F4FAF7', theme_color: '#F4FAF7', icons: [{ src: u('assets/icone-192.png'), sizes: '192x192', type: 'image/png' }, { src: u('assets/icone-512.png'), sizes: '512x512', type: 'image/png' }] }));
// robots.txt: no endereço de projecto do GitHub, o /MentaConecta/robots.txt não conta
// (só o da raiz do anfitrião); a página diz `noindex`. Com domínio: sitemap.
if (dominio) {
  escrever('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${abs('sitemap.xml')}\n`);
  escrever('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paginas.map((c) => `  <url><loc>${abs(c)}</loc></url>`).join('\n')}\n</urlset>\n`);
}
writeFileSync(join(SAIDA, '.nojekyll'), '');

console.log(`gerado em ${relative(process.cwd(), SAIDA) || '.'}/ — ${paginas.length + 1} páginas (${produtos.length} produtos, ${familias.length} famílias)`);
console.log(`  base: ${BASE || '/'}   site: ${SITE}${marca.demo ? '   [pré-visualização]' : ''}`);
