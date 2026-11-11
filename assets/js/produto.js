// O CONFIGURADOR da página do produto: cor, quantidade (escalões ou outra),
// personalização, o preço com e sem IVA a contar de valor a valor, e «Juntar ao
// orçamento». As contas são as do preco.js (as mesmas do gerador).
import { euros, comIva, total, unitario, escalao, seguinte, minimo, maximo, tecnica, IVA_NORMAL, textoSobre, corParaAcento } from './preco.js';
import { juntar, abrirGaveta, aviso } from './orcamento.js';

const P = JSON.parse(document.getElementById('dados-produto').textContent);
const form = document.querySelector('[data-configurador]');
const palco = document.querySelector('[data-palco-produto]');
const svg = palco.querySelector('.desenho');
const html = document.documentElement;
const reduz = matchMedia('(prefers-reduced-motion: reduce)');
const IVA = P.iva ?? IVA_NORMAL;
const unidade = P.unidade;

const $ = (s) => form.querySelector(s);
const estado = { cor: $('input[name="cor"]:checked').value, q: minimo(P), escolhas: P.opcoes.map(() => 0), livre: false };

/* ——— Cor ——— */
function porCor(chave, { anunciar = true } = {}) {
  const c = P.cores.find((x) => x.chave === chave) || P.cores[0];
  estado.cor = c.chave;
  const r = form.querySelector(`input[name="cor"][value="${c.chave}"]`); if (r) r.checked = true;
  html.style.removeProperty('--cor-vt');
  palco.style.setProperty('--cor', c.hex);
  const acento = corParaAcento(c.hex); if (acento) html.style.setProperty('--acento', acento); else html.style.removeProperty('--acento');
  $('[data-cor-nome]').textContent = c.nome;
  const ficha = $('[data-ficha]');
  ficha.style.setProperty('--cor', c.hex); ficha.style.setProperty('--texto-cor', textoSobre(c.hex));
  ficha.querySelector('[data-ficha-nome]').textContent = c.nome;
  ficha.querySelector('[data-ficha-hex]').textContent = c.hex;
  svg.setAttribute("aria-label", `${P.titulo} em ${c.nome.toLowerCase()}`);
  const u = new URL(location.href); u.searchParams.set('cor', c.chave); history.replaceState(history.state, '', u);
  if (anunciar) actualizarVizinhos();
}
form.addEventListener('change', (e) => { if (e.target.name === 'cor') { porCor(e.target.value); ver('simular'); } });

/* ——— As fotografias e a «Simular» (só num artigo com fotografias) ———
   A fotografia não muda de cor: escolher uma cor mostra a «Simular» (o logótipo carrega-se lá). */
