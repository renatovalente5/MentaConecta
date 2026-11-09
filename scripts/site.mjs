// O QUE TODAS AS PÁGINAS TÊM: o endereço-base, o esqueleto do HTML, o cabeçalho,
// o menu do telemóvel, o painel dos produtos e o rodapé.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { icone, iconeFamilia } from './icones.mjs';
import { sprite } from '../assets/js/desenhos.js';
import { desde, euros } from '../assets/js/preco.js';
import { VERSAO as VERSAO_LEGAL, livroReclamacoes } from '../legal-comum/index.mjs';
import { conferir } from './guarda.mjs';
import { ordemDe } from './regras.mjs';

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = 'MentaConecta';
const DONO = 'renatovalente5';
/* ONDE O SITE VIVE: com um ficheiro CNAME é a raiz de um domínio; sem ele, o
   endereço de projecto do GitHub (/MentaConecta/). Um só facto decide o prefixo e o
   endereço canónico (lição do NewAuto). */
export const dominio = existsSync(join(RAIZ, 'CNAME')) ? readFileSync(join(RAIZ, 'CNAME'), 'utf8').trim() : null;
export const BASE = (process.env.BASE ?? (dominio ? '' : `/${REPO}`)).replace(/\/$/, '');
export const SITE = (process.env.SITE ?? (dominio ? `https://${dominio}` : `https://${DONO}.github.io`)).replace(/\/$/, '');
export const u = (p = '') => `${BASE}/${String(p).replace(/^\//, '')}`;
export const abs = (p = '') => `${SITE}${u(p)}`;

export const ler = (p) => JSON.parse(readFileSync(join(RAIZ, p), 'utf8'));
/* OS DADOS PASSAM PELAS REGRAS (scripts/regras.mjs, as mesmas do painel), pela guarda: o que pára a
   publicação pára aqui também, e o site lê a CÓPIA NEUTRALIZADA — sem os rascunhos (`publicado:
   false`), sem os artigos e os packs com erros, sem as famílias que ficam sem artigos e sem os packs
   com um artigo que não está no site. Os ficheiros de dados/ não mudam. */
export const conferencia = conferir(RAIZ);
{
  const param = conferencia.problemas.filter((p) => p.classe === 'bloqueia');
  if (param.length) {
    console.error(`A publicação parou: ${param.length} ${param.length === 1 ? 'problema' : 'problemas'} nos dados (node scripts/guarda.mjs diz tudo).`);
    for (const p of param) console.error(`  ✗ ${p.ecra}: ${p.mensagem}`);
    process.exit(1);
  }
}
export const marca = JSON.parse(conferencia.dados.marca);
const CORES = JSON.parse(conferencia.dados.cores);
export const cores = CORES;
// As famílias com artigos no site, pela ordem do ficheiro.
export const familias = conferencia.site.familias;
// Os produtos: um ficheiro cada (como o painel os vai gravar), só os do site, pela ordem do campo `ordem`.
export const produtos = conferencia.site.artigos
  .map((p) => ({ ...p, ordem: ordemDe(p), coresDet: p.cores.map((k) => ({ chave: k, ...CORES[k] })) }));
export const kits = conferencia.site.kits;
// O que não vai para o site (a auditoria confere que não aparece em lado nenhum).
export const foraDoSite = conferencia.site.fora;
/* VERSÕES POR CONTEÚDO. O GitHub Pages guarda os ficheiros 10 minutos: com um
   número só no ponto de entrada, os módulos importados ficavam da versão anterior.
   O mapa de importação dá a cada módulo o resumo do seu próprio conteúdo. */
const resumo = (rel) => createHash('sha256').update(readFileSync(join(RAIZ, rel))).digest('hex').slice(0, 10);
export const versao = (rel) => `${u(rel)}?v=${resumo(rel)}`;
const MODULOS = readdirSync(join(RAIZ, 'assets/js')).filter((f) => f.endsWith('.js') && f !== 'cabeca.js');
const MAPA = JSON.stringify({ imports: Object.fromEntries(MODULOS.map((f) => [u(`assets/js/${f}`), versao(`assets/js/${f}`)])) });

const ENT = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ENT[c]);
export const legal = (peca, html) => `<!-- legal-comum:${peca} v${VERSAO_LEGAL} -->${html}<!-- /legal-comum:${peca} -->`;

export const porDefinir = (v) => (v && String(v).trim()) || '';
export const ou = (v, alt = '(por indicar)') => esc(porDefinir(v) || alt);

