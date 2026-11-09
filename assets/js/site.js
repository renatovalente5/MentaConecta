// O QUE TODAS AS PÁGINAS FAZEM: cabeçalho, painel dos produtos, menu do
// telemóvel, entradas ao aparecer, «Pausar movimento», estado do atendimento,
// a gaveta do orçamento (carregada quando é precisa) e o logótipo do visitante.
import { contar, ouvirOrcamento, abrirGaveta, corDoAcento } from './orcamento.js';
import { aplicarLogo, abrirJanelaLogo } from './logotipo.js';

const html = document.documentElement;
const reduz = matchMedia('(prefers-reduced-motion: reduce)');

/* ——— Cabeçalho que encolhe ——— */
const cab = document.querySelector('.cabecalho');
let rolouAntes = null;
const aoRolar = () => { const r = scrollY > 12; if (r !== rolouAntes) { rolouAntes = r; cab?.classList.toggle('rolou', r); } };
addEventListener('scroll', aoRolar, { passive: true }); aoRolar();

/* ——— Painel dos produtos (divulgação: botão + região) ——— */
const botaoProdutos = document.querySelector('.nav-produtos');
const painel = document.getElementById('painel-produtos');
function fecharPainel(foco) {
  if (!painel || painel.hidden) return;
  painel.hidden = true; botaoProdutos.setAttribute('aria-expanded', 'false');
  if (foco) botaoProdutos.focus();
}
botaoProdutos?.addEventListener('click', () => {
  const abrir = painel.hidden;
  painel.hidden = !abrir; botaoProdutos.setAttribute('aria-expanded', String(abrir));
  if (abrir) painel.querySelectorAll('.icone-familia').forEach((s) => s.classList.add('visivel'));
});
document.addEventListener('click', (e) => { if (painel && !painel.hidden && !painel.contains(e.target) && !botaoProdutos.contains(e.target)) fecharPainel(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharPainel(true); });
painel?.addEventListener('focusout', (e) => { if (!painel.contains(e.relatedTarget) && e.relatedTarget !== botaoProdutos) fecharPainel(false); });

/* ——— Menu do telemóvel: ecrã inteiro, foco preso, abre em círculo ——— */
const menu = document.getElementById('menu-telemovel');
const botaoMenu = document.querySelector('.botao-menu');
function abrirMenu() {
  menu.hidden = false; menu.classList.remove('a-fechar'); menu.classList.add('a-abrir');
  html.classList.add('menu-aberto'); botaoMenu.setAttribute('aria-expanded', 'true');
  for (const el of document.body.children) if (el !== menu && !el.matches('script, .sprite-desenhos, .aviso')) el.inert = true;
  menu.querySelector('[data-menu-fechar]').focus();
}
function fecharMenu() {
  if (menu.hidden) return;
  for (const el of document.body.children) el.inert = false;
  html.classList.remove('menu-aberto'); botaoMenu.setAttribute('aria-expanded', 'false');
  const fim = () => { menu.hidden = true; menu.classList.remove('a-fechar', 'a-abrir'); botaoMenu.focus(); };
  if (reduz.matches) return fim();
  menu.classList.add('a-fechar'); menu.addEventListener('animationend', fim, { once: true }); setTimeout(fim, 450);
}
botaoMenu?.addEventListener('click', abrirMenu);
menu?.querySelector('[data-menu-fechar]')?.addEventListener('click', fecharMenu);
menu?.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharMenu(); });
menu?.addEventListener('click', (e) => { if (e.target.closest('a')) for (const el of document.body.children) el.inert = false; });

/* ——— Entradas ao aparecer ——— */
const ALVOS = '.seccao .titulo, .pagina-topo .titulo, .familia-topo .titulo, .produto__nome, .amostra, .cartao, .kit, .passo, .duvida, .valor, .contacto, .kit-config, .fecho, .outra, .horario';
const vistos = new WeakSet();
const io = 'IntersectionObserver' in window ? new IntersectionObserver((entradas) => {
  let d = 0;
  for (const en of entradas) {
    if (!en.isIntersecting) continue;
    const el = en.target;
    if (el.classList.contains('revelar')) el.style.setProperty('--d', String(d++));
    el.classList.add('visivel'); io.unobserve(el);
  }
}, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }) : null;
function observar(raiz = document) {
  for (const el of raiz.querySelectorAll(ALVOS)) {
    if (vistos.has(el)) continue; vistos.add(el);
    if (!el.matches('.titulo, .produto__nome')) el.classList.add('revelar');
    if (io) io.observe(el); else el.classList.add('visivel');
  }
}
observar();
// Salvaguarda: nada fica escondido se o observador falhar.
setTimeout(() => document.querySelectorAll('.revelar:not(.visivel), .titulo:not(.visivel)').forEach((el) => {
  const r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) el.classList.add('visivel');
}), 2500);
export { observar };

