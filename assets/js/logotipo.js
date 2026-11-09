// O LOGÓTIPO DO VISITANTE: carrega-se uma vez e aparece em todos os desenhos.
// Nunca sai do aparelho. Guarda-se em IndexedDB como ArrayBuffer (o Safari
// privado recusa Blobs), com reserva em memória.
//
// O caminho de um ficheiro: reduzir a ≤ 1600 px (o iPhone desiste de canvas
// maiores) → tirar o fundo por enchimento a partir das bordas (um limiar global
// apagava o branco de dentro das letras) → cortar as margens vazias → a versão a
// cores e a versão clara (a da gravação a laser: o Safari não aplica `filter` a
// um <image> de SVG, por isso faz-se aqui). Um SVG não se põe no documento:
// entra só como imagem.

const html = document.documentElement;
const BD = 'menta', LOJA = 'logo';
let memoria = null, urls = [];

function abrirBd() {
  return new Promise((res, rej) => {
    if (!('indexedDB' in window)) return rej(new Error('sem IndexedDB'));
    const r = indexedDB.open(BD, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(LOJA);
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error || new Error('IndexedDB'));
  });
}
async function lerGuardado() {
  try {
    const bd = await abrirBd();
    return await new Promise((res, rej) => { const t = bd.transaction(LOJA).objectStore(LOJA).get('actual'); t.onsuccess = () => res(t.result || memoria); t.onerror = () => rej(t.error); });
  } catch { return memoria; }
}
async function escreverGuardado(v) {
  memoria = v;
  try {
    const bd = await abrirBd();
    await new Promise((res, rej) => { const tx = bd.transaction(LOJA, 'readwrite'); if (v) tx.objectStore(LOJA).put(v, 'actual'); else tx.objectStore(LOJA).delete('actual'); tx.oncomplete = res; tx.onerror = () => rej(tx.error || new Error('falhou')); tx.onabort = () => rej(tx.error || new Error('abortou')); });
  } catch { /* fica na memória desta página */ }
}

const blobUrl = (buf, tipo) => { const u = URL.createObjectURL(new Blob([buf], { type: tipo })); urls.push(u); return u; };
export async function aplicarLogo() {
  const g = await lerGuardado();
  urls.forEach((u) => URL.revokeObjectURL(u)); urls = [];
  const imgs = document.querySelectorAll('image.logo-cliente');
  if (!g) {
    imgs.forEach((i) => i.removeAttribute('href'));
    html.classList.remove('tem-logo');
    document.querySelectorAll('.chip-logo').forEach((c) => { c.hidden = true; });
    document.querySelectorAll('[data-logo-texto]').forEach((t) => { t.textContent = 'Ver com o meu logótipo'; });
    return null;
  }
  const cor = blobUrl(g.cor, g.tipoCor), claro = blobUrl(g.claro, 'image/png');
  imgs.forEach((i) => i.setAttribute('href', i.dataset.versao === 'claro' ? claro : cor));
  html.classList.add('tem-logo');
  document.querySelectorAll('.chip-logo').forEach((c) => {
    c.hidden = false;
    let im = c.querySelector('img'); if (!im) { im = document.createElement('img'); im.alt = ''; c.prepend(im); c.querySelector('.icone')?.remove(); }
    im.src = cor;
  });
  document.querySelectorAll('[data-logo-texto]').forEach((t) => { t.textContent = 'Trocar o logótipo'; });
  return { cor, claro };
}

/* ——— O tratamento da imagem ——— */
const carregarImagem = (url) => new Promise((res, rej) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = () => rej(new Error('imagem')); i.src = url; });
const paraBuffer = (canvas) => new Promise((res) => canvas.toBlob((b) => b.arrayBuffer().then(res), 'image/png'));

