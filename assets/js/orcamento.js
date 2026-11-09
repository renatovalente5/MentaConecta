// O ORÇAMENTO: a lista do visitante (no aparelho dele, só quando junta alguma
// coisa), a gaveta onde a vê e muda, e a mensagem única que envia por WhatsApp
// ou por e-mail. Guardam-se escolhas, nunca preços: os preços calculam-se sempre
// com o preco.js, contra o catálogo publicado.
import { euros, comIva, total, unitario, minimo, maximo, tecnica, opcoesEscolhidas, corParaAcento } from './preco.js';

const CHAVE = 'menta:orcamento';
const raizSite = new URL('../../', import.meta.url);
const urlCatalogo = new URL('../catalogo.json', import.meta.url);
const html = document.documentElement;

/* ——— O estado ——— */
let memoria = null; // reserva quando o armazenamento falha (navegação privada antiga)
export function ler() {
  try { const v = localStorage.getItem(CHAVE); if (v) return normalizar(JSON.parse(v)); } catch { /* usa a memória */ }
  return normalizar(memoria);
}
function normalizar(e) { return e && e.v === 1 && Array.isArray(e.itens) ? e : { v: 1, itens: [], tamanhos: '', quando: '' }; }
export function guardar(estado) {
  memoria = estado;
  try { if (estado.itens.length) localStorage.setItem(CHAVE, JSON.stringify(estado)); else localStorage.removeItem(CHAVE); } catch { /* fica na memória */ }
  dispatchEvent(new CustomEvent('menta:orcamento'));
}
export function ouvirOrcamento(fn) {
  addEventListener('menta:orcamento', fn);
  addEventListener('storage', (e) => { if (e.key === CHAVE) fn(); });
}
const igual = (a, b) => a.tipo === b.tipo && a.slug === b.slug && JSON.stringify(a.cor ?? a.cores) === JSON.stringify(b.cor ?? b.cores) && JSON.stringify(a.escolhas || []) === JSON.stringify(b.escolhas || []);
export function juntar(item) {
  const e = ler();
  const igualA = e.itens.find((x) => igual(x, item));
  if (igualA) { if (item.tipo === 'kit') igualA.pessoas += item.pessoas; else igualA.q += item.q; }
  else e.itens.push({ ...item, id: Math.random().toString(36).slice(2, 9) });
  guardar(e);
  return e;
}
export function contar() {
  const n = ler().itens.length;
  document.querySelectorAll('[data-contador]').forEach((c) => {
    const antes = c.textContent; c.textContent = String(n); c.hidden = n === 0;
    if (antes !== String(n) && n) { c.classList.remove('bateu'); void c.offsetWidth; c.classList.add('bateu'); }
  });
  document.querySelectorAll('[data-orcamento-abrir]').forEach((b) => b.setAttribute('aria-label', n ? `Orçamento, ${n} ${n === 1 ? 'produto' : 'produtos'}` : 'Orçamento'));
}
// O acento toma a cor da última coisa juntada (vem da lista; não há
// uma chave guardada só para isto).
export function corDoAcento() { const it = ler().itens.at(-1); return it?.hex ? corParaAcento(it.hex) : null; }

/* ——— O catálogo publicado ——— */
let catalogo = null;
export async function carregarCatalogo() {
  if (!catalogo) catalogo = fetch(urlCatalogo).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });
  return catalogo;
}
// Garante que o sprite da página tem as formas que a gaveta vai desenhar.
async function garantirFormas(nomes) {
  const sprite = document.querySelector('.sprite-desenhos');
  const faltam = [...new Set(nomes)].filter((n) => !document.getElementById(`d-${n}`));
  if (!faltam.length || !sprite) return;
  const { simbolo } = await import('./desenhos.js');
  sprite.insertAdjacentHTML('beforeend', faltam.map(simbolo).join(''));
}