/* ——— O que se repete pára fora do ecrã ——— */
if ('IntersectionObserver' in window) {
  const fora = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('fora', !e.isIntersecting)), { rootMargin: '120px 0px' });
  document.querySelectorAll('.palco, .seccao, .familia-topo').forEach((el) => fora.observe(el));
}

/* ——— «Pausar movimento» (lembrado só se o visitante o escolher) ——— */
const botoesMov = document.querySelectorAll('[data-movimento]');
function marcarMovimento() {
  const parado = html.dataset.movimento === 'parado';
  botoesMov.forEach((b) => { b.setAttribute('aria-pressed', String(parado)); b.querySelector('span').textContent = parado ? 'Retomar movimento' : 'Pausar movimento'; });
  dispatchEvent(new CustomEvent('menta:movimento', { detail: { parado } }));
}
botoesMov.forEach((b) => b.addEventListener('click', () => {
  const parado = html.dataset.movimento !== 'parado';
  if (parado) html.dataset.movimento = 'parado'; else delete html.dataset.movimento;
  try { if (parado) localStorage.setItem('menta:movimento', 'parado'); else localStorage.removeItem('menta:movimento'); } catch { /* fica só nesta página */ }
  marcarMovimento();
}));
marcarMovimento();

/* ——— Estado do atendimento (a partir do horário) ———
   Os dias do horário são os das regras (scripts/regras.mjs): 1 = segunda … 7 = domingo. Um dia pode
   ter mais de uma linha (de manhã e à tarde); uma linha sem horas é «por marcação» e não conta. */
const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
function agoraLisboa() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Lisbon', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { dia: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday), min: Number(p.hour) * 60 + Number(p.minute) };
}
const minutos = (h) => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
function estadoAtendimento(HORARIO) {
  const { dia, min } = agoraLisboa();
  const abertos = HORARIO.filter((h) => h.abre && h.fecha);
  // O domingo do relógio (0) é o 7 do horário.
  const doDia = (d) => abertos.filter((h) => h.dias.includes(d || 7)).sort((a, b) => minutos(a.abre) - minutos(b.abre));
  if (doDia(dia).some((h) => min >= minutos(h.abre) && min < minutos(h.fecha))) return { aberto: true, texto: 'Atendimento aberto agora' };
  for (let k = 0; k < 8; k++) {
    const d = (dia + k) % 7;
    const h = doDia(d).find((x) => k > 0 || min < minutos(x.abre));
    if (!h) continue;
    const quando = k === 0 ? 'hoje' : k === 1 ? 'amanhã' : DIAS[d];
    return { aberto: false, texto: `Respondemos ${quando} a partir das ${h.abre.replace(':', 'h')}` };
  }
  return null;
}
document.querySelectorAll('[data-atendimento]').forEach((p) => {
  let est = null; try { est = estadoAtendimento(JSON.parse(p.dataset.atendimento)); } catch { /* sem horário */ }
  if (!est) return;
  p.hidden = false; p.classList.toggle('aberto', est.aberto); p.querySelector('span').textContent = est.texto;
});

/* ——— A página de ligações sabe que veio do Instagram (sem estatísticas) ——— */
if (new URLSearchParams(location.search).get('origem') === 'instagram') {
  document.querySelectorAll('a[href*="wa.me/"]').forEach((a) => { const u = new URL(a.href); u.searchParams.set('text', `${u.searchParams.get('text') || ''} (vim do Instagram)`); a.href = u.toString(); });
}

/* ——— O orçamento: contador, gaveta, a cor de acento ——— */
document.querySelectorAll('[data-orcamento-abrir]').forEach((b) => b.addEventListener('click', () => abrirGaveta()));
ouvirOrcamento(() => { contar(); const c = corDoAcento(); if (c) html.style.setProperty('--acento', c); });
contar();
{ const c = corDoAcento(); if (c) html.style.setProperty('--acento', c); }

/* ——— O logótipo do visitante ——— */
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-logo-carregar], [data-logo-abrir]');
  if (b) { e.preventDefault(); abrirJanelaLogo(); }
});
aplicarLogo();

// Ao voltar pela cache do «voltar», o orçamento e o logótipo podem ter mudado noutra página.
addEventListener('pageshow', (e) => { if (e.persisted) { contar(); aplicarLogo(); } });