// Fundo: as bordas quase todas da mesma cor clara e opaca → enche-se dali para dentro.
function temFundo(d, w, h) {
  const amostras = []; const passo = Math.max(1, Math.round((w + h) / 200));
  for (let x = 0; x < w; x += passo) amostras.push((0 * w + x) * 4, ((h - 1) * w + x) * 4);
  for (let y = 0; y < h; y += passo) amostras.push((y * w) * 4, (y * w + w - 1) * 4);
  let claros = 0;
  for (const k of amostras) if (d[k + 3] > 240 && d[k] > 225 && d[k + 1] > 225 && d[k + 2] > 225) claros++;
  return claros / amostras.length > 0.85;
}
function tirarFundo(d, w, h) {
  const ref = [d[0], d[1], d[2]], tol = 38 * 38 * 3;
  const visto = new Uint8Array(w * h), pilha = [];
  const perto = (p) => { const k = p * 4; const a = d[k] - ref[0], b = d[k + 1] - ref[1], c = d[k + 2] - ref[2]; return d[k + 3] > 0 && a * a + b * b + c * c < tol; };
  for (let x = 0; x < w; x++) pilha.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) pilha.push(y * w, y * w + w - 1);
  while (pilha.length) {
    const p = pilha.pop();
    if (visto[p] || !perto(p)) continue;
    visto[p] = 1; d[p * 4 + 3] = 0;
    const x = p % w, y = (p / w) | 0;
    if (x > 0) pilha.push(p - 1); if (x < w - 1) pilha.push(p + 1); if (y > 0) pilha.push(p - w); if (y < h - 1) pilha.push(p + w);
  }
}
function margens(d, w, h) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 16) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
async function tratar(original, tipo, { manterFundo = false } = {}) {
  const url = URL.createObjectURL(new Blob([original], { type: tipo }));
  try {
    const img = await carregarImagem(url);
    const lado = Math.max(img.naturalWidth || 600, img.naturalHeight || 600);
    const esc = Math.min(1, 1600 / lado);
    const w = Math.max(1, Math.round((img.naturalWidth || 600) * esc)), h = Math.max(1, Math.round((img.naturalHeight || 600) * esc));
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    let dados;
    try { dados = ctx.getImageData(0, 0, w, h); } catch { dados = null; } // SVG que suja o canvas: fica como está
    if (!dados) return { cor: original, tipoCor: tipo, claro: original, fundo: false, svg: true };
    const d = dados.data;
    const fundo = !manterFundo && tipo !== 'image/svg+xml' && temFundo(d, w, h);
    if (fundo) tirarFundo(d, w, h);
    const m = margens(d, w, h) || { x: 0, y: 0, w, h };
    const cor = document.createElement('canvas'); cor.width = m.w; cor.height = m.h;
    const c2 = cor.getContext('2d'); const recorte = c2.createImageData(m.w, m.h);
    for (let y = 0; y < m.h; y++) recorte.data.set(d.subarray(((m.y + y) * w + m.x) * 4, ((m.y + y) * w + m.x + m.w) * 4), y * m.w * 4);
    c2.putImageData(recorte, 0, 0);
    const claro = document.createElement('canvas'); claro.width = m.w; claro.height = m.h;
    const c3 = claro.getContext('2d'); const cl = c3.createImageData(m.w, m.h);
    for (let k = 0; k < recorte.data.length; k += 4) { cl.data[k] = 228; cl.data[k + 1] = 231; cl.data[k + 2] = 236; cl.data[k + 3] = recorte.data[k + 3]; }
    c3.putImageData(cl, 0, 0);
    // Um SVG continua SVG na versão a cores (nítido em qualquer tamanho).
    const corBuf = tipo === 'image/svg+xml' ? original : await paraBuffer(cor);
    return { cor: corBuf, tipoCor: tipo === 'image/svg+xml' ? tipo : 'image/png', claro: await paraBuffer(claro), fundo };
  } finally { URL.revokeObjectURL(url); }
}

const TIPOS = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
async function receberFicheiro(f, janela) {
  const aviso = janela.querySelector('[data-logo-aviso]');
  if (!f) return;
  if (!TIPOS.includes(f.type)) { aviso.textContent = 'Use PNG, JPG, WebP ou SVG.'; return; }
  if (f.size > 5 * 1024 * 1024) { aviso.textContent = 'O ficheiro tem mais de 5 MB. Experimente uma versão mais leve.'; return; }
  aviso.textContent = 'A preparar…';
  try {
    const original = await f.arrayBuffer();
    const t = await tratar(original, f.type);
    await escreverGuardado({ original, tipo: f.type, nome: f.name, ...t, manterFundo: false });
    await aplicarLogo();
    aviso.textContent = t.fundo ? 'Tirámos o fundo branco. Se o seu logótipo tem fundo, ligue «Manter o fundo».' : 'Pronto: o logótipo já aparece nos produtos.';
    janela.querySelector('[data-manter]').checked = false;
    janela.querySelector('[data-manter-linha]').hidden = !t.fundo;
    janela.querySelector('[data-remover]').hidden = false;
  } catch { aviso.textContent = 'Não conseguimos ler esta imagem. Experimente outra (PNG ou JPG).'; }
}

