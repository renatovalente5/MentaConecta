// A GRELHA DE UMA FAMÍLIA: filtro de cor (o CSS recolore e esconde; aqui só se
// muda html[data-cor] e a morada), tipo, tinta, ordenar, contador e estado vazio.
// Guarda a ordem visível para o «anterior/seguinte» da página do produto.
const html = document.documentElement;
const grelha = document.querySelector('[data-grelha]');
const filtros = document.querySelector('[data-filtros]');
const conta = document.querySelector('[data-conta]');
const vazio = document.querySelector('[data-vazio]');
const cartoes = [...grelha.querySelectorAll('.cartao')];
const familia = location.pathname.split('/').filter(Boolean).at(-1);

const valor = (n) => filtros.querySelector(`[name="${n}"]`)?.value || '';
const corEscolhida = () => filtros.querySelector('input[name="cor"]:checked')?.value || '';
const visivel = (c) => !c.hidden && (!corEscolhida() || c.dataset.grupos.split(' ').includes(corEscolhida()));

function aplicar({ morada = true } = {}) {
  const cor = corEscolhida(), tipo = valor('tipo'), tinta = valor('tinta'), ordem = valor('ordem');
  if (cor) html.dataset.cor = cor; else delete html.dataset.cor;
  for (const c of cartoes) c.hidden = (tipo && c.dataset.tipo !== tipo) || (tinta && c.dataset.tinta !== tinta);
  const ordenados = [...cartoes].sort((a, b) => (ordem === 'preco' ? a.dataset.preco - b.dataset.preco : ordem === '-preco' ? b.dataset.preco - a.dataset.preco : a.dataset.ordem - b.dataset.ordem));
  ordenados.forEach((c) => grelha.append(c));
  const n = cartoes.filter(visivel).length;
  conta.textContent = `${n} ${n === 1 ? 'modelo' : 'modelos'}`;
  vazio.hidden = n > 0;
  // Os cartões que voltam entram outra vez em cascata.
  let d = 0;
  for (const c of ordenados) if (visivel(c)) { c.classList.remove('visivel'); c.style.setProperty('--d', String(Math.min(d++, 8))); void c.offsetWidth; c.classList.add('visivel'); }
  if (morada) {
    const u = new URL(location.href);
    for (const [k, v] of [['cor', cor], ['tipo', tipo], ['tinta', tinta], ['ordem', ordem]]) { if (v) u.searchParams.set(k, v); else u.searchParams.delete(k); }
    history.replaceState(history.state, '', u);
  }
  try { sessionStorage.setItem('menta:ordem', JSON.stringify({ familia, cor, slugs: ordenados.filter(visivel).map((c) => c.querySelector('a').pathname.split('/').filter(Boolean).at(-1)) })); } catch { /* sem ordem guardada */ }
}

// O estado vem da morada (partilhável); o cabeca.js já pôs html[data-cor].
{
  const q = new URLSearchParams(location.search);
  const cor = q.get('cor'); if (cor) { const r = filtros.querySelector(`input[name="cor"][value="${cor}"]`); if (r) r.checked = true; else delete html.dataset.cor; }
  for (const k of ['tipo', 'tinta', 'ordem']) { const s = filtros.querySelector(`[name="${k}"]`); if (s && q.get(k)) s.value = q.get(k); }
  aplicar({ morada: false });
}
filtros.addEventListener('change', (e) => {
  aplicar();
  if (e.target.name === 'cor') e.target.closest('label')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
});
document.querySelector('[data-limpar]')?.addEventListener('click', () => {
  filtros.querySelector('input[name="cor"][value=""]').checked = true;
  filtros.querySelectorAll('select').forEach((s) => { s.value = ''; });
  aplicar();
});

// Passar o rato pelas pontos de um cartão mostra-o nessa cor (só rato; decorativo).
grelha.addEventListener('pointerover', (e) => {
  const i = e.target.closest?.('.pontos i'); if (!i || e.pointerType !== 'mouse') return;
  const c = i.closest('.cartao'); c.style.setProperty('--cor', i.dataset.hex);
  c.dataset.hex = i.dataset.hex; c.dataset.chave = i.dataset.chave;
});
grelha.addEventListener('pointerout', (e) => {
  const c = e.target.closest?.('.cartao'); if (!c || c.contains(e.relatedTarget)) return;
  c.style.removeProperty('--cor');
});
// A cor do cartão em que se carrega segue para a página do produto (cabeca.js
// lê data-hex/data-chave); com o filtro de cor, é a do grupo.
grelha.addEventListener('click', (e) => {
  const c = e.target.closest('.cartao'); if (!c || c.style.getPropertyValue('--cor')) return;
  const cor = corEscolhida(); if (!cor) return;
  const hex = getComputedStyle(c).getPropertyValue(`--cor-${cor}`).trim();
  if (hex) { c.dataset.hex = hex; c.dataset.chave = c.dataset[`g${cor[0].toUpperCase()}${cor.slice(1)}`] || ''; }
}, true);