// O WhatsApp: com número vai direito à conversa; sem número (pré-visualização)
// abre o WhatsApp para o visitante escolher a quem enviar.
// Na pré-visualização a mensagem começa por «[Teste — pré-visualização]»: um
// preço de exemplo que chegue a uma caixa de correio verdadeira diz o que é.
export const prefixoTeste = () => (marca.demo ? marca.mensagens.teste : '');
export const whatsapp = (texto = marca.mensagens.geral) =>
  `https://wa.me/${porDefinir(marca.whatsapp).replace(/\D/g, '')}?text=${encodeURIComponent(prefixoTeste() + texto)}`;

export const produtosDe = (slug) => produtos.filter((p) => p.familia === slug);
/* A imagem de partilha de uma família (scripts/imagens.mjs faz uma por família, à mão): uma família
   criada no painel ainda não tem a dela, e partilha a do site até alguém correr o imagens.mjs. */
export const ogDaFamilia = (slug) => (existsSync(join(RAIZ, `assets/og/${slug}.png`)) ? `og/${slug}.png` : 'og/menta.png');
export const familia = (slug) => familias.find((f) => f.slug === slug);
export const desdeFamilia = (slug) => Math.min(...produtosDe(slug).map(desde));

/* ——— Títulos ———
   As palavras vêm partidas do gerador (cada uma num <span> com o seu índice), e o
   destaque leva o traço impresso — um caminho desenhado à mão que o CSS desenha.
   Sem JS o título fica inteiro e parado. */
export function titulo({ antes = '', destaque = '', depois = '', nivel = 2, classe = '', id = '' } = {}) {
  let i = 0;
  const palavras = (t) => esc(t).split(/(\s+)/).map((p) => (/^\s+$/.test(p) || !p ? p : `<span class="p" style="--i:${i++}">${p}</span>`)).join('');
  const d = destaque ? `<span class="destaque">${palavras(destaque)}${traco()}</span>` : '';
  return `<h${nivel} class="titulo${classe ? ' ' + classe : ''}"${id ? ` id="${id}"` : ''}>${palavras(antes)}${antes && d ? ' ' : ''}${d}${depois ? ' ' + palavras(depois) : ''}</h${nivel}>`;
}
// O traço: um risco de caneta (o CSS desenha-o com um recorte) e a faceta — um
// triângulo como os do M — que cai no fim dele.
export const traco = () => `<svg class="traco" viewBox="0 0 300 24" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M4 15 C 58 6, 122 5, 176 10 S 262 18, 288 9" pathLength="1"/></svg><span class="traco-faceta" aria-hidden="true"></span>`;

/* O logótipo: o M deles (o desenho original, só sem o fundo) e o nome escrito ao
   lado, «Menta» fino e «Conecta» forte, como no logótipo. O M nunca se redesenha. */
export const LOGO_M = { src: 'assets/logo/menta-m-420.png', largura: 420, altura: 290 };
export function logotipo({ classe = 'logo' } = {}) {
  const [fino, ...forte] = marca.nome.split(' ');
  return `<span class="${classe}"><img class="logo__m" src="${u(LOGO_M.src)}" width="${LOGO_M.largura}" height="${LOGO_M.altura}" alt=""><span class="logo__nome"><span class="logo__fino">${esc(fino)}</span><span class="logo__forte">${esc(forte.join(' '))}</span></span></span>`;
}

/* ——— O esqueleto ——— */
export function pagina({ caminho, titulo: t, descricao, corpo, classe = '', jsonld = [], scripts = [], og = 'og/menta.png', preload = [], desenhos = [] }) {
  const canonico = abs(caminho);
  const tituloCompleto = t ? `${t} · ${marca.nome}` : `${marca.nome} — ${marca.assinatura}`;
  const ld = jsonld.filter(Boolean).map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('\n');
  return `<!doctype html>
<html lang="pt-PT" class="sem-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(tituloCompleto)}</title>
<meta name="description" content="${esc(descricao)}">
<link rel="canonical" href="${canonico}">
${marca.demo || !dominio ? '<meta name="robots" content="noindex">' : ''}
<meta name="theme-color" content="#F4FAF7">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_PT">
<meta property="og:site_name" content="${esc(marca.nome)}">
<meta property="og:title" content="${esc(t || marca.nome)}">
<meta property="og:description" content="${esc(descricao)}">
<meta property="og:url" content="${canonico}">
<meta property="og:image" content="${abs('assets/' + og)}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${u('assets/favicon.png')}" type="image/png">
<link rel="apple-touch-icon" href="${u('assets/apple-touch-icon.png')}">
<link rel="manifest" href="${u('manifest.webmanifest')}">
<link rel="preload" href="${u('assets/fontes/bricolage-var.woff2')}" as="font" type="font/woff2" crossorigin>
${preload.join('\n')}
<link rel="stylesheet" href="${versao('assets/css/site.css')}">
<script>${CABECA_JS}</script>
<script type="importmap">${MAPA}</script>
<script type="speculationrules">{"prerender":[{"where":{"and":[{"href_matches":"${BASE}/produtos/*"},{"not":{"href_matches":"*#*"}}]},"eagerness":"moderate"}]}</script>
${ld}
</head>
<body class="${classe}">
<a class="saltar" href="#conteudo">Saltar para o conteúdo</a>
${sprite(desenhos)}
${faixaDemo()}
${cabecalho(caminho)}
<main id="conteudo" tabindex="-1">
${corpo}
</main>
${rodape()}
${menuTelemovel(caminho)}
<div class="gaveta-orcamento" id="orcamento" hidden></div>
<div class="aviso" role="status" aria-live="polite"></div>
<script type="module" src="${versao('assets/js/site.js')}"></script>
${scripts.map((s) => `<script type="module" src="${versao(`assets/js/${s}`)}"></script>`).join('\n')}
</body>
</html>
`;
}

