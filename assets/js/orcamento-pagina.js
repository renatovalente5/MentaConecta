// A PÁGINA DO ORÇAMENTO: mostra o deste aparelho ou um partilhado pela ligação
// (#o=…). Um partilhado vê-se e envia-se; «Guardar neste aparelho» junta-o.
import { ler, guardar, descodificar, desenharLista, rodapeLista, ligarRodape, carregarCatalogo, ouvirOrcamento, aviso } from './orcamento.js';

const caixa = document.querySelector('[data-orcamento-pagina]');
async function mostrar() {
  const cat = await carregarCatalogo();
  const partilhado = /^#o=/.test(location.hash) ? descodificar(location.hash.slice(3)) : null;
  const estado = partilhado || ler();
  caixa.innerHTML = `${partilhado ? '<p class="orc-nota" style="margin-bottom:12px">Este é um orçamento partilhado por ligação.</p>' : ''}<div data-lista></div><div class="orc-pagina-pe" data-pe></div>`;
  const det = await desenharLista(caixa.querySelector('[data-lista]'), estado, { editavel: !partilhado, aoMudar: mostrar });
  const pe = caixa.querySelector('[data-pe]');
  if (!det.linhas.length) { pe.remove(); return; }
  pe.innerHTML = rodapeLista(det, estado, cat, { partilhado: !!partilhado }) + (partilhado ? '<button class="botao botao--claro botao--bloco" type="button" data-guardar>Guardar neste aparelho</button>' : '');
  ligarRodape(pe, () => (partilhado || ler()), cat, mostrar);
  pe.querySelector('[data-guardar]')?.addEventListener('click', () => {
    const e = ler(); e.itens.push(...partilhado.itens.map((i) => ({ ...i, id: Math.random().toString(36).slice(2, 9) }))); guardar(e);
    history.replaceState(null, '', location.pathname); aviso('Guardado neste aparelho'); mostrar();
  });
}
mostrar();
addEventListener('hashchange', mostrar);
ouvirOrcamento(() => { if (!/^#o=/.test(location.hash)) mostrar(); });