/* ——— As linhas ——— */
export function detalhar(estado, cat) {
  const iva = cat.marca.iva;
  const linhas = [];
  for (const it of estado.itens) {
    if (it.tipo === 'kit') {
      const k = cat.kits.find((x) => x.slug === it.slug); if (!k) continue;
      const pecas = k.pecas.map((pc, i) => { const p = cat.produtos.find((x) => x.slug === pc.produto); const c = p.cores.find((x) => x.chave === (it.cores?.[i] || pc.cor)) || p.cores[0]; return { p, c, quantidade: pc.quantidade }; });
      const t = k.preco * it.pessoas;
      linhas.push({ it, kit: k, pecas, nome: `Pack ${k.nome}`, detalhe: `${it.pessoas} pessoas · ${pecas.map((x) => x.c.nome).join(', ')}`, total: t, comIva: comIva(t, iva), min: k.minimo, q: it.pessoas, rotuloQ: 'pessoas' });
    } else {
      const p = cat.produtos.find((x) => x.slug === it.slug); if (!p) continue;
      const c = p.cores.find((x) => x.chave === it.cor) || p.cores[0];
      const ops = opcoesEscolhidas(p, it.escolhas).filter((o, i) => p.opcoes[i].opcoes.length > 1).map((o) => o.nome);
      const t = total(p, it.q, it.escolhas);
      linhas.push({ it, p, c, nome: p.titulo, detalhe: [c.nome, ...ops].join(' · '), total: t, comIva: t == null ? null : comIva(t, iva), min: minimo(p), max: maximo(p), q: it.q, rotuloQ: p.unidade, tecnica: tecnica(p, it.escolhas, p.tecnica) });
    }
  }
  const soma = linhas.reduce((s, l) => s + (l.total || 0), 0);
  return { linhas, soma, somaIva: linhas.reduce((s, l) => s + (l.comIva || 0), 0), iva };
}

const precoPar = (c, ci, iva) => (iva ? `<span class="preco-par"><span><b class="preco-num">${euros(c)}</b> <small>+ IVA</small></span><span><b class="preco-num">${euros(ci)}</b> <small>com IVA</small></span></span>` : `<span class="preco-par"><b class="preco-num">${euros(c)}</b> <small>isento de IVA</small></span>`);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const ic = (d) => `<svg class="icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${d}</svg>`;
const IC = {
  fechar: ic('<path d="M6 6l12 12M18 6L6 18"/>'), menos: ic('<path d="M5 12h14"/>'), mais: ic('<path d="M12 5v14M5 12h14"/>'),
  lixo: ic('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>'),
  whatsapp: ic('<path d="M20.5 11.6a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.5-4.3A8.5 8.5 0 1 1 20.5 11.6z"/><path d="M9 8.6c.2 2.8 2.9 5.5 5.7 5.8l1.1-1.2-1.8-1-1 .7c-.9-.4-1.6-1.1-2-2l.7-1-1-1.8z"/>'),
  email: ic('<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M4 7l8 6 8-6"/>'),
  ligacao: ic('<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>'),
};
async function desenhoLinha(l) {
  const { instancia } = await import('./desenhos.js');
  if (l.kit) { const pc = l.pecas[0]; return instancia(pc.p.desenho, { cor: pc.p.alvo === 'dentro' ? '#FFFFFF' : pc.c.hex, corDentro: pc.p.alvo === 'dentro' ? pc.c.hex : '' }); }
  return instancia(l.p.desenho, { cor: l.p.alvo === 'dentro' ? '#FFFFFF' : l.c.hex, corDentro: l.p.alvo === 'dentro' ? l.c.hex : '', tecnica: l.tecnica });
}

