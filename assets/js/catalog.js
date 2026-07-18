/* =============================================================
   MENTA CONECTA — catalog.js
   Renderiza o catálogo de produtos a partir de data/products.json
   (editável no backoffice). Filtro por categoria.
   ============================================================= */
(function () {
  'use strict';
  var grid = document.getElementById('catalog-grid');
  var filters = document.getElementById('catalog-filters');
  if (!grid) return;

  var WA = 'https://wa.me/351966635602?text=';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  }); }
  // Caminhos absolutos (/assets/...) partem a raiz do domínio num site em subpath (/MentaConecta/).
  // Normaliza para relativo, deixando URLs http(s) intactos.
  function normImg(p) { if (!p) return ''; if (/^https?:\/\//.test(p)) return p; return p.replace(/^\/+/, ''); }

  function card(p) {
    var msg = encodeURIComponent('Olá! Tenho interesse em: ' + (p.name || 'um produto') + '. Podem dar-me um orçamento?');
    var cat = p.category || 'Personalização';
    var img = p.image
      ? '<img src="' + esc(normImg(p.image)) + '" alt="' + esc(p.name || cat) + '" loading="lazy" onerror="this.onerror=null;this.closest(\'.pcard__media\').classList.add(\'is-empty\');this.remove();" />'
      : '<div class="pcard__ph" aria-hidden="true"><img src="assets/img/logo-mark.png" alt="" /></div>';
    return '' +
      '<article class="pcard" data-category="' + esc(cat) + '">' +
        '<div class="pcard__media">' + img +
          (p.featured ? '<span class="pcard__flag">Destaque</span>' : '') +
        '</div>' +
        '<div class="pcard__body">' +
          '<span class="badge">' + esc(cat) + '</span>' +
          '<h3 class="pcard__title">' + esc(p.name || 'Produto') + '</h3>' +
          (p.description ? '<p class="pcard__desc">' + esc(p.description) + '</p>' : '') +
          (p.price ? '<p class="pcard__price">' + esc(p.price) + '</p>' : '') +
          '<a class="pcard__cta" href="' + WA + msg + '" target="_blank" rel="noopener">Pedir orçamento ' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          '</a>' +
        '</div>' +
      '</article>';
  }

  function render(products) {
    if (!products.length) { grid.innerHTML = '<p class="catalog__loading">Em breve novos produtos.</p>'; return; }
    grid.innerHTML = products.map(card).join('');
    grid.classList.add('is-loaded');
  }

  function buildFilters(products) {
    if (!filters) return;
    var cats = ['Todos'];
    products.forEach(function (p) { var c = p.category || 'Personalização'; if (cats.indexOf(c) < 0) cats.push(c); });
    filters.innerHTML = cats.map(function (c, i) {
      return '<button class="chip" role="tab" aria-pressed="' + (i === 0 ? 'true' : 'false') + '" data-filter="' + esc(c) + '">' + esc(c) + '</button>';
    }).join('');
    filters.addEventListener('click', function (e) {
      var btn = e.target.closest('.chip'); if (!btn) return;
      var f = btn.getAttribute('data-filter');
      filters.querySelectorAll('.chip').forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
      grid.querySelectorAll('.pcard').forEach(function (cardEl) {
        var show = (f === 'Todos') || cardEl.getAttribute('data-category') === f;
        cardEl.style.display = show ? '' : 'none';
      });
    });
  }

  fetch('data/products.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (data) {
      var products = (data && data.products) || [];
      buildFilters(products);
      render(products);
    })
    .catch(function () {
      grid.innerHTML = '<p class="catalog__loading">Não foi possível carregar os produtos. Verifique a ligação ou contacte-nos por WhatsApp.</p>';
    });
})();
