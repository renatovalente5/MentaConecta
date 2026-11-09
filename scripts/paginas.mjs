// AS PÁGINAS. Cada função devolve o HTML de uma página inteira (via `pagina()`).
import { pagina, titulo, esc, u, abs, marca, familias, produtos, kits, cores, produtosDe, familia, desdeFamilia, whatsapp, telefoneHtml, porDefinir, ou, ler, legal, logotipo, ogDaFamilia } from './site.mjs';
import { icone, iconeFamilia } from './icones.mjs';
import { instancia, AREAS } from '../assets/js/desenhos.js';
import { euros, comIva, desde, unitario, total, minimo, GRUPOS_COR, textoSobre } from '../assets/js/preco.js';
import { ralHtml, livroReclamacoes } from '../legal-comum/index.mjs';
import { textoDoHorario } from './regras.mjs';

const IVA = marca.iva ?? 23;
const comI = (c) => comIva(c, IVA);
const duvidasGerais = ler('dados/duvidas.json');

/* O preço com e sem IVA, ao mesmo tamanho (DL 138/90: o site é público, o preço
   com IVA não pode ficar mais pequeno nem mais apagado). Isento (IVA 0): um só. */
export function precoPar(centimos, { sufixo = '', classe = '' } = {}) {
  if (!IVA) return `<span class="preco-par ${classe}"><b class="preco-num">${euros(centimos)}${sufixo}</b> <small>isento de IVA</small></span>`;
  return `<span class="preco-par ${classe}"><span><b class="preco-num">${euros(centimos)}${sufixo}</b> <small>+ IVA</small></span><span><b class="preco-num">${euros(comI(centimos))}${sufixo}</b> <small>com IVA</small></span></span>`;
}

// A cor de montra de cada produto: numa grelha toda branca não se vê a cor; cada
// modelo mostra-se na sua cor mais perto de uma sequência de tons da marca.
const ALVOS = ['#209478', '#D81C5C', '#1B1D24', '#FFEC08', '#F48020', '#E43C30', '#9C2060', '#44A088', '#F89C1C'];
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const dist = (a, b) => { const [x, y] = [rgb(a), rgb(b)]; return (x[0] - y[0]) ** 2 + (x[1] - y[1]) ** 2 + (x[2] - y[2]) ** 2; };
const corPrincipal = (p) => {
  const i = produtosDe(p.familia).indexOf(p) + familias.findIndex((f) => f.slug === p.familia) * 2;
  const alvo = ALVOS[i % ALVOS.length];
  return p.coresDet.reduce((m, c) => (dist(c.hex, alvo) < dist(m.hex, alvo) ? c : m), p.coresDet[0]);
};
const rotuloDesenho = (p, c) => `${p.titulo} em ${c.nome.toLowerCase()}`;
const desenhoProduto = (p, c = corPrincipal(p), extra = {}) => {
  const dentro = p.corAlvo === 'dentro';
  return instancia(p.desenho, { cor: dentro ? '#FFFFFF' : c.hex, corDentro: dentro ? c.hex : '', rotulo: extra.rotulo ?? '', classe: extra.classe || '', alvo: p.corAlvo });
};

function migalhas(itens) {
  const html = `<nav class="migalhas" aria-label="Está aqui"><ol>${itens.map(([n, c], i) => (i < itens.length - 1 ? `<li><a href="${u(c)}">${esc(n)}</a></li>` : `<li><span aria-current="page">${esc(n)}</span></li>`)).join('')}</ol></nav>`;
  const ld = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: itens.map(([n, c], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: abs(c) })) };
  return { html, ld };
}

function duvidas(lista, { id = 'duvidas', tituloAntes = 'O que costumam', destaque = 'perguntar.' } = {}) {
  return `<section class="seccao seccao--duvidas" id="${id}" aria-labelledby="${id}-t">
<div class="contentor contentor--estreito">
  <header class="seccao__topo">${titulo({ antes: tituloAntes, destaque, id: `${id}-t` })}</header>
  <div class="duvidas" data-duvidas>
    ${lista.map((d, i) => `<details class="duvida" name="${id}"${i === 0 ? '' : ''}><summary><span class="duvida__ponto" aria-hidden="true"></span><span>${esc(d.p)}</span>${icone('mais', { classe: 'duvida__mais' })}</summary><div class="duvida__r"><p>${esc(d.r)}</p></div></details>`).join('')}
  </div>
</div>
</section>`;
}
const faqLd = (lista) => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: lista.map((d) => ({ '@type': 'Question', name: d.p, acceptedAnswer: { '@type': 'Answer', text: d.r } })) });

function fecho() {
  return `<section class="seccao seccao--fecho">
<div class="contentor">
  <div class="fecho escuro">
    <div class="fecho__facetas" aria-hidden="true"></div>
    <div class="fecho__texto">
      ${titulo({ antes: 'Comece pela', destaque: 'maquete.' })}
      <p class="lead">Envie-nos o logótipo e diga-nos o que precisa. A maquete é grátis e sem compromisso.</p>
      <div class="accoes">
        <a class="botao botao--principal" href="${whatsapp(marca.mensagens.maquete)}" target="_blank" rel="noopener">Pedir maquete grátis ${icone('seta', { classe: 'seta' })}</a>
        <a class="botao botao--claro" href="${u('produtos/')}">Ver produtos</a>
      </div>
    </div>
  </div>
</div>
</section>`;
}

