/* =============================================================
   MENTA CONECTA — portfolio.js
   Galeria de trabalhos (data/works.json) com filtros + lightbox.
   ============================================================= */
(function () {
  'use strict';
  var grid = document.getElementById('portfolio-grid');
  var filters = document.getElementById('portfolio-filters');
  var lb = document.getElementById('lightbox');
  var lbImg = document.getElementById('lightbox-img');
  var lbCap = document.getElementById('lightbox-caption');
  if (!grid) return;

  var view = [], idx = 0, lastFocus = null;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  }); }
  function normImg(p) { if (!p) return ''; if (/^https?:\/\//.test(p)) return p; return p.replace(/^\/+/, ''); }

  function tile(w, i) {
    return '' +
      '<button class="pitem" type="button" data-i="' + i + '" data-category="' + esc(w.category) + '" aria-label="Ver: ' + esc(w.title) + '">' +
        '<img src="' + esc(normImg(w.image)) + '" alt="' + esc(w.title + (w.client ? ' — ' + w.client : '')) + '" loading="lazy" />' +
        '<span class="pitem__overlay">' +
          '<span class="pitem__cat">' + esc(w.category) + '</span>' +
          '<span class="pitem__title">' + esc(w.title) + '</span>' +
          (w.client ? '<span class="pitem__client">' + esc(w.client) + '</span>' : '') +
        '</span>' +
      '</button>';
  }

  function render(list) {
    view = list;
    grid.innerHTML = list.length ? list.map(tile).join('') : '<p class="catalog__loading">Sem trabalhos nesta categoria.</p>';
  }

  function buildFilters(works) {
    if (!filters) return;
    var cats = ['Todos'];
    works.forEach(function (w) { var c = w.category || 'Outros'; if (cats.indexOf(c) < 0) cats.push(c); });
    filters.innerHTML = cats.map(function (c, i) {
      return '<button class="chip" role="tab" aria-pressed="' + (i === 0 ? 'true' : 'false') + '" data-filter="' + esc(c) + '">' + esc(c) + '</button>';
    }).join('');
    filters.addEventListener('click', function (e) {
      var btn = e.target.closest('.chip'); if (!btn) return;
      var f = btn.getAttribute('data-filter');
      filters.querySelectorAll('.chip').forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
      render(f === 'Todos' ? window.__works : window.__works.filter(function (w) { return w.category === f; }));
    });
  }

  /* -------- Lightbox -------- */
  function showAt(i) {
    if (!view.length) return;
    idx = (i + view.length) % view.length;
    var w = view[idx];
    lbImg.src = normImg(w.image);
    lbImg.alt = w.title + (w.client ? ' — ' + w.client : '');
    lbCap.innerHTML = '<strong>' + esc(w.title) + '</strong>' + (w.client ? '<span>' + esc(w.client) + '</span>' : '');
  }
  function openLb(i) {
    lastFocus = document.activeElement;
    showAt(i);
    lb.classList.add('is-open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lb-open');
    var c = lb.querySelector('[data-lb-close]'); if (c) c.focus();
  }
  function closeLb() {
    lb.classList.remove('is-open');
    lb.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lb-open');
    lbImg.src = '';
    if (lastFocus) lastFocus.focus();
  }

  grid.addEventListener('click', function (e) {
    var t = e.target.closest('.pitem'); if (!t) return;
    openLb(parseInt(t.getAttribute('data-i'), 10) || 0);
  });
  lb.addEventListener('click', function (e) {
    if (e.target === lb) closeLb();                       // clicar no fundo
    if (e.target.closest('[data-lb-close]')) closeLb();
    if (e.target.closest('[data-lb-next]')) showAt(idx + 1);
    if (e.target.closest('[data-lb-prev]')) showAt(idx - 1);
  });
  document.addEventListener('keydown', function (e) {
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeLb();
    else if (e.key === 'ArrowRight') showAt(idx + 1);
    else if (e.key === 'ArrowLeft') showAt(idx - 1);
  });

  fetch('data/works.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (data) {
      window.__works = (data && data.works) || [];
      buildFilters(window.__works);
      render(window.__works);
    })
    .catch(function () {
      grid.innerHTML = '<p class="catalog__loading">Não foi possível carregar o portfólio.</p>';
    });
})();