/* Vai EM LINHA no <head>: marca o JS, repõe a escolha «Pausar movimento» antes da
   primeira pintura (para nada mexer nem um fotograma) e trata das transições
   entre páginas (o desenho do cartão voa para a página do produto). */
const CABECA_JS = readFileSync(join(RAIZ, 'assets/js/cabeca.js'), 'utf8')
  .replace(/^\s*\/\*[\s\S]*?\*\/\s*/m, '').trim();

function faixaDemo() {
  if (!marca.demo) return '';
  return `<p class="faixa-demo">Pré-visualização do site · produtos, preços e prazos de exemplo</p>`;
}

const NAV = [
  ['produtos/', 'Produtos'],
  ['packs/', 'Packs'],
  ['sobre/', 'Sobre'],
  ['contactos/', 'Contactos'],
];

function cabecalho(caminho) {
  const actual = (c) => (caminho === c || (c !== '' && caminho.startsWith(c)) ? ' aria-current="page"' : '');
  return `<header class="cabecalho">
<div class="cabecalho__barra contentor">
  <a class="cabecalho__marca" href="${u('')}" aria-label="${esc(marca.nome)} — início">${logotipo()}</a>
  <nav class="cabecalho__nav" aria-label="Principal">
    <ul>
      <li><button class="nav-produtos" type="button" aria-expanded="false" aria-controls="painel-produtos"${caminho.startsWith('produtos/') ? ' data-actual' : ''}>Produtos ${icone('chevron')}</button></li>
      ${NAV.slice(1).map(([c, n]) => `<li><a href="${u(c)}"${actual(c)}>${n}</a></li>`).join('')}
    </ul>
  </nav>
  <div class="cabecalho__accoes">
    <button class="chip-logo" type="button" hidden data-logo-abrir>${icone('imagem')}<span>O seu logótipo</span></button>
    <button class="botao-orcamento" type="button" data-orcamento-abrir aria-controls="orcamento">${icone('orcamento')}<span class="botao-orcamento__texto">Orçamento</span><span class="contador" data-contador hidden>0</span></button>
    <a class="botao-redondo botao-redondo--whatsapp" href="${whatsapp()}" target="_blank" rel="noopener" aria-label="Falar connosco no WhatsApp">${icone('whatsapp')}</a>
    <button class="botao-menu" type="button" aria-expanded="false" aria-controls="menu-telemovel" aria-label="Abrir o menu">${icone('menu')}</button>
  </div>
</div>
${painelProdutos()}
</header>`;
}

function painelProdutos() {
  return `<div class="painel-produtos" id="painel-produtos" hidden>
<div class="contentor painel-produtos__caixa">
  <p class="painel-produtos__titulo etiqueta">Produtos</p>
  <ul class="painel-produtos__grelha">
    ${familias.map((f, i) => `<li style="--i:${i}"><a class="tile-familia" href="${u(`produtos/${f.slug}/`)}" style="--cor:${f.coresCapa[0]}">
      ${iconeFamilia(f.icone)}<span><b>${esc(f.nome)}</b><small>desde ${euros(desdeFamilia(f.slug))}/un.</small></span></a></li>`).join('')}
  </ul>
  <div class="painel-produtos__pe">
    <a class="ligacao" href="${u('produtos/')}">Ver todos os produtos</a>
    <a class="ligacao" href="${u('packs/')}">Packs para equipas e eventos</a>
  </div>
</div>
</div>`;
}