const vistas = document.querySelector('[data-vistas]');
function ver(qual) {
  if (!vistas || !vistas.querySelector(`[data-vista="${qual}"]`)) return;
  vistas.querySelectorAll('[data-vista]').forEach((v) => { v.hidden = v.dataset.vista !== qual; });
  vistas.querySelectorAll('[data-ver]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ver === qual)));
}
vistas?.addEventListener('click', (e) => { const b = e.target.closest('[data-ver]'); if (b) ver(b.dataset.ver); });

/* ——— Quantidade ——— */
const escaloes = $('[data-escaloes]');
const indicador = escaloes.querySelector('.escaloes__indicador');
const outra = $('#q-outra');
const nota = $('[data-qtd-nota]');
function moverIndicador() {
  const l = escaloes.querySelector('input[name="q"]:checked')?.closest('.escalao');
  escaloes.classList.toggle('sem-escalao', !l);
  if (!l) return;
  indicador.style.setProperty('--y', `${l.offsetTop}px`); indicador.style.setProperty('--h', `${l.offsetHeight}px`);
}
function porQuantidade(q, { livre }) {
  estado.q = q; estado.livre = livre;
  if (!livre) { outra.value = ''; }
  else escaloes.querySelectorAll('input[name="q"]').forEach((r) => { r.checked = Number(r.value) === q; });
  moverIndicador(); empurrao(); preco();
}
function empurrao() {
  const q = estado.q;
  if (q < minimo(P)) { nota.innerHTML = `O mínimo são <b>${minimo(P)} ${unidade}</b>. Para menos, pergunte-nos no WhatsApp.`; return; }
  if (q > maximo(P)) { nota.innerHTML = `Acima de ${maximo(P)} ${unidade} fazemos um preço especial: junte ao orçamento e diga-nos.`; return; }
  const s = seguinte(P, q);
  if (!s) { nota.textContent = 'Este é o melhor preço por unidade.'; return; }
  const agora = unitario(P, q, estado.escolhas), depois = unitario(P, s.q, estado.escolhas);
  nota.innerHTML = `Com <b>${s.q} ${unidade}</b> fica a <b>${euros(depois)}/un.</b> (−${Math.round((1 - depois / agora) * 100)} %).`;
}
escaloes.addEventListener('change', (e) => { if (e.target.name === 'q') porQuantidade(Number(e.target.value), { livre: false }); });
outra.addEventListener('input', () => { const q = Math.round(Number(outra.value)); if (q > 0) porQuantidade(q, { livre: true }); });
form.querySelectorAll('[data-passador] [data-passo]').forEach((b) => b.addEventListener('click', () => {
  const q = Math.max(1, (Number(outra.value) || estado.q) + Number(b.dataset.passo) * (estado.q >= 100 ? 10 : 1));
  outra.value = String(q); porQuantidade(q, { livre: true });
}));
new ResizeObserver(moverIndicador).observe(escaloes);

/* ——— Personalização ——— */
form.addEventListener('change', (e) => {
  const m = /^op(\d+)$/.exec(e.target.name || '');
  if (!m) return;
  estado.escolhas[Number(m[1])] = Number(e.target.value);
  svg.style.setProperty('--usa-claro', tecnica(P, estado.escolhas, P.tecnica) === 'gravacao' ? '1' : '0');
  empurrao(); preco();
});

/* ——— O preço, a contar ——— */
const sem = $('[data-preco-sem]'), com = $('[data-preco-com]'), un = $('[data-preco-un]'), rotulo = $('[data-preco-rotulo]'), leitor = $('[data-preco-leitor]');
const barraSem = document.querySelector('[data-barra-sem]'), barraCom = document.querySelector('[data-barra-com]');
let mostrado = { sem: null, com: null }, raf = 0, tAnuncio = 0;
function contarAte(el, de, ate, dur = 520) {
  if (de == null || reduz.matches || de === ate) { el.textContent = euros(ate); return; }
  const t0 = performance.now();
  const passo = (t) => { const p = Math.min(1, (t - t0) / dur), e = 1 - (1 - p) ** 3; el.textContent = euros(Math.round(de + (ate - de) * e)); if (p < 1) raf = requestAnimationFrame(passo); };
  raf = requestAnimationFrame(passo);
}
function preco() {
  const t = total(P, estado.q, estado.escolhas);
  cancelAnimationFrame(raf);
  if (t == null) {
    sem.textContent = '—'; com.textContent = '—'; un.textContent = `Abaixo do mínimo de ${minimo(P)} ${unidade}`;
    rotulo.textContent = `${estado.q} ${unidade}`; mostrado = { sem: null, com: null }; return;
  }
  const ti = comIva(t, IVA), u = unitario(P, estado.q, estado.escolhas);
  contarAte(sem, mostrado.sem, t); contarAte(com, mostrado.com, ti);
  if (barraSem) { barraSem.textContent = euros(t); barraCom.textContent = euros(ti); }
  mostrado = { sem: t, com: ti };
  un.textContent = `${euros(u)} + IVA por unidade · ${euros(comIva(u, IVA))} com IVA`;
  rotulo.textContent = `${estado.q} ${unidade}${estado.livre && escalao(P, estado.q)?.q !== estado.q ? ` (preço do escalão de ${escalao(P, estado.q).q})` : ''}`;
  clearTimeout(tAnuncio);
  tAnuncio = setTimeout(() => { leitor.textContent = `${estado.q} ${unidade}: ${euros(t)} mais IVA, ${euros(ti)} com IVA.`; }, 500);
}

/* ——— Juntar ao orçamento ——— */
function juntarAoOrcamento() {
  if (estado.q < minimo(P)) { aviso(`O mínimo são ${minimo(P)} ${unidade}.`); outra.focus(); return; }
  const c = P.cores.find((x) => x.chave === estado.cor);
  juntar({ tipo: 'produto', slug: P.slug, cor: estado.cor, hex: c.hex, q: estado.q, escolhas: [...estado.escolhas] });
  abrirGaveta();
}
form.addEventListener('submit', (e) => { e.preventDefault(); juntarAoOrcamento(); });
document.querySelector('[data-barra-juntar]')?.addEventListener('click', juntarAoOrcamento);

/* ——— A barra fixa do telemóvel ——— */
const barra = document.querySelector('[data-barra]');
const botao = $('[data-juntar]');
if (barra && 'IntersectionObserver' in window) {
  new IntersectionObserver(([e]) => {
    const ver = !e.isIntersecting && e.boundingClientRect.top < 0;
    barra.classList.toggle('visivel', ver); barra.setAttribute('aria-hidden', String(!ver));
    barra.querySelector('button').tabIndex = ver ? 0 : -1;
  }).observe(botao);
}

/* ——— Anterior e seguinte pela ordem da grelha de onde se veio ——— */
function actualizarVizinhos() {
  let ordem = P.ordem, cor = null;
  try { const o = JSON.parse(sessionStorage.getItem('menta:ordem') || 'null'); if (o?.familia === P.familia && o.slugs?.includes(P.slug)) { ordem = o.slugs.map((s) => P.ordem.find((x) => x.slug === s)).filter(Boolean); cor = o.cor; } } catch { /* ordem da família */ }
  const i = ordem.findIndex((x) => x.slug === P.slug);
  const base = location.pathname.replace(/[^/]+\/?$/, '');
  for (const [lado, x] of [['ant', ordem[i - 1]], ['seg', ordem[i + 1]]]) {
    const a = document.querySelector(`[data-vizinho="${lado}"]`);
    if (!a) continue;
    if (!x) { a.hidden = true; continue; }
    a.hidden = false; a.href = `${base}${x.slug}/${cor ? `?cor=${cor}` : ''}`;
    a.querySelector('span').lastChild.textContent = x.nome;
  }
}

/* ——— Arranque: a cor com que se chegou ——— */
{
  const q = new URLSearchParams(location.search).get('cor');
  const chegou = html.dataset.corVt;
  let inicial = null;
  if (chegou && P.cores.some((c) => c.chave === chegou)) inicial = chegou;
  else if (q && P.cores.some((c) => c.chave === q)) inicial = q;
  else if (q) inicial = P.cores.find((c) => c.grupo === q)?.chave || null;
  porCor(inicial || estado.cor, { anunciar: false });
  delete html.dataset.corVt;
  actualizarVizinhos();
  moverIndicador(); empurrao();
  mostrado = { sem: total(P, estado.q, estado.escolhas), com: comIva(total(P, estado.q, estado.escolhas), IVA) };
}
addEventListener('pagereveal', () => { const c = html.dataset.corVt; if (c && P.cores.some((x) => x.chave === c)) porCor(c); delete html.dataset.corVt; });