/* ——— Fichas de amostra das famílias ——— */
function amostraFamilia(f, i = 0) {
  const ps = produtosDe(f.slug);
  const d = f.desenhos[0];
  return `<li class="amostra" style="--i:${i};--cor:${f.coresCapa[0]};--tinta-amostra:${textoSobre(f.coresCapa[0])}">
  <a class="amostra__ligacao" href="${u(`produtos/${f.slug}/`)}">
    <span class="amostra__cor">${instancia(d, { cor: f.coresCapa[1], classe: 'amostra__desenho' })}<span class="amostra__nome-cor">${esc(f.nome)}</span></span>
    <span class="amostra__corpo">
      <b class="amostra__titulo">${iconeFamilia(f.icone)}${esc(f.nome)}</b>
      <span class="amostra__frase">${esc(f.frase)}</span>
      <span class="amostra__preco">desde <b class="preco-num">${euros(desdeFamilia(f.slug))}</b> + IVA/un.</span>
      <span class="amostra__n">${ps.length} modelos ${icone('seta', { classe: 'seta' })}</span>
    </span>
  </a>
</li>`;
}
/* ——— Cartão de produto (grelha da família, «combina com») ——— */
function grupos(p) { return [...new Set(p.coresDet.map((c) => c.grupo))]; }
function cartaoProduto(p, i = 0) {
  const c = corPrincipal(p);
  // Para cada grupo de cor, o tom do produto mais perto da amostra do grupo (no
  // filtro «Azuis» vê-se o azul royal, não o marinho que vem primeiro na lista).
  const porGrupo = {};
  for (const x of p.coresDet) {
    const amostra = GRUPOS_COR.find((g) => g.chave === x.grupo)?.amostra || x.hex;
    if (!porGrupo[x.grupo] || dist(x.hex, amostra) < dist(porGrupo[x.grupo].hex, amostra)) porGrupo[x.grupo] = x;
  }
  const vars = Object.entries(porGrupo).map(([g, x]) => `--cor-${g}:${x.hex}`).join(';');
  const porGrupoAttr = Object.entries(porGrupo).map(([g, x]) => ` data-g-${g}="${x.chave}"`).join('');
  const dentro = p.corAlvo === 'dentro';
  const d = desde(p);
  const atributos = Object.entries(p.atributos || {});
  const tinta = p.tinta ? `<span class="chip chip--tinta chip--${p.tinta}">${icone('caneta')}Tinta ${esc(p.tinta)}</span>` : '';
  const areas = p.areas ? Object.entries(p.areas).slice(0, 2).map(([n, v]) => `<span class="chip">${esc(n)} ${esc(v.replace(/^até /, ''))}</span>`).join('') : '';
  return `<li class="cartao" style="--i:${i};--cor-base:${c.hex};${vars}" data-grupos="${grupos(p).join(' ')}" data-preco="${d}" data-ordem="${p.ordem}" data-tipo="${esc(p.grupoTipo || '')}" data-tinta="${esc(p.tinta || '')}" data-hex="${c.hex}" data-chave="${c.chave}"${porGrupoAttr}${dentro ? ' data-alvo="dentro"' : ''}>
  <a class="cartao__ligacao" href="${u(`produtos/${p.familia}/${p.slug}/`)}">
    <span class="cartao__desenho">${instancia(p.desenho, { cor: null, classe: dentro ? 'desenho--dentro' : '' })}</span>
    <span class="cartao__corpo">
      <span class="cartao__tipo">${esc(p.tipo)}</span>
      <span class="cartao__nome">${esc(p.nome)}</span>
      <span class="cartao__frase">${esc(p.frase)}</span>
      ${tinta || areas ? `<span class="cartao__chips">${tinta}${areas}</span>` : ''}
      <span class="cartao__cores"><span class="pontos" aria-hidden="true">${p.coresDet.slice(0, 6).map((x) => `<i style="--p:${x.hex}" data-hex="${x.hex}" data-chave="${x.chave}"></i>`).join('')}</span>${p.coresDet.length} ${p.coresDet.length === 1 ? 'cor' : 'cores'}</span>
      <span class="cartao__preco">desde ${precoPar(d, { sufixo: '' })}<small class="cartao__q">por unidade, em ${p.quantidades.at(-1).q} ${esc(p.unidade || 'un.')}</small></span>
    </span>
  </a>
</li>`;
}

function cartaoKit(k, { ligacao = true } = {}) {
  const pecas = k.pecas.map((pc) => ({ ...pc, p: produtos.find((x) => x.slug === pc.produto) }));
  const c = pecas.map((pc) => ({ ...pc, c: cores[pc.cor] }));
  const preco = Math.round(k.preco * 100);
  return `<article class="kit${k.destaque ? ' kit--destaque' : ''}" id="kit-${k.slug}">
  <div class="kit__pecas" aria-hidden="true">${c.map((pc, i) => `<span class="kit__peca" style="--i:${i}">${instancia(pc.p.desenho, { cor: pc.p.corAlvo === 'dentro' ? '#FFFFFF' : pc.c.hex, corDentro: pc.p.corAlvo === 'dentro' ? pc.c.hex : '' })}</span>`).join('')}</div>
  <div class="kit__corpo">
    <h3 class="kit__nome">${esc(k.nome)}</h3>
    <p class="kit__frase">${esc(k.frase)}</p>
    <ul class="kit__lista">${c.map((pc) => `<li><b>${pc.quantidade}×</b> ${esc(pc.p.titulo)}</li>`).join('')}</ul>
    <p class="kit__preco">${precoPar(preco)}<small>por pack · mínimo ${k.minimo} packs</small></p>
    ${ligacao ? `<a class="botao botao--claro botao--pequeno" href="${u(`packs/#kit-${k.slug}`)}">Montar este pack ${icone('seta', { classe: 'seta' })}</a>` : ''}
  </div>
</article>`;
}

