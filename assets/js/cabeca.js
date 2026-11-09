/* EM LINHA NO <head> (o gerador mete-o lá): o que tem de estar decidido antes da
   primeira pintura.
   · html.js — o CSS só esconde o que o JS vai animar quando há JS.
   · «Pausar movimento» — a escolha do visitante (só existe se ele a fez).
   · ?cor=azuis — o filtro de cor da família, aplicado pelo CSS sem esperar pelo JS.
   · A cor com que se chega à página de um produto (a do cartão em que se carregou)
     e as transições entre páginas: o desenho do cartão voa para o palco do
     produto, e no «voltar» volta para o cartão (o mesmo cuidado do NewAuto: um
     só elemento com o nome de cada vez). */
(() => {
  const h = document.documentElement;
  h.classList.remove('sem-js'); h.classList.add('js');
  try { if (localStorage.getItem('menta:movimento') === 'parado') h.dataset.movimento = 'parado'; } catch { /* sem armazenamento: anima */ }
  try { const c = new URLSearchParams(location.search).get('cor'); if (c && /^[a-z]{3,12}$/.test(c)) h.dataset.cor = c; } catch { /* sem filtro */ }
  const NOME = 'desenho';
  const ler = (k) => { try { const v = sessionStorage.getItem(k); sessionStorage.removeItem(k); return v; } catch { return null; } };
  const guardar = (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* só não há a cor nem a volta */ } };
  const slugDe = (href) => { try { return /\/produtos\/[a-z0-9-]+\/([a-z0-9-]+)\/?$/.exec(new URL(href, location.href).pathname)?.[1] || null; } catch { return null; } };
  const postos = [];
  const limpar = () => { for (const el of postos.splice(0)) el.style.removeProperty('view-transition-name'); };
  const nomear = (el) => { el.style.setProperty('view-transition-name', NOME); postos.push(el); };
  const corChegada = () => {
    const v = ler('menta:cor-vt');
    if (!v) return;
    try { const o = JSON.parse(v); if (o.slug === slugDe(location.href) && /^#[0-9a-f]{6}$/i.test(o.hex)) { h.style.setProperty('--cor-vt', o.hex); h.dataset.corVt = o.chave; } } catch { /* ignora */ }
  };
  corChegada();
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target instanceof Element ? e.target.closest('a.cartao__ligacao, a.vizinho') : null;
    const slug = a && slugDe(a.href);
    if (!slug) return;
    const svg = a.querySelector('.desenho') || document.querySelector('.produto__palco .desenho');
    const cartao = a.closest('[data-hex]');
    if (cartao) guardar('menta:cor-vt', JSON.stringify({ slug, hex: cartao.dataset.hex, chave: cartao.dataset.chave }));
    limpar();
    const palco = document.querySelector('.produto__palco .desenho');
    if (palco && svg !== palco) palco.style.setProperty('view-transition-name', 'none');
    if (svg) nomear(svg);
  });
  const aSair = () => { const s = slugDe(location.href); if (s && document.querySelector('.produto__palco')) guardar('menta:vt-de', s); };
  addEventListener('pageswap', aSair);
  addEventListener('pagehide', aSair);
  addEventListener('pagereveal', (e) => {
    corChegada();
    const de = ler('menta:vt-de');
    limpar();
    if (!e.viewTransition) return;
    if (de && !document.querySelector('.produto__palco')) {
      for (const a of document.querySelectorAll('a.cartao__ligacao')) {
        if (slugDe(a.href) !== de) continue;
        const svg = a.querySelector('.desenho'); const r = svg && svg.getBoundingClientRect();
        if (r && r.width && r.bottom > 0 && r.top < innerHeight) { nomear(svg); a.closest('.cartao')?.style.setProperty('content-visibility', 'visible'); }
        break;
      }
    }
    e.viewTransition.finished.finally(limpar);
  });
})();