function menuTelemovel(caminho) {
  return `<div class="menu-telemovel" id="menu-telemovel" hidden>
<div class="menu-telemovel__topo">
  <a class="cabecalho__marca" href="${u('')}" aria-label="${esc(marca.nome)} — início">${logotipo()}</a>
  <button class="botao-redondo" type="button" data-menu-fechar aria-label="Fechar o menu">${icone('fechar')}</button>
</div>
<nav class="menu-telemovel__nav" aria-label="Menu">
  <p class="etiqueta">Produtos</p>
  <ul class="menu-telemovel__familias">
    ${familias.map((f, i) => `<li style="--i:${i}"><a href="${u(`produtos/${f.slug}/`)}" style="--cor:${f.coresCapa[0]}">${iconeFamilia(f.icone)}<span>${esc(f.nome)}</span></a></li>`).join('')}
  </ul>
  <ul class="menu-telemovel__paginas">
    ${[['', 'Início'], ...NAV].map(([c, n], i) => `<li style="--i:${i + familias.length}"><a href="${u(c)}"${caminho === c ? ' aria-current="page"' : ''}>${n}</a></li>`).join('')}
  </ul>
</nav>
<div class="menu-telemovel__pe">
  <a class="botao botao--whatsapp botao--bloco" href="${whatsapp()}" target="_blank" rel="noopener">${icone('whatsapp')} Falar no WhatsApp</a>
</div>
</div>`;
}

function redes() {
  const r = marca.redes || {};
  const lista = [['instagram', 'Instagram'], ['facebook', 'Facebook'], ['linkedin', 'LinkedIn']].filter(([k]) => porDefinir(r[k]));
  return lista.map(([k, n]) => `<a class="botao-redondo" href="${esc(r[k])}" target="_blank" rel="noopener" aria-label="${n}">${icone(k)}</a>`).join('');
}

export function telefoneHtml() {
  const t = porDefinir(marca.telefone);
  if (!t) return '<span class="por-indicar">(por indicar)</span>';
  return `<a href="tel:${t.replace(/\s/g, '')}">${esc(t)}</a> <span class="chamada">(Chamada para a rede móvel nacional)</span>`;
}

function rodape() {
  const ano = new Date().getFullYear();
  return `<footer class="rodape escuro">
<div class="rodape__cores" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
<div class="contentor rodape__grelha">
  <div class="rodape__marca">
    <a href="${u('')}" class="rodape__logo" aria-label="${esc(marca.nome)} — início">${logotipo()}</a>
    <p>${esc(marca.assinatura)} ${esc(marca.servicos)}.</p>
    <div class="rodape__redes">${redes()}<a class="botao-redondo botao-redondo--whatsapp" href="${whatsapp()}" target="_blank" rel="noopener" aria-label="WhatsApp">${icone('whatsapp')}</a></div>
  </div>
  <div>
    <p class="rodape__titulo">Produtos</p>
    <ul>${familias.map((f) => `<li><a href="${u(`produtos/${f.slug}/`)}">${esc(f.nome)}</a></li>`).join('')}</ul>
  </div>
  <div>
    <p class="rodape__titulo">A ${esc(marca.nome)}</p>
    <ul><li><a href="${u('packs/')}">Packs</a></li><li><a href="${u('sobre/')}">Sobre</a></li><li><a href="${u('contactos/')}">Contactos</a></li><li><a href="${u('orcamento/')}">O seu orçamento</a></li></ul>
  </div>
  <div>
    <p class="rodape__titulo">Contactos</p>
    <ul class="rodape__contactos">
      <li>${icone('whatsapp')}<a href="${whatsapp()}" target="_blank" rel="noopener">WhatsApp</a></li>
      <li>${icone('email')}${porDefinir(marca.email) ? `<a href="mailto:${esc(marca.email)}">${esc(marca.email)}</a>` : '<span class="por-indicar">E-mail (por indicar)</span>'}</li>
      <li>${icone('telefone')}<span>${telefoneHtml()}</span></li>
      <li>${icone('morada')}<span>${porDefinir(marca.morada) ? `${esc(marca.morada)}, ${esc(marca.codigoPostal)} ${esc(marca.localidade)}` : '<span class="por-indicar">Morada (por indicar)</span>'}</span></li>
    </ul>
  </div>
</div>
<div class="contentor rodape__legal">
  <p>© ${ano} ${esc(marca.nome)} · ${ou(marca.firma, 'Firma (por indicar)')} · NIF ${ou(marca.nif)}</p>
  <ul>
    <li><a href="${u('termos/')}">Termos e informação legal</a></li>
    <li><a href="${u('privacidade/')}">Privacidade</a></li>
    <li>${legal('livro', livroReclamacoes({ classe: 'rodape__livro' }))}</li>
    <li><button type="button" class="botao-movimento" data-movimento aria-pressed="false">${icone('pausa')}<span>Pausar movimento</span></button></li>
  </ul>
</div>
</footer>`;
}
