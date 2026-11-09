// O PALCO DO INÍCIO: as peças mudam de cor em ciclo (a «dinâmica de cor» logo à
// entrada). Pára com «Pausar movimento», com o botão do palco, fora do ecrã e com
// `reduce` (WCAG 2.2.2: nada se repete mais de 5 s sem forma de parar).
const palco = document.querySelector('[data-palco]');
const html = document.documentElement;
if (palco) {
  const pecas = [...palco.querySelectorAll('.palco__peca')].map((el) => ({ el, svg: el.querySelector('.desenho'), cores: el.dataset.ciclo.split(','), i: 0 }));
  const tons = ['#209478', '#D81C5C', '#F48020', '#14211D', '#9C2060'];
  const pausa = palco.querySelector('[data-palco-pausa]');
  const reduz = matchMedia('(prefers-reduced-motion: reduce)');
  let parado = false, volta = 0, timer = 0;
  palco.classList.add('entra');
  const pode = () => !parado && !reduz.matches && html.dataset.movimento !== 'parado' && !palco.classList.contains('fora') && !document.hidden;
  function passo() {
    if (pode()) {
      volta++;
      pecas.forEach((p, k) => setTimeout(() => { p.i = (p.i + 1) % p.cores.length; p.svg.style.setProperty('--cor', p.cores[p.i]); }, k * 140));
      palco.querySelector('.palco__fundo').style.background = tons[volta % tons.length];
    }
    timer = setTimeout(passo, 2800);
  }
  timer = setTimeout(passo, 2600);
  pausa.addEventListener('click', () => {
    parado = !parado;
    pausa.setAttribute('aria-pressed', String(parado));
    pausa.setAttribute('aria-label', parado ? 'Retomar as cores' : 'Pausar as cores');
    palco.querySelectorAll('.palco__peca').forEach((p) => { p.style.animationPlayState = parado ? 'paused' : ''; });
  });
}