let janela = null;
export async function abrirJanelaLogo() {
  if (!janela) {
    const { instancia, simbolo } = await import('./desenhos.js');
    const sprite = document.querySelector('.sprite-desenhos');
    const formas = ['tshirt', 'caneca', 'garrafa-termica'];
    sprite?.insertAdjacentHTML('beforeend', formas.filter((n) => !document.getElementById(`d-${n}`)).map(simbolo).join(''));
    janela = document.createElement('dialog');
    janela.className = 'janela-logo';
    janela.setAttribute('aria-labelledby', 'janela-logo-t');
    janela.innerHTML = `<form method="dialog" class="janela-logo__corpo">
      <div class="janela-logo__topo"><h2 id="janela-logo-t">O seu logótipo</h2><button class="botao-redondo" value="fechar" aria-label="Fechar"><svg class="icone" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
      <label class="zona-largar" data-zona><svg class="icone" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16"/></svg><b>Escolher ou largar aqui o ficheiro</b><small>PNG, JPG, WebP ou SVG, até 5 MB</small><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" class="so-leitor" data-ficheiro></label>
      <p class="janela-logo__nota" data-logo-aviso aria-live="polite"></p>
      <div class="janela-logo__previa">${instancia('tshirt', { cor: '#FFFFFF' })}${instancia('caneca', { cor: '#151A33' })}${instancia('garrafa-termica', { cor: '#0A8FC2' })}</div>
      <div class="janela-logo__opcoes"><label class="interruptor" data-manter-linha hidden><input type="checkbox" data-manter> Manter o fundo</label><button type="button" class="botao botao--ghost" data-remover hidden>Remover o logótipo</button></div>
      <p class="janela-logo__nota">Fica só neste aparelho: não recebemos o ficheiro. A pré-visualização é aproximada; a maquete a sério enviamos nós.</p>
      <button class="botao botao--principal botao--bloco" value="feito">Feito</button>
    </form>`;
    document.body.append(janela);
    const input = janela.querySelector('[data-ficheiro]'), zona = janela.querySelector('[data-zona]');
    input.addEventListener('change', () => receberFicheiro(input.files[0], janela));
    zona.addEventListener('dragover', (e) => { e.preventDefault(); zona.classList.add('por-cima'); });
    zona.addEventListener('dragleave', () => zona.classList.remove('por-cima'));
    zona.addEventListener('drop', (e) => { e.preventDefault(); zona.classList.remove('por-cima'); receberFicheiro(e.dataTransfer.files[0], janela); });
    janela.querySelector('[data-manter]').addEventListener('change', async (e) => {
      const g = await lerGuardado(); if (!g) return;
      const t = await tratar(g.original, g.tipo, { manterFundo: e.target.checked });
      await escreverGuardado({ ...g, ...t, manterFundo: e.target.checked });
      await aplicarLogo();
    });
    janela.querySelector('[data-remover]').addEventListener('click', async () => {
      await escreverGuardado(null); await aplicarLogo();
      janela.querySelector('[data-remover]').hidden = true; janela.querySelector('[data-manter-linha]').hidden = true;
      janela.querySelector('[data-logo-aviso]').textContent = 'Logótipo removido.';
    });
  }
  const g = await lerGuardado();
  janela.querySelector('[data-remover]').hidden = !g;
  janela.querySelector('[data-manter-linha]').hidden = !(g && (g.fundo || g.manterFundo));
  janela.querySelector('[data-manter]').checked = !!g?.manterFundo;
  janela.querySelector('[data-logo-aviso]').textContent = '';
  janela.showModal();
}
