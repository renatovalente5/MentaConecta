/* =============================================================
   MENTA CONECTA — main.js
   Header dinâmico · menu mobile · scrollspy · reveals
   ============================================================= */
(function () {
  'use strict';
  var doc = document;

  /* ---------- Header: encolher no scroll / crescer no topo ---------- */
  var header = doc.querySelector('[data-header]');
  if (header) {
    var scrolled = false;
    var onScroll = function () {
      var s = window.scrollY > 24;
      if (s !== scrolled) { scrolled = s; header.classList.toggle('is-scrolled', s); }
    };
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(function () { onScroll(); ticking = false; });
        ticking = true;
      }
    }, { passive: true });
    onScroll();
  }

  /* ---------- Menu mobile (ecrã inteiro) ---------- */
  var menu = doc.getElementById('mobile-menu');
  var openBtn = doc.querySelector('[data-menu-open]');
  var closeBtn = doc.querySelector('[data-menu-close]');
  var lastFocus = null;

  function focusables() {
    return menu.querySelectorAll('a[href], button:not([disabled])');
  }
  function openMenu() {
    lastFocus = doc.activeElement;
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    openBtn.setAttribute('aria-expanded', 'true');
    doc.body.classList.add('menu-open');
    var f = focusables();
    if (f.length) setTimeout(function () { f[0].focus(); }, 60);
  }
  function closeMenu() {
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    openBtn.setAttribute('aria-expanded', 'false');
    doc.body.classList.remove('menu-open');
    if (lastFocus) lastFocus.focus();
  }
  if (openBtn) openBtn.addEventListener('click', openMenu);
  if (closeBtn) closeBtn.addEventListener('click', closeMenu);
  menu && menu.querySelectorAll('[data-menu-link]').forEach(function (a) {
    a.addEventListener('click', closeMenu);
  });
  doc.addEventListener('keydown', function (e) {
    if (!menu || !menu.classList.contains('is-open')) return;
    if (e.key === 'Escape') { closeMenu(); return; }
    if (e.key === 'Tab') { // focus trap
      var f = focusables(); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  // fechar se voltar ao desktop
  var mq = window.matchMedia('(min-width:901px)');
  (mq.addEventListener ? mq.addEventListener.bind(mq, 'change') : mq.addListener.bind(mq))(function () {
    if (menu && mq.matches && menu.classList.contains('is-open')) closeMenu();
  });

  /* ---------- Scrollspy (link ativo) ---------- */
  var navLinks = Array.prototype.slice.call(doc.querySelectorAll('.nav__links a'));
  var sections = navLinks
    .map(function (a) { return doc.querySelector(a.getAttribute('href')); })
    .filter(Boolean);
  if ('IntersectionObserver' in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var id = en.target.id;
          navLinks.forEach(function (a) {
            a.classList.toggle('is-current', a.getAttribute('href') === '#' + id);
          });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- Reveal on scroll (robusto: nunca deixa conteúdo escondido) ---------- */
  var reveals = doc.querySelectorAll('[data-reveal]');
  function revealAll() { reveals.forEach(function (el) { el.classList.add('is-in'); }); }
  function inView(el) { var r = el.getBoundingClientRect(); return r.top < (window.innerHeight || 0) && r.bottom > 0; }
  if ('IntersectionObserver' in window && reveals.length) {
    var ro = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); obs.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { ro.observe(el); });
    // failsafes: revelar o que já está à vista e, no limite, tudo
    var showInView = function () { reveals.forEach(function (el) { if (inView(el)) el.classList.add('is-in'); }); };
    showInView();
    window.addEventListener('load', function () { showInView(); setTimeout(revealAll, 4000); });
  } else {
    revealAll();
  }

  /* ---------- Formulário de orçamento → WhatsApp ---------- */
  var form = doc.getElementById('quote-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var nome = (form.nome.value || '').trim();
      var servico = form.servico.value || '';
      var msg = (form.mensagem.value || '').trim();
      if (!nome) { form.nome.focus(); form.nome.setAttribute('aria-invalid', 'true'); return; }
      form.nome.removeAttribute('aria-invalid');
      var text = 'Olá! Sou ' + nome + '.'
        + (servico ? ' Tenho interesse em: ' + servico + '.' : '')
        + (msg ? ' ' + msg : '')
        + ' Podem dar-me um orçamento?';
      window.open('https://wa.me/351966635602?text=' + encodeURIComponent(text), '_blank', 'noopener');
    });
  }

  /* ---------- Mapa: carregar só sob pedido (privacidade) ---------- */
  var mapFacade = doc.getElementById('map-facade');
  if (mapFacade) {
    mapFacade.addEventListener('click', function () {
      var src = mapFacade.getAttribute('data-map-embed');
      var iframe = doc.createElement('iframe');
      iframe.src = src;
      iframe.title = mapFacade.getAttribute('data-map-title') || 'Mapa';
      iframe.loading = 'lazy';
      iframe.setAttribute('referrerpolicy', 'no-referrer');
      iframe.style.cssText = 'display:block;width:100%;height:380px;border:0';
      mapFacade.replaceWith(iframe);
    });
  }

  /* ---------- Ano no footer ---------- */
  var y = doc.querySelector('[data-year]');
  if (y) y.textContent = new Date().getFullYear();
})();
