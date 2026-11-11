// GERA O SITE em _site/ (sem dependências: `node scripts/gerar.mjs`).
// Lê dados/ pelas regras (scripts/regras.mjs, via site.mjs: o que pára a publicação
// pára aqui, e os rascunhos e os artigos e packs com erros ficam de fora), escreve
// uma página por endereço, o catálogo que o browser usa (orçamento, kits), o
// manifesto, o robots e — só com domínio — o sitemap e o .htaccess do alojamento.
import { writeFileSync, mkdirSync, rmSync, cpSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';
import { RAIZ, BASE, SITE, u, abs, dominio, marca, familias, produtos, kits, cores, conferencia, foraDoSite } from './site.mjs';
import * as P from './paginas.mjs';
import { descreverEfeitos } from './regras.mjs';
import { verificarIdentificacao } from '../legal-comum/index.mjs';

const SAIDA = process.env.SAIDA ? resolve(process.env.SAIDA) : join(RAIZ, '_site');

// Uma pré-visualização pode viver no domínio (9 nov 2026: o Renato quis abrir o site no
// mentaconecta.pt antes de a Menta dar a firma, o NIF e a morada). Continua com a faixa, o
// `noindex`, os preços de exemplo e o prefixo de teste nas mensagens, e sem sitemap; o site
// fica a sério com `demo: false`, e aí a identificação que falte pára a publicação.
if (dominio && marca.demo) console.log(`  aviso: pré-visualização no domínio ${dominio} (marca.demo)`);
// A identificação do prestador (DL 7/2004, art. 10.º): em pré-visualização avisa;
// com o site a sério, pára a publicação se faltar alguma coisa.
const id = verificarIdentificacao({ nome: marca.firma, formaJuridica: marca.formaJuridica, nif: marca.nif, morada: [marca.morada, marca.codigoPostal, marca.localidade].filter(Boolean).join(', '), email: marca.email, telefone: marca.telefone, sociedade: marca.sociedade }, { modo: marca.demo ? 'avisar' : 'bloquear', ecra: 'dados/marca.json' });
if (id?.problemas?.length) console.log(`  aviso (pré-visualização): identificação por completar — ${[...new Set(id.problemas.map((p) => p.campo))].join(', ')}`);
// O que as regras tiraram do site (a cópia neutralizada) e os avisos dos dados.
for (const e of conferencia.neutro.efeitos) console.log(`  aviso: ${e.tipo === 'pack' ? 'Packs' : 'Artigos'} › ${e.nome}: ${descreverEfeitos(e)}`);
{
  const n = conferencia.problemas.filter((p) => p.classe === 'avisa').length;
  if (n) console.log(`  aviso: ${n} ${n === 1 ? 'aviso' : 'avisos'} nos dados (node scripts/guarda.mjs diz quais)`);
}

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
// (só o da raiz do anfitrião); a página diz `noindex`. Com domínio: sitemap — menos numa
// pré-visualização, que diz `noindex` em todas as páginas.
if (dominio && marca.demo) {
  escrever('robots.txt', 'User-agent: *\nAllow: /\n');
} else if (dominio) {
  escrever('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${abs('sitemap.xml')}\n`);
  escrever('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paginas.map((c) => `  <url><loc>${abs(c)}</loc></url>`).join('\n')}\n</urlset>\n`);
}
writeFileSync(join(SAIDA, '.nojekyll'), '');
// O ALOJAMENTO DA MENTA (11 nov 2026: o cPanel do Yuri na PTisp, um Apache) faz o que o GitHub
// Pages fazia sozinho: https, a página 404, compressão, os tipos das letras e do manifesto, e uma
// cache curta (o CSS e o JS já mudam de nome por versão). As verificações do certificado
// (/.well-known/) não se redirigem. Numa pré-visualização, o `noindex` vai também no cabeçalho.
if (dominio) {
  escrever('.htaccess', [
    '# Gerado pelo scripts/gerar.mjs: não editar no servidor (a publicação seguinte reescreve-o).',
    'ErrorDocument 404 /404.html',
    'AddType font/woff2 .woff2',
    'AddType application/manifest+json .webmanifest',
    '# O manifesto da publicação (scripts/publicar-ftp.py) não se serve.',
    '<Files ".publicado.json">',
    '  Require all denied',
    '</Files>',
    '<IfModule mod_rewrite.c>',
    '  RewriteEngine On',
    '  RewriteCond %{REQUEST_URI} !^/\\.well-known/',
    '  RewriteCond %{HTTPS} !=on',
    `  RewriteRule ^ https://${dominio}%{REQUEST_URI} [R=301,L]`,
    '</IfModule>',
    '<IfModule mod_deflate.c>',
    '  AddOutputFilterByType DEFLATE text/html text/css text/plain application/javascript application/json application/manifest+json image/svg+xml',
    '</IfModule>',
    '<IfModule mod_headers.c>',
    '  Header set Cache-Control "max-age=600"',
    ...(marca.demo ? ['  Header set X-Robots-Tag "noindex"'] : []),
    '</IfModule>',
    '',
  ].join('\n'));
}

const fora = foraDoSite.artigos.length + foraDoSite.familias.length + foraDoSite.kits.length;
console.log(`gerado em ${relative(process.cwd(), SAIDA) || '.'}/ — ${paginas.length + 1} páginas (${produtos.length} produtos, ${familias.length} famílias, ${kits.length} packs)${fora ? ` — fora do site: ${foraDoSite.artigos.length} produtos, ${foraDoSite.familias.length} famílias, ${foraDoSite.kits.length} packs` : ''}`);
console.log(`  base: ${BASE || '/'}   site: ${SITE}${marca.demo ? '   [pré-visualização]' : ''}`);