/* ——— A mensagem (WhatsApp e e-mail) ——— */
export function codificar(estado) {
  const curto = estado.itens.map((i) => (i.tipo === 'kit' ? ['k', i.slug, i.pessoas, i.cores || []] : ['p', i.slug, i.cor, i.q, i.escolhas || []]));
  const bytes = new TextEncoder().encode(JSON.stringify(curto));
  let bin = ''; bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function descodificar(texto) {
  try {
    const bin = atob(texto.replace(/-/g, '+').replace(/_/g, '/'));
    const curto = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
    return { v: 1, tamanhos: '', quando: '', itens: curto.map((x, k) => (x[0] === 'k' ? { id: `l${k}`, tipo: 'kit', slug: x[1], pessoas: Number(x[2]) || 1, cores: x[3] } : { id: `l${k}`, tipo: 'produto', slug: x[1], cor: x[2], q: Number(x[3]) || 1, escolhas: x[4] })) };
  } catch { return null; }
}
export const ligacaoOrcamento = (estado) => new URL(`orcamento/#o=${codificar(estado)}`, raizSite).toString();
export function mensagem(estado, cat, { curta = false } = {}) {
  const { linhas, soma, somaIva, iva } = detalhar(estado, cat);
  const l = [];
  l.push(`${cat.marca.demo ? cat.marca.teste : ''}Olá! Gostava de um orçamento:`);
  linhas.forEach((x, i) => l.push(curta ? `${i + 1}. ${x.nome} — ${x.q} ${x.rotuloQ}` : `${i + 1}. ${x.nome} — ${x.detalhe} — ${x.q} ${x.rotuloQ}${x.total != null ? ` — ${euros(x.total)}${iva ? ' + IVA' : ''}` : ''}`));
  l.push(`Total indicativo: ${euros(soma)}${iva ? ` + IVA (${euros(somaIva)} com IVA)` : ''}`);
  if (estado.tamanhos?.trim()) l.push(`Tamanhos: ${estado.tamanhos.trim()}`);
  if (estado.quando?.trim()) l.push(`Para quando: ${estado.quando.trim()}`);
  l.push(`Ver o orçamento: ${ligacaoOrcamento(estado)}`);
  l.push('Envio o logótipo a seguir.');
  const t = l.join('\n');
  return t.length > 1800 && !curta ? mensagem(estado, cat, { curta: true }) : t;
}
export function ligacaoWhatsapp(texto, cat) { return `https://wa.me/${String(cat.marca.whatsapp || '').replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`; }
export function ligacaoEmail(texto, cat) { return `mailto:${cat.marca.email || ''}?subject=${encodeURIComponent(`Pedido de orçamento — ${cat.marca.nome}`)}&body=${encodeURIComponent(texto)}`; }

export function aviso(texto) {
  const a = document.querySelector('.aviso'); if (!a) return;
  a.textContent = texto; a.classList.add('visivel');
  clearTimeout(a._t); a._t = setTimeout(() => a.classList.remove('visivel'), 2600);
}

/* ——— A lista (gaveta e página partilham este desenho) ——— */
export async function desenharLista(caixa, estado, { editavel = true, aoMudar } = {}) {
  const cat = await carregarCatalogo();
  const det = detalhar(estado, cat);
  await garantirFormas(det.linhas.flatMap((l) => (l.kit ? l.pecas.map((x) => x.p.desenho) : [l.p.desenho])));
  if (!det.linhas.length) {
    caixa.innerHTML = `<div class="orcamento-vazio"><p>Ainda não juntou nada ao orçamento.</p><a class="botao botao--principal botao--pequeno" href="${new URL('produtos/', raizSite).pathname}">Ver produtos</a></div>`;
    return det;
  }
  const linhasHtml = await Promise.all(det.linhas.map(async (l) => `<div class="linha-orc" data-id="${l.it.id}">
    <div class="linha-orc__desenho">${await desenhoLinha(l)}</div>
    <div><p class="linha-orc__nome">${esc(l.nome)}</p><p class="linha-orc__detalhe">${esc(l.detalhe)}</p></div>
    <div class="linha-orc__fundo">
      ${editavel ? `<div class="passador"><button type="button" data-passo="-1" aria-label="Menos">${IC.menos}</button><input type="number" inputmode="numeric" min="${l.min}" value="${l.q}" aria-label="Quantidade de ${esc(l.nome)} (${esc(l.rotuloQ)})"><button type="button" data-passo="1" aria-label="Mais">${IC.mais}</button></div>` : `<span>${l.q} ${esc(l.rotuloQ)}</span>`}
      <span class="linha-orc__preco">${l.total == null ? `<small>abaixo do mínimo (${l.min})</small>` : precoPar(l.total, l.comIva, det.iva)}</span>
      ${editavel ? `<button type="button" class="linha-orc__tirar" data-tirar>${IC.lixo}Tirar</button>` : ''}
    </div>
  </div>`));
  caixa.innerHTML = linhasHtml.join('');
  if (editavel) {
    caixa.querySelectorAll('.linha-orc').forEach((el) => {
      const id = el.dataset.id;
      const mudar = (fn) => { const e = ler(); const it = e.itens.find((x) => x.id === id); if (!it) return; fn(e, it); guardar(e); aoMudar?.(); };
      el.querySelector('[data-tirar]')?.addEventListener('click', () => mudar((e) => { e.itens = e.itens.filter((x) => x.id !== id); }));
      const input = el.querySelector('input');
      const fixar = (v) => mudar((e, it) => { const n = Math.max(Number(input.min) || 1, Math.round(Number(v) || 0)); if (it.tipo === 'kit') it.pessoas = n; else it.q = n; });
      el.querySelectorAll('[data-passo]').forEach((b) => b.addEventListener('click', () => fixar(Number(input.value) + Number(b.dataset.passo))));
      input?.addEventListener('change', () => fixar(input.value));
    });
  }
  return det;
}

export function rodapeLista(det, estado, cat, { partilhado = false } = {}) {
  const tel = matchMedia('(max-width: 640px)').matches;
  const zap = `<a class="botao botao--whatsapp${tel ? ' botao--bloco' : ''}" data-enviar="whatsapp" href="#" target="_blank" rel="noopener">${IC.whatsapp} Pedir pelo WhatsApp</a>`;
  const mail = `<a class="botao botao--claro${tel ? '' : ''}" data-enviar="email" href="#">${IC.email} Pedir por e-mail</a>`;
  return `<div class="orc-total"><span>Total indicativo</span>${precoPar(det.soma, det.somaIva, det.iva)}</div>
  ${cat.marca.demo ? '<p class="orc-nota"><b>Pré-visualização:</b> preços de exemplo; a mensagem diz que é um teste.</p>' : ''}
  ${partilhado ? '' : `<div class="orc-campos">
    <label class="campo">Tamanhos <small>(se for têxtil; pode ficar «a combinar»)</small><textarea data-campo="tamanhos" placeholder="Ex.: 4 M, 6 L, 2 XL">${esc(estado.tamanhos)}</textarea></label>
    <label class="campo">Para quando? <small>(opcional)</small><input data-campo="quando" value="${esc(estado.quando)}" placeholder="Ex.: até 15 de dezembro"></label>
  </div>`}
  <div class="orc-botoes">${tel ? zap + mail : zap + mail}<button class="botao botao--ghost botao--bloco" type="button" data-copiar>${IC.ligacao} Copiar ligação do orçamento</button></div>
  <p class="orc-nota">A mensagem leva só o texto: anexe o logótipo na conversa. Preço indicativo; o final chega por escrito com a maquete. Peças com o seu logótipo não têm livre resolução depois de aprovada a maquete.</p>
  ${partilhado ? '' : '<p class="orc-nota">O orçamento fica só neste aparelho. <button type="button" class="ligacao" data-esvaziar style="border:0;background:none;padding:0;font:inherit">Esvaziar</button></p>'}`;
}

export function ligarRodape(pe, estadoFn, cat, aoMudar) {
  pe.querySelectorAll('[data-campo]').forEach((c) => c.addEventListener('change', () => { const e = ler(); e[c.dataset.campo] = c.value; guardar(e); }));
  pe.querySelector('[data-enviar="whatsapp"]')?.addEventListener('click', (ev) => { ev.currentTarget.href = ligacaoWhatsapp(mensagem(estadoFn(), cat), cat); });
  pe.querySelector('[data-enviar="email"]')?.addEventListener('click', (ev) => { ev.currentTarget.href = ligacaoEmail(mensagem(estadoFn(), cat), cat); });
  pe.querySelector('[data-copiar]')?.addEventListener('click', async () => {
    const url = ligacaoOrcamento(estadoFn());
    try { await navigator.clipboard.writeText(url); aviso('Ligação copiada'); } catch { prompt('Copie a ligação:', url); }
  });
  pe.querySelector('[data-esvaziar]')?.addEventListener('click', () => { const e = ler(); e.itens = []; guardar(e); aoMudar?.(); });
}

/* ——— A gaveta ——— */
let aberta = false, quemAbriu = null;
export async function abrirGaveta() {
  const caixa = document.getElementById('orcamento');
  if (!caixa) return;
  quemAbriu = document.activeElement;
  if (!aberta) {
    caixa.innerHTML = `<div class="gaveta__fundo" data-fechar></div><aside class="gaveta" role="dialog" aria-modal="true" aria-labelledby="gaveta-t">
      <div class="gaveta__topo"><h2 id="gaveta-t">Orçamento</h2><button class="botao-redondo" type="button" data-fechar aria-label="Fechar o orçamento">${IC.fechar}</button></div>
      <div class="gaveta__corpo" data-lista><p class="orcamento-vazio">A carregar…</p></div>
      <div class="gaveta__pe" data-pe></div></aside>`;
    caixa.hidden = false; aberta = true; html.classList.add('menu-aberto');
    for (const el of document.body.children) if (el !== caixa && !el.matches('script, .sprite-desenhos, .aviso')) el.inert = true;
    caixa.querySelectorAll('[data-fechar]').forEach((b) => b.addEventListener('click', fecharGaveta));
    caixa.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharGaveta(); });
    caixa.querySelector('.gaveta__topo [data-fechar]').focus();
  }
  await refazerGaveta();
}
async function refazerGaveta() {
  const caixa = document.getElementById('orcamento');
  if (!aberta || !caixa) return;
  const cat = await carregarCatalogo();
  const estado = ler();
  const det = await desenharLista(caixa.querySelector('[data-lista]'), estado, { aoMudar: refazerGaveta });
  const pe = caixa.querySelector('[data-pe]');
  pe.innerHTML = det.linhas.length ? rodapeLista(det, estado, cat) : '';
  pe.hidden = !det.linhas.length;
  ligarRodape(pe, ler, cat, refazerGaveta);
}
export function fecharGaveta() {
  const caixa = document.getElementById('orcamento');
  if (!aberta) return;
  aberta = false;
  for (const el of document.body.children) el.inert = false;
  html.classList.remove('menu-aberto');
  const fim = () => { caixa.hidden = true; caixa.classList.remove('a-fechar'); caixa.innerHTML = ''; quemAbriu?.focus?.(); };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return fim();
  caixa.classList.add('a-fechar'); setTimeout(fim, 320);
}
addEventListener('menta:orcamento', () => { if (aberta) refazerGaveta(); });