/* ———————————————————————————————— INÍCIO ———————————————————————————————— */
export function inicio() {
  const palco = [
    ['tshirt', '#FFEC08', 'palco__peca--tshirt'], ['polo', '#1B1D24', 'palco__peca--polo'], ['garrafa-termica', '#D81C5C', 'palco__peca--garrafa'],
    ['bone', '#FFFFFF', 'palco__peca--bone'], ['caneta-touch', '#1B1D24', 'palco__peca--caneta'],
  ];
  const ciclos = { tshirt: ['#FFEC08', '#FFFFFF', '#209478', '#FFEC08', '#FFFFFF'], polo: ['#1B1D24', '#FFEC08', '#FFFFFF', '#209478', '#D81C5C'], 'garrafa-termica': ['#D81C5C', '#1B1D24', '#209478', '#F4F4F2', '#F48020'], bone: ['#FFFFFF', '#1B1D24', '#D81C5C', '#FFEC08', '#209478'], 'caneta-touch': ['#1B1D24', '#D81C5C', '#209478', '#F48020', '#FFFFFF'] };
  const corpo = `
<section class="heroi">
  <div class="heroi__fundo" aria-hidden="true"></div>
  <div class="contentor heroi__grelha">
    <div class="heroi__texto">
      <p class="etiqueta">${esc(marca.servicos)}</p>
      <h1 class="titulo titulo--heroi"><span class="so-leitor">Fardas e brindes com a sua marca.</span><span aria-hidden="true">${titulo({ antes: 'Fardas e brindes', destaque: 'com a sua marca.', nivel: 1 }).replace(/^<h1 class="titulo">|<\/h1>$/g, '')}</span></h1>
      <p class="lead heroi__lead">Escolha o artigo, a cor e a quantidade, veja o preço na hora e envie o pedido pelo WhatsApp.</p>
      <div class="accoes">
        <a class="botao botao--principal vivo" href="${u('produtos/')}">Ver produtos ${icone('seta', { classe: 'seta' })}</a>
        <a class="botao botao--whatsapp" href="${whatsapp()}" target="_blank" rel="noopener">${icone('whatsapp')} WhatsApp</a>
      </div>
      <p class="atendimento" data-atendimento="${esc(JSON.stringify(marca.horario))}" hidden><i aria-hidden="true"></i><span></span></p>
    </div>
    <div class="palco" data-palco>
      <div class="palco__fundo" aria-hidden="true"></div>
      <div class="palco__facetas" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      ${palco.map(([d, c, cl], i) => `<div class="palco__peca ${cl}" style="--i:${i}" data-ciclo="${ciclos[d].join(',')}">${instancia(d, { cor: c })}</div>`).join('')}
      <div class="palco__accoes">
        <button class="botao botao--branco botao--pequeno" type="button" data-logo-carregar>${icone('carregar')} Experimentar com o meu logótipo</button>
        <button class="botao-redondo palco__pausa" type="button" data-palco-pausa aria-pressed="false" aria-label="Pausar as cores">${icone('pausa', { classe: 'i-pausa' })}${icone('tocar', { classe: 'i-tocar' })}</button>
      </div>
    </div>
  </div>
</section>

<section class="seccao" id="produtos" aria-labelledby="produtos-t">
  <div class="contentor">
    <header class="seccao__topo">
      <p class="etiqueta">Produtos</p>
      ${titulo({ antes: 'Tudo o que leva', destaque: 'a sua marca.', id: 'produtos-t' })}
      <p class="lead">Escolha uma família para ver os modelos, as cores e os preços.</p>
    </header>
    <ul class="amostras" role="list">${familias.map(amostraFamilia).join('')}</ul>
  </div>
</section>

<section class="seccao seccao--kits" aria-labelledby="packs-t">
  <div class="contentor">
    <header class="seccao__topo seccao__topo--lado">
      <div>
        <p class="etiqueta">Packs</p>
        ${titulo({ antes: 'Um pack por pessoa,', destaque: 'pronto a vestir.', id: 'packs-t' })}
      </div>
      <a class="ligacao" href="${u('packs/')}">Ver todos os packs</a>
    </header>
    <div class="kits">${kits.map((k) => cartaoKit(k)).join('')}</div>
  </div>
</section>

<section class="seccao seccao--passos" aria-labelledby="passos-t">
  <div class="contentor">
    <header class="seccao__topo">
      <p class="etiqueta">Como funciona</p>
      ${titulo({ antes: 'Três passos,', destaque: 'sem surpresas.', id: 'passos-t' })}
    </header>
    <ol class="passos" data-passos>
      <li class="passo"><span class="passo__n">1</span><span class="passo__icone">${iconeFamilia('orcamento')}</span><h3>Escolha</h3><p>Junte ao orçamento os produtos, as cores e as quantidades.</p></li>
      <li class="passo"><span class="passo__n">2</span><span class="passo__icone">${iconeFamilia('maquete')}</span><h3>Aprove a maquete</h3><p>Enviamos-lhe a maquete com o seu logótipo. Só produzimos depois do seu sim.</p></li>
      <li class="passo"><span class="passo__n">3</span><span class="passo__icone">${iconeFamilia('camiao')}</span><h3>Receba</h3><p>Pronto em ${esc(marca.entrega)}. ${esc(marca.portes)}.</p></li>
    </ol>
  </div>
</section>

${duvidas(duvidasGerais)}
${fecho()}`;
  const ld = [{
    '@context': 'https://schema.org', '@type': 'Organization', name: marca.nome, url: abs(''), logo: abs('assets/logo/menta-m.png'), slogan: marca.assinatura,
    ...(porDefinir(marca.email) ? { email: marca.email } : {}), ...(porDefinir(marca.telefone) ? { telephone: marca.telefone } : {}),
  }, faqLd(duvidasGerais)];
  const desenhos = [...palco.map((p) => p[0]), ...familias.map((f) => f.desenhos[0]), ...kits.flatMap((k) => k.pecas.map((pc) => produtos.find((p) => p.slug === pc.produto).desenho))];
  return pagina({ caminho: '', titulo: '', descricao: marca.descricao, corpo, classe: 'p-inicio', jsonld: ld, desenhos, scripts: ['inicio.js'] });
}

/* ———————————————————————————————— PRODUTOS (todas as famílias) ———————————————————————————————— */
export function produtosIndice() {
  const grupos = [...new Set(familias.map((f) => f.grupo))];
  const m = migalhas([['Início', ''], ['Produtos', 'produtos/']]);
  const corpo = `
<section class="pagina-topo">
  <div class="contentor">
    ${m.html}
    <p class="etiqueta">Produtos</p>
    ${titulo({ antes: 'Tudo o que leva', destaque: 'a sua marca.', nivel: 1 })}
    <p class="lead">${familias.length} famílias, ${produtos.length} modelos. Os preços já incluem a personalização indicada e os portes no continente.</p>
  </div>
</section>
${grupos.map((g) => `<section class="seccao seccao--grupo" aria-labelledby="g-${esc(g)}">
  <div class="contentor">
    <h2 class="grupo__titulo" id="g-${esc(g)}">${esc(g)}</h2>
    <ul class="amostras" role="list">${familias.filter((f) => f.grupo === g).map(amostraFamilia).join('')}</ul>
  </div>
</section>`).join('')}
${fecho()}`;
  return pagina({ caminho: 'produtos/', titulo: 'Produtos', descricao: `${familias.map((f) => f.nome).join(', ').replace(/, ([^,]+)$/, ' e $1')} com o logótipo da sua empresa.`, corpo, jsonld: [m.ld], desenhos: familias.map((f) => f.desenhos[0]) });
}

