// OS KITS: a cor de cada peça, o número de pessoas e o total (com e sem IVA).
import { euros, comIva, IVA_NORMAL, corParaAcento } from './preco.js';
import { juntar, abrirGaveta, aviso } from './orcamento.js';

// O IVA é o dos dados da loja (marca.iva, que a página diz em data-iva); isento (0): um preço só.
const IVA = Number(document.querySelector('[data-kits]')?.dataset.iva ?? IVA_NORMAL);
const par = (c) => (IVA
  ? `<span class="preco-par"><span><b class="preco-num">${euros(c)}</b> <small>+ IVA</small></span><span><b class="preco-num">${euros(comIva(c, IVA))}</b> <small>com IVA</small></span></span>`
  : `<span class="preco-par"><b class="preco-num">${euros(c)}</b> <small>isento de IVA</small></span>`);
document.querySelectorAll('[data-kit]').forEach((kit) => {
  const preco = Number(kit.dataset.preco), minimo = Number(kit.dataset.minimo);
  const pessoas = kit.querySelector('[data-pessoas]');
  const totalEl = kit.querySelector('[data-kit-total]');
  const conta = () => { const n = Math.max(minimo, Math.round(Number(pessoas.value) || minimo)); totalEl.innerHTML = par(preco * n); return n; };
  pessoas.addEventListener('input', conta);
  pessoas.addEventListener('change', () => { pessoas.value = String(conta()); });
  kit.querySelectorAll('[data-passo]').forEach((b) => b.addEventListener('click', () => { pessoas.value = String(Math.max(minimo, (Number(pessoas.value) || minimo) + Number(b.dataset.passo))); conta(); }));
  kit.addEventListener('change', (e) => {
    const r = e.target; if (r.type !== 'radio') return;
    const peca = r.closest('[data-peca]');
    const d = peca.querySelector('.kit-peca__desenho');
    const svg = d.querySelector('.desenho');
    if (svg.classList.contains('desenho--dentro')) { svg.style.setProperty('--cor-dentro', r.dataset.hex); svg.style.setProperty('--cor-asa', r.dataset.hex); }
    else svg.style.setProperty('--cor', r.dataset.hex);
    peca.querySelector('[data-peca-cor]').textContent = r.dataset.nome;
    const acento = corParaAcento(r.dataset.hex); if (acento) document.documentElement.style.setProperty('--acento', acento);
  });
  kit.querySelector('[data-kit-juntar]').addEventListener('click', () => {
    const n = conta();
    if (n < minimo) { aviso(`O mínimo são ${minimo} kits.`); return; }
    const cores = [...kit.querySelectorAll('[data-peca]')].map((p) => p.querySelector('input:checked').value);
    const hex = kit.querySelector('[data-peca] input:checked').dataset.hex;
    juntar({ tipo: 'kit', slug: kit.dataset.kit, pessoas: n, cores, hex });
    abrirGaveta();
  });
});