/* ———————————————————————————————— FAMÍLIA ———————————————————————————————— */
export function paginaFamilia(f) {
  const ps = produtosDe(f.slug);
  const m = migalhas([['Início', ''], ['Produtos', 'produtos/'], [f.nome, `produtos/${f.slug}/`]]);
  const gruposUsados = GRUPOS_COR.filter((g) => ps.some((p) => p.coresDet.some((c) => c.grupo === g.chave)));
  const conta = (g) => ps.filter((p) => p.coresDet.some((c) => c.grupo === g)).length;
  const tipos = [...new Set(ps.map((p) => p.grupoTipo).filter(Boolean))];
  const tintas = [...new Set(ps.map((p) => p.tinta).filter(Boolean))];
  const filtroCor = f.filtros?.cor !== false && gruposUsados.length >= 2;
  const d = desdeFamilia(f.slug);
  const corpo = `
<section class="familia-topo" style="--cor:${f.coresCapa[0]}">
  <div class="contentor familia-topo__grelha">
    <div>
      ${m.html}
      <p class="etiqueta">${esc(f.nome)}</p>
      ${titulo({ antes: f.h1.antes, destaque: f.h1.destaque, nivel: 1 })}
      <p class="lead">${esc(f.frase)}</p>
      <p class="familia-topo__preco">desde ${precoPar(d)} <small>por unidade</small></p>
      <ul class="incluidos">${f.vantagens.slice(0, 3).map((v) => `<li>${icone('visto')}${esc(v)}</li>`).join('')}</ul>
    </div>
    <div class="familia-topo__desenhos" aria-hidden="true">
      ${f.desenhos.map((dd, i) => `<span class="familia-topo__peca" style="--i:${i}">${instancia(dd, { cor: ['#FFFFFF', '#209478', '#1B1D24'][i] })}</span>`).join('')}
    </div>
  </div>
</section>

<section class="catalogo" aria-labelledby="catalogo-t" data-catalogo>
  <div class="contentor">
    <h2 class="so-leitor" id="catalogo-t">Modelos</h2>
    <div class="filtros" data-filtros>
      ${filtroCor ? `<fieldset class="filtros__cores">
        <legend class="so-leitor">Cor</legend>
        <label class="filtro-cor"><input type="radio" name="cor" value="" checked><span class="filtro-cor__amostra filtro-cor__amostra--todas"></span><span>Todas</span><em>${ps.length}</em></label>
        ${gruposUsados.map((g) => `<label class="filtro-cor"><input type="radio" name="cor" value="${g.chave}"><span class="filtro-cor__amostra" style="--p:${g.amostra}"></span><span>${esc(g.nome)}</span><em>${conta(g.chave)}</em></label>`).join('')}
      </fieldset>` : ''}
      <div class="filtros__resto">
        ${tipos.length >= 2 ? `<label class="seletor"><span>Tipo</span><select name="tipo"><option value="">Todos</option>${tipos.map((t) => `<option>${esc(t)}</option>`).join('')}</select></label>` : ''}
        ${tintas.length >= 2 ? `<label class="seletor"><span>Tinta</span><select name="tinta"><option value="">Azul e preta</option>${tintas.map((t) => `<option value="${t}">${t[0].toUpperCase() + t.slice(1)}</option>`).join('')}</select></label>` : ''}
        <label class="seletor"><span>Ordenar</span><select name="ordem"><option value="">Sugestão</option><option value="preco">Preço mais baixo</option><option value="-preco">Preço mais alto</option></select></label>
        <p class="filtros__conta" data-conta aria-live="polite">${ps.length} modelos</p>
      </div>
    </div>
    <ul class="grelha" role="list" data-grelha>${ps.map(cartaoProduto).join('')}</ul>
    <div class="vazio" data-vazio hidden><p>Nenhum modelo com estes filtros.</p><button class="botao botao--claro botao--pequeno" type="button" data-limpar>Limpar filtros</button></div>
  </div>
</section>

<section class="seccao seccao--outra">
  <div class="contentor">
    <div class="outra">
      <div class="outra__registo" aria-hidden="true">${iconeFamilia(f.icone)}</div>
      <div>
        <h2 class="outra__titulo">Procura outra coisa?</h2>
        <p>Diga-nos o que precisa: outro modelo, outra cor, outra quantidade. Trabalhamos com mais fornecedores.</p>
      </div>
      <a class="botao botao--whatsapp" href="${whatsapp(`Olá! Procuro ${f.nome.toLowerCase()} que não encontrei no site: `)}" target="_blank" rel="noopener">${icone('whatsapp')} Perguntar</a>
    </div>
  </div>
</section>
${f.duvidas?.length ? duvidas(f.duvidas, { id: 'duvidas-familia', tituloAntes: 'Dúvidas sobre', destaque: f.nome.toLowerCase() + '.' }) : ''}`;
  const ld = [m.ld, f.duvidas?.length ? faqLd(f.duvidas) : null,
    marca.demo ? null : { '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: ps.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(`produtos/${f.slug}/${p.slug}/`), name: p.titulo })) }];
  return pagina({ caminho: `produtos/${f.slug}/`, titulo: `${f.h1.antes} ${f.h1.destaque}`, descricao: `${f.frase} Desde ${euros(d)} + IVA por unidade. Maquete grátis e acompanhamento por WhatsApp.`, corpo, classe: 'p-familia', jsonld: ld, desenhos: [...ps.map((p) => p.desenho), ...f.desenhos], scripts: ['familia.js'], og: ogDaFamilia(f.slug) });
}

/* ———————————————————————————————— PRODUTO ———————————————————————————————— */
export function paginaProduto(p) {
  const f = familia(p.familia);
  const ps = produtosDe(f.slug);
  const i = ps.indexOf(p);
  const ant = ps[i - 1], seg = ps[i + 1];
  const m = migalhas([['Início', ''], ['Produtos', 'produtos/'], [f.nome, `produtos/${f.slug}/`], [p.nome, `produtos/${f.slug}/${p.slug}/`]]);
  const c = corPrincipal(p);
  const q0 = minimo(p);
  const t0 = total(p, q0);
  const unidade = p.unidade || 'un.';
  const areaTec = AREAS[p.desenho]?.tecnica || 'cor';
  const dentro = p.corAlvo === 'dentro';
  const combina = produtos.filter((x) => x.familia !== p.familia).filter((x, k, arr) => arr.findIndex((y) => y.familia === x.familia) === k).slice(0, 3);
  const corpo = `
<div class="produto-topo contentor">
  ${m.html}
  <nav class="vizinhos" aria-label="Outros modelos">
    ${ant ? `<a class="vizinho" rel="prev" href="${u(`produtos/${f.slug}/${ant.slug}/`)}" data-vizinho="ant">${icone('chevron-esq')}<span><small>Anterior</small>${esc(ant.nome)}</span></a>` : '<span></span>'}
    ${seg ? `<a class="vizinho vizinho--seg" rel="next" href="${u(`produtos/${f.slug}/${seg.slug}/`)}" data-vizinho="seg"><span><small>Seguinte</small>${esc(seg.nome)}</span>${icone('chevron-dir')}</a>` : ''}
  </nav>
</div>
<section class="produto contentor" data-produto="${p.slug}" data-familia="${f.slug}">
  <div class="produto__visual">
    <div class="produto__palco" style="--cor:var(--cor-vt, ${c.hex})"${dentro ? ' data-alvo="dentro"' : ''} data-palco-produto>
      <div class="produto__fundo" aria-hidden="true"></div>
      ${instancia(p.desenho, { cor: null, rotulo: rotuloDesenho(p, c), classe: dentro ? 'desenho--dentro' : '' })}
      <button class="botao botao--branco botao--pequeno produto__logo" type="button" data-logo-carregar>${icone('carregar')}<span data-logo-texto>Ver com o meu logótipo</span></button>
    </div>
    <p class="nota-desenho">O desenho mostra o modelo e a cor; o tom exacto confirma-se na maquete.</p>
  </div>
  <form class="configurador" data-configurador novalidate>
    <p class="etiqueta">${esc(p.tipo)}</p>
    <h1 class="produto__nome">${esc(p.nome)}${'<svg class="traco traco--nome" viewBox="0 0 300 24" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M4 15 C 58 6, 122 5, 176 10 S 262 18, 288 9" pathLength="1"/></svg>'}</h1>
    <p class="produto__descricao">${esc(p.descricao)}</p>
    ${p.tinta || p.areas ? `<ul class="atributos">${p.tinta ? `<li class="chip chip--tinta chip--${p.tinta}">${icone('caneta')}Tinta ${esc(p.tinta)}</li>` : ''}${p.areas ? Object.entries(p.areas).map(([n, v]) => `<li class="chip">${esc(n)} ${esc(v)}</li>`).join('') : ''}</ul>` : ''}

    <fieldset class="escolha escolha--cor">
      <legend><span>Cor</span> <output class="escolha__valor" data-cor-nome>${esc(c.nome)}</output></legend>
      <div class="cores" data-cores>
        ${p.coresDet.map((x) => `<label class="cor" style="--p:${x.hex}" title="${esc(x.nome)}"><input type="radio" name="cor" value="${x.chave}" data-hex="${x.hex}" data-nome="${esc(x.nome)}"${x.chave === c.chave ? ' checked' : ''}><span class="so-leitor">${esc(x.nome)}</span></label>`).join('')}
      </div>
    </fieldset>

    <fieldset class="escolha escolha--qtd">
      <legend><span>Quantidade</span> <small class="escolha__nota">mínimo ${q0} ${esc(unidade)}</small></legend>
      <div class="escaloes" data-escaloes>
        ${p.quantidades.map((l, k) => { const un = unitario(p, l.q); return `<label class="escalao"><input type="radio" name="q" value="${l.q}"${k === 0 ? ' checked' : ''}><span class="escalao__q"><b>${l.q}</b> ${esc(unidade)}</span><span class="escalao__un">${euros(un)}/un.</span><span class="escalao__total">${euros(un * l.q)}</span></label>`; }).join('')}
        <span class="escaloes__indicador" aria-hidden="true"></span>
      </div>
      <div class="outra-qtd">
        <label class="outra-qtd__rotulo" for="q-outra">Outra quantidade</label>
        <div class="passador" data-passador>
          <button type="button" data-passo="-1" aria-label="Menos">${icone('menos')}</button>
          <input id="q-outra" name="q-outra" type="number" inputmode="numeric" min="1" step="1" placeholder="${q0}">
          <button type="button" data-passo="1" aria-label="Mais">${icone('mais')}</button>
        </div>
        <p class="outra-qtd__nota" data-qtd-nota aria-live="polite"></p>
      </div>
    </fieldset>

    ${(p.opcoes || []).map((g, gi) => `<fieldset class="escolha escolha--opcoes">
      <legend><span>${esc(g.grupo)}</span></legend>
      <div class="opcoes">${g.opcoes.map((o, k) => `<label class="opcao"><input type="radio" name="op${gi}" value="${k}"${k === 0 ? ' checked' : ''} data-tecnica="${o.tecnica || ''}"><span class="opcao__nome">${esc(o.nome)}</span><span class="opcao__mais">${o.acrescimo ? `+ ${euros(Math.round(o.acrescimo * 100))}/un.` : o.fator && o.fator !== 1 ? `+ ${Math.round((o.fator - 1) * 100)} %` : 'incluído'}</span></label>`).join('')}</div>
    </fieldset>`).join('')}

    <div class="ficha-preco" data-ficha style="--cor:${c.hex};--texto-cor:${textoSobre(c.hex)}">
      <div class="ficha-preco__cor"><span data-ficha-nome>${esc(c.nome)}</span><span class="ficha-preco__hex" data-ficha-hex>${c.hex}</span></div>
      <div class="ficha-preco__corpo">
        <p class="ficha-preco__rotulo"><span data-preco-rotulo>${q0} ${esc(unidade)}</span>${marca.demo ? ' · <em>preço de exemplo</em>' : ''}</p>
        <div class="ficha-preco__valores" aria-hidden="true">
          <span><b class="preco-num" data-preco-sem>${euros(t0)}</b><small>+ IVA</small></span>
          <span><b class="preco-num" data-preco-com>${euros(comI(t0))}</b><small>com IVA</small></span>
        </div>
        <p class="so-leitor" data-preco-leitor aria-live="polite" aria-atomic="true"></p>
        <p class="ficha-preco__un" data-preco-un>${euros(unitario(p, q0))} + IVA por unidade · ${euros(comI(unitario(p, q0)))} com IVA</p>
        <ul class="ficha-preco__inclui"><li>${icone('visto')}${esc((p.opcoes?.[0]?.opcoes?.[0]?.nome) || 'Personalização')} incluída</li><li>${icone('visto')}Maquete grátis</li><li>${icone('visto')}${esc(marca.portes.split(';')[0])}</li></ul>
      </div>
    </div>

    <div class="configurador__accoes">
      <button class="botao botao--principal botao--bloco" type="submit" data-juntar>${icone('orcamento')} Juntar ao orçamento</button>
      <a class="ligacao configurador__duvida" href="${whatsapp(marca.mensagens.duvida.replace('{produto}', p.titulo))}" target="_blank" rel="noopener">Dúvidas? Pergunte no WhatsApp</a>
    </div>
    <p class="nota-legal">Preço indicativo para esta configuração. O preço final chega por escrito com a maquete, antes de pagar, e só muda se mudar o logótipo, a técnica ou a quantidade. Peças com o seu logótipo são feitas por medida: depois de aprovar a maquete e o orçamento, não há livre resolução. <a href="${u('termos/#livre-resolucao')}">Saber mais</a></p>
  </form>
</section>

<section class="seccao seccao--specs" aria-labelledby="specs-t">
  <div class="contentor specs">
    <h2 id="specs-t" class="specs__titulo">Especificações</h2>
    <dl class="specs__lista">${Object.entries(p.especificacoes || {}).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}<div><dt>Cores</dt><dd>${p.coresDet.map((x) => esc(x.nome)).join(', ')}</dd></div><div><dt>Prazo</dt><dd>${esc(marca.entrega)}</dd></div></dl>
  </div>
</section>

<section class="seccao seccao--combina" aria-labelledby="combina-t">
  <div class="contentor">
    <header class="seccao__topo seccao__topo--lado"><h2 id="combina-t" class="titulo titulo--pequeno">Combina com</h2><a class="ligacao" href="${u('packs/')}">Ver os packs</a></header>
    <ul class="grelha grelha--3" role="list">${combina.map(cartaoProduto).join('')}</ul>
  </div>
</section>
${f.duvidas?.length ? duvidas(f.duvidas, { id: 'duvidas-produto', tituloAntes: 'Dúvidas sobre', destaque: f.nome.toLowerCase() + '.' }) : ''}

<div class="barra-produto" data-barra aria-hidden="true">
  <span class="barra-produto__preco"><b class="preco-num" data-barra-sem>${euros(t0)}</b><small>+ IVA</small><b class="preco-num" data-barra-com>${euros(comI(t0))}</b><small>com IVA</small></span>
  <button class="botao botao--principal botao--pequeno" type="button" data-barra-juntar tabindex="-1">Juntar ao orçamento</button>
</div>
<script type="application/json" id="dados-produto">${JSON.stringify({ iva: IVA, slug: p.slug, familia: p.familia, nome: p.nome, titulo: p.titulo, tipo: p.tipo, desenho: p.desenho, alvo: p.corAlvo || '', unidade, tecnica: areaTec, quantidades: p.quantidades, opcoes: p.opcoes || [], cores: p.coresDet, ordem: ps.map((x) => ({ slug: x.slug, nome: x.nome })) }).replace(/</g, '\\u003c')}</script>`;
  const ld = [m.ld];
  if (!marca.demo) {
    const precos = p.quantidades.map((l) => comI(unitario(p, l.q)) / 100);
    ld.push({ '@context': 'https://schema.org', '@type': 'Product', name: p.titulo, description: p.descricao, brand: { '@type': 'Brand', name: marca.nome }, image: abs(`assets/${ogDaFamilia(p.familia)}`), url: abs(`produtos/${f.slug}/${p.slug}/`), offers: { '@type': 'AggregateOffer', priceCurrency: 'EUR', lowPrice: Math.min(...precos).toFixed(2), highPrice: Math.max(...precos).toFixed(2), offerCount: p.quantidades.length } });
  }
  return pagina({ caminho: `produtos/${f.slug}/${p.slug}/`, titulo: `${p.titulo} personalizad${f.artigo === 'o' ? 'o' : 'a'}`, descricao: `${p.descricao} Desde ${euros(desde(p))} + IVA por unidade, com ${(p.opcoes?.[0]?.opcoes?.[0]?.nome || 'personalização').toLowerCase()} e maquete grátis.`, corpo, classe: 'p-produto', jsonld: ld, desenhos: [p.desenho, ...combina.map((x) => x.desenho)], scripts: ['produto.js'], og: ogDaFamilia(f.slug) });
}

/* ———————————————————————————————— PACKS ———————————————————————————————— */
export function paginaKits() {
  const m = migalhas([['Início', ''], ['Packs', 'packs/']]);
  const corpo = `
<section class="pagina-topo">
  <div class="contentor">
    ${m.html}
    <p class="etiqueta">Packs</p>
    ${titulo({ antes: 'Um pack por pessoa,', destaque: 'pronto a vestir.', nivel: 1 })}
    <p class="lead">Escolha a cor de cada peça e o número de pessoas. O preço é por pack, com o logótipo em todas as peças.</p>
  </div>
</section>
<section class="seccao seccao--kits-pagina">
  <div class="contentor kits-config" data-kits data-iva="${IVA}">
    ${kits.map((k) => {
      const pecas = k.pecas.map((pc) => ({ ...pc, p: produtos.find((x) => x.slug === pc.produto) }));
      const preco = Math.round(k.preco * 100);
      return `<article class="kit-config${k.destaque ? ' kit-config--destaque' : ''}" id="kit-${k.slug}" data-kit="${k.slug}" data-preco="${preco}" data-minimo="${k.minimo}">
  <div class="kit-config__pecas">
    ${pecas.map((pc, i) => `<div class="kit-peca" data-peca="${i}">
      <div class="kit-peca__desenho" style="--cor:${cores[pc.cor].hex}">${instancia(pc.p.desenho, { cor: pc.p.corAlvo === 'dentro' ? '#FFFFFF' : cores[pc.cor].hex, corDentro: pc.p.corAlvo === 'dentro' ? cores[pc.cor].hex : '', classe: pc.p.corAlvo === 'dentro' ? 'desenho--dentro' : '' })}</div>
      <div class="kit-peca__info">
        <p class="kit-peca__nome"><b>${pc.quantidade}×</b> ${esc(pc.p.titulo)}</p>
        <fieldset class="kit-peca__cores"><legend class="so-leitor">Cor de ${esc(pc.p.titulo)}</legend>
          ${pc.p.coresDet.slice(0, 10).map((x) => `<label class="cor cor--pequena" style="--p:${x.hex}" title="${esc(x.nome)}"><input type="radio" name="${k.slug}-${i}" value="${x.chave}" data-hex="${x.hex}" data-nome="${esc(x.nome)}"${x.chave === pc.cor ? ' checked' : ''}><span class="so-leitor">${esc(x.nome)}</span></label>`).join('')}
        </fieldset>
        <output class="kit-peca__cor" data-peca-cor>${esc(cores[pc.cor].nome)}</output>
      </div>
    </div>`).join('')}
  </div>
  <div class="kit-config__lado">
    <h2 class="kit-config__nome">${esc(k.nome)}</h2>
    <p class="kit-config__frase">${esc(k.frase)}</p>
    <ul class="incluidos">${k.inclui.map((t) => `<li>${icone('visto')}${esc(t)}</li>`).join('')}</ul>
    <div class="kit-config__pessoas">
      <label for="pessoas-${k.slug}">Pessoas</label>
      <div class="passador" data-passador>
        <button type="button" data-passo="-1" aria-label="Menos uma pessoa">${icone('menos')}</button>
        <input id="pessoas-${k.slug}" type="number" inputmode="numeric" min="${k.minimo}" step="1" value="${k.minimo}" data-pessoas>
        <button type="button" data-passo="1" aria-label="Mais uma pessoa">${icone('mais')}</button>
      </div>
      <small>mínimo ${k.minimo}</small>
    </div>
    <p class="kit-config__por">Por pack: ${precoPar(preco)}</p>
    <p class="kit-config__total">Total: <span data-kit-total>${precoPar(preco * k.minimo)}</span>${marca.demo ? ' <em>· preço de exemplo</em>' : ''}</p>
    <button class="botao botao--principal botao--bloco" type="button" data-kit-juntar>${icone('orcamento')} Juntar ao orçamento</button>
  </div>
</article>`;
    }).join('')}
  </div>
</section>
${fecho()}`;
  const desenhos = kits.flatMap((k) => k.pecas.map((pc) => produtos.find((p) => p.slug === pc.produto).desenho));
  return pagina({ caminho: 'packs/', titulo: 'Packs para equipas e eventos', descricao: 'Packs de fardamento e brindes — t-shirts, polos, casacos, bonés, garrafas e canetas — com o logótipo da sua empresa e preço por pessoa.', corpo, classe: 'p-kits', jsonld: [m.ld], desenhos, scripts: ['kits.js'] });
}

/* ———————————————————————————————— ORÇAMENTO ———————————————————————————————— */
export function paginaOrcamento() {
  const corpo = `
<section class="pagina-topo">
  <div class="contentor contentor--estreito">
    <p class="etiqueta">Orçamento</p>
    ${titulo({ antes: 'O seu', destaque: 'orçamento.', nivel: 1 })}
    <p class="lead" data-orcamento-lead>Os produtos que juntou, com as cores e as quantidades. Envie-nos tudo numa só mensagem.</p>
  </div>
</section>
<section class="seccao seccao--orcamento">
  <div class="contentor contentor--estreito" data-orcamento-pagina>
    <p class="orcamento-vazio">A carregar…</p>
  </div>
</section>`;
  return pagina({ caminho: 'orcamento/', titulo: 'O seu orçamento', descricao: 'Os produtos que escolheu, prontos a enviar por WhatsApp ou por e-mail.', corpo, classe: 'p-orcamento', scripts: ['orcamento-pagina.js'] });
}

/* ———————————————————————————————— SOBRE ———————————————————————————————— */
export function paginaSobre() {
  const m = migalhas([['Início', ''], ['Sobre', 'sobre/']]);
  const corpo = `
<section class="pagina-topo pagina-topo--sobre">
  <div class="contentor sobre-topo">
    <div>
      ${m.html}
      <p class="etiqueta">Sobre</p>
      ${titulo({ antes: 'A sua marca,', destaque: 'em boas mãos.', nivel: 1 })}
      <p class="lead">Fazemos fardamentos, gráfica rápida e brindes com a marca de empresas, associações e eventos. ${esc(marca.assinatura)}</p>
    </div>
    <div class="leque" aria-hidden="true">${['#209478', '#FFEC08', '#D81C5C', '#F48020', '#E43C30'].map((c, i) => `<span class="leque__folha" style="--i:${i};--cor:${c}"></span>`).join('')}</div>
  </div>
</section>
<section class="seccao">
  <div class="contentor valores">
    ${[
      ['maquete', 'Maquete antes de tudo', 'Vê o seu logótipo no produto antes de pagar. Mudamos o que for preciso até estar certo.'],
      ['equipa', 'Tudo num só sítio', 'Fardas, impressão e brindes com a mesma marca, num só pedido.'],
      ['pincel', 'Cada técnica no seu sítio', 'Laser no metal, bordado nas fardas, impressão a cores no algodão. Dizemos-lhe o que dura mais.'],
      ['camiao', 'Prazos ditos à partida', `${marca.entrega[0].toUpperCase() + marca.entrega.slice(1)}. ${marca.portes}.`],
    ].map(([ic, t, d]) => `<article class="valor"><span class="valor__icone">${iconeFamilia(ic)}</span><h2>${esc(t)}</h2><p>${esc(d)}</p></article>`).join('')}
  </div>
</section>
${fecho()}`;
  return pagina({ caminho: 'sobre/', titulo: 'Sobre', descricao: `${marca.nome}: fardamentos, gráfica rápida e brindes personalizados para empresas, associações e eventos.`, corpo, jsonld: [m.ld], desenhos: [] });
}

/* ———————————————————————————————— CONTACTOS ———————————————————————————————— */
export function paginaContactos() {
  const m = migalhas([['Início', ''], ['Contactos', 'contactos/']]);
  const email = porDefinir(marca.email);
  const morada = porDefinir(marca.morada);
  const corpo = `
<section class="pagina-topo">
  <div class="contentor">
    ${m.html}
    <p class="etiqueta">Contactos</p>
    ${titulo({ antes: 'Fale', destaque: 'connosco.', nivel: 1 })}
    <p class="lead">Respondemos com a proposta e a maquete. Se tem uma data, diga-a logo na primeira mensagem.</p>
  </div>
</section>
<section class="seccao seccao--contactos">
  <div class="contentor contactos">
    <a class="contacto contacto--whatsapp" href="${whatsapp()}" target="_blank" rel="noopener">
      <span class="contacto__icone">${icone('whatsapp')}</span><h2>WhatsApp</h2><p>A forma mais rápida.</p>
      <p class="atendimento" data-atendimento="${esc(JSON.stringify(marca.horario))}" hidden><i aria-hidden="true"></i><span></span></p>
    </a>
    ${email ? `<a class="contacto" href="mailto:${esc(email)}"><span class="contacto__icone">${icone('email')}</span><h2>E-mail</h2><p>${esc(email)}</p></a>` : `<div class="contacto"><span class="contacto__icone">${icone('email')}</span><h2>E-mail</h2><p class="por-indicar">(por indicar)</p></div>`}
    <div class="contacto"><span class="contacto__icone">${icone('telefone')}</span><h2>Telefone</h2><p>${telefoneHtml()}</p></div>
  </div>
  <div class="contentor contactos-info">
    <div class="horario">
      <h2>${icone('relogio')}Horário</h2>
      <dl>${textoDoHorario(marca.horario).map((h) => `<div><dt>${esc(h.dias)}</dt><dd>${esc(h.horas)}</dd></div>`).join('')}</dl>
      <p>${esc(marca.atendimento)}</p>
    </div>
    <div class="horario">
      <h2>${icone('morada')}Morada</h2>
      ${morada ? `<p>${esc(marca.morada)}<br>${esc(marca.codigoPostal)} ${esc(marca.localidade)}</p><a class="ligacao" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${marca.morada}, ${marca.codigoPostal} ${marca.localidade}`)}" target="_blank" rel="noopener">Abrir no mapa</a>` : '<p class="por-indicar">(por indicar)</p>'}
    </div>
  </div>
</section>`;
  return pagina({ caminho: 'contactos/', titulo: 'Contactos', descricao: `Fale com a ${marca.nome} por WhatsApp, e-mail ou telefone. Orçamentos com maquete grátis.`, corpo, jsonld: [m.ld], desenhos: [] });
}

/* ———————————————————————————————— LIGAÇÕES (bio do Instagram) ———————————————————————————————— */
export function paginaLigacoes() {
  const corpo = `
<section class="ligacoes">
  <div class="ligacoes__caixa">
    <a href="${u('')}" class="ligacoes__logo" aria-label="${esc(marca.nome)} — início">${logotipo()}</a>
    <h1 class="ligacoes__frase">${esc(marca.assinatura)}</h1>
    <ul class="ligacoes__lista">
      ${familias.map((f) => `<li><a href="${u(`produtos/${f.slug}/`)}" style="--cor:${f.coresCapa[0]}">${iconeFamilia(f.icone)}<span>${esc(f.nome)}</span>${icone('seta')}</a></li>`).join('')}
      <li><a href="${u('packs/')}" style="--cor:#FFEC08">${iconeFamilia('equipa')}<span>Packs</span>${icone('seta')}</a></li>
    </ul>
    <a class="botao botao--whatsapp botao--bloco" href="${whatsapp()}" target="_blank" rel="noopener" data-origem>${icone('whatsapp')} Falar no WhatsApp</a>
  </div>
</section>`;
  return pagina({ caminho: 'ligacoes/', titulo: 'Ligações', descricao: `Os produtos da ${marca.nome} e o WhatsApp, numa página.`, corpo, classe: 'p-ligacoes', desenhos: [] });
}

/* ———————————————————————————————— LEGAIS ———————————————————————————————— */
function identificacao() {
  return `<dl class="identificacao">
  <div><dt>Firma</dt><dd>${ou(marca.firma)}</dd></div>
  <div><dt>NIF</dt><dd>${ou(marca.nif)}</dd></div>
  <div><dt>Morada</dt><dd>${porDefinir(marca.morada) ? `${esc(marca.morada)}, ${esc(marca.codigoPostal)} ${esc(marca.localidade)}` : '<span class="por-indicar">(por indicar)</span>'}</dd></div>
  <div><dt>E-mail</dt><dd>${porDefinir(marca.email) ? esc(marca.email) : '<span class="por-indicar">(por indicar)</span>'}</dd></div>
  <div><dt>Telefone</dt><dd>${telefoneHtml()}</dd></div>
</dl>`;
}

export function paginaTermos() {
  const corpo = `
<section class="pagina-topo"><div class="contentor contentor--estreito"><p class="etiqueta">Informação legal</p><h1 class="titulo">Termos e informação legal</h1><p class="lead">Quem somos, como funcionam os orçamentos e o que acontece depois de aprovar.</p></div></section>
<section class="seccao seccao--texto"><div class="contentor contentor--estreito texto-legal">
<h2>Quem somos</h2>
<p>${esc(marca.nome)} é uma marca de ${ou(marca.firma, '(firma por indicar)')}.</p>
${identificacao()}
<h2>Os preços</h2>
<p>Os preços do site são indicativos para a configuração escolhida e mostram-se sem IVA e com IVA (taxa de ${IVA} %). Incluem a personalização indicada em cada produto e os portes para Portugal continental; os envios para as ilhas vão no orçamento.</p>
<p>O preço final chega por escrito com a maquete, antes de pagar, e só muda se mudar o logótipo, a técnica ou a quantidade.</p>
${marca.demo ? '<p><strong>Esta é uma pré-visualização do site: os produtos, os preços e os prazos são de exemplo.</strong></p>' : ''}
<h2>Como se faz um pedido</h2>
<ol>
  <li>Escolhe os produtos no site e envia-nos o pedido por WhatsApp ou por e-mail. Isto é um pedido de orçamento e não o obriga a nada.</li>
  <li>Respondemos com o orçamento e a maquete: o total com IVA e portes, o prazo e as condições.</li>
  <li>A encomenda fica feita quando aceita o orçamento e a maquete, por escrito. Enviamos-lhe a confirmação por e-mail, com estas condições.</li>
</ol>
<h2>Prazos e entrega</h2>
<p>${esc(marca.entrega[0].toUpperCase() + marca.entrega.slice(1))}, salvo indicação diferente no orçamento.</p>
<h2 id="livre-resolucao">Livre resolução</h2>
<p>Peças com o seu logótipo ou texto são feitas por medida: depois de aprovar a maquete e o orçamento, não há direito de livre resolução (Decreto-Lei n.º 24/2014, artigo 17.º, n.º 1, alínea c)). Em produtos sem personalização, tem 14 dias para resolver o contrato sem indicar o motivo. A garantia legal de conformidade de 3 anos mantém-se sempre.</p>
<h2>O seu logótipo</h2>
<p>Quem encomenda garante que pode usar o logótipo e os textos que nos envia. Recusamos marcas de terceiros sem autorização.</p>
<h2>Reclamações e litígios</h2>
<p>Pode reclamar connosco pelos contactos acima ou no ${legal('livro', livroReclamacoes({ classe: 'ligacao-livro' }))}.</p>
${legal('ral', ralHtml({ ambito: 'nacional' }))}
</div></section>`;
  return pagina({ caminho: 'termos/', titulo: 'Termos e informação legal', descricao: `Identificação da ${marca.nome}, preços, pedidos, prazos, livre resolução e resolução de litígios.`, corpo, desenhos: [] });
}

export function paginaPrivacidade() {
  const corpo = `
<section class="pagina-topo"><div class="contentor contentor--estreito"><p class="etiqueta">Privacidade</p><h1 class="titulo">Política de privacidade</h1><p class="lead">Este site não usa cookies nem estatísticas, e não recolhe dados enquanto o visita.</p></div></section>
<section class="seccao seccao--texto"><div class="contentor contentor--estreito texto-legal">
<h2>Quem é responsável</h2>
<p>${ou(marca.firma, '(firma por indicar)')}, NIF ${ou(marca.nif)}. Contacto: ${porDefinir(marca.email) ? esc(marca.email) : '(e-mail por indicar)'}.</p>
<h2>O que fica no seu aparelho</h2>
<p>O site não tem cookies. Guarda no seu próprio aparelho, e só quando o pede:</p>
<ul>
  <li><strong>O orçamento</strong> — os produtos que junta, as cores e as quantidades (armazenamento local do browser). Esvazia-se no próprio orçamento.</li>
  <li><strong>O logótipo</strong> que carrega para o ver nos produtos (base de dados do browser). Não sai do aparelho: não o recebemos nem o guardamos. Remove-se em «O seu logótipo».</li>
  <li><strong>«Pausar movimento»</strong>, se o escolher.</li>
</ul>
<p>Isto é necessário para as funções que pediu, por isso não precisa de consentimento (Lei n.º 41/2004, artigo 5.º, n.º 2).</p>
<h2>Quando nos contacta</h2>
<p>Os botões do WhatsApp abrem a aplicação com a mensagem já escrita; o envio é feito por si, e o WhatsApp (Meta) trata a mensagem segundo as regras dele. Por e-mail, a mensagem passa pelo seu fornecedor de correio e pelo nosso.</p>
<p>Usamos o que nos envia (nome, contactos, empresa, logótipo, o pedido) para responder, preparar o orçamento e a maquete e, se encomendar, cumprir a encomenda e as obrigações fiscais (RGPD, artigo 6.º, n.º 1, alíneas b) e c)). Não enviamos publicidade sem o seu consentimento.</p>
<h2>Durante quanto tempo</h2>
<p>Os pedidos que não chegam a encomenda apagam-se ao fim de 12 meses. Os dados das encomendas guardam-se pelo prazo que a lei fiscal exige (10 anos).</p>
<h2>Onde está alojado o site</h2>
<p>No GitHub Pages (GitHub, Inc., Estados Unidos), que regista o endereço IP de quem visita por razões de segurança. A transferência está coberta pelo Quadro de Privacidade de Dados UE-EUA.</p>
<h2>Os seus direitos</h2>
<p>Pode pedir acesso, rectificação, apagamento, limitação, portabilidade ou opor-se ao tratamento, pelos contactos acima. Pode também reclamar à Comissão Nacional de Protecção de Dados (www.cnpd.pt).</p>
</div></section>`;
  return pagina({ caminho: 'privacidade/', titulo: 'Política de privacidade', descricao: `Como a ${marca.nome} trata os seus dados: sem cookies, sem estatísticas; o orçamento e o logótipo ficam no seu aparelho.`, corpo, desenhos: [] });
}

export function pagina404() {
  const corpo = `
<section class="pagina-topo pagina-topo--404">
  <div class="contentor contentor--estreito">
    <p class="etiqueta">Erro 404</p>
    ${titulo({ antes: 'Esta página', destaque: 'perdeu a ligação.', nivel: 1 })}
    <p class="lead">O endereço não existe ou mudou. Estes são os produtos:</p>
    <ul class="lista-404">${familias.map((f) => `<li><a href="${u(`produtos/${f.slug}/`)}">${iconeFamilia(f.icone)}${esc(f.nome)}</a></li>`).join('')}</ul>
    <a class="botao botao--principal" href="${u('')}">Voltar ao início</a>
  </div>
</section>`;
  return pagina({ caminho: '404.html', titulo: 'Página não encontrada', descricao: 'A página não existe.', corpo, desenhos: [] });
}
