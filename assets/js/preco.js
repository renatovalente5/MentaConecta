// AS CONTAS DOS PREÇOS — um só ficheiro para o gerador (Node) e para o browser.
// O «desde» do cartão, o preço da página do produto, os dados estruturados e a
// linha do orçamento saem todos daqui; a auditoria confere o texto contra estas
// contas.
//
// Tudo em CÊNTIMOS INTEIROS. O JSON guarda, sem IVA, o valor do conjunto para cada
// escalão (`{ q, preco }`). Ordem das contas:
//   unitário do escalão (arredondado ao cêntimo)
//   → opções: `acrescimo` em euros por unidade, `fator` multiplica
//   → unitário arredondado → total = unitário × q → IVA da linha, arredondado uma vez.
// Uma quantidade fora dos escalões usa o escalão mais alto que não a ultrapassa.

const EUR = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const euros = (centimos) => EUR.format(centimos / 100);
export const IVA_NORMAL = 23;
export const comIva = (centimos, iva = IVA_NORMAL) => Math.round(centimos * (100 + iva) / 100);

export const escaloes = (produto) => produto.quantidades.map((l) => l.q);
export const minimo = (produto) => produto.quantidades[0].q;
export const maximo = (produto) => produto.quantidades[produto.quantidades.length - 1].q;

// O escalão que vale para q (o mais alto que não passa de q); null abaixo do mínimo.
export function escalao(produto, q) {
  let e = null;
  for (const l of produto.quantidades) if (l.q <= q) e = l;
  return e;
}

// As opções escolhidas: um índice por grupo (0 = a primeira, a que vem incluída).
export function opcoesEscolhidas(produto, escolhas = []) {
  return (produto.opcoes || []).map((g, i) => g.opcoes[escolhas[i] ?? 0] || g.opcoes[0]);
}

// O preço por unidade, sem IVA, em cêntimos; null se q estiver abaixo do mínimo.
export function unitario(produto, q, escolhas = []) {
  const e = escalao(produto, q);
  if (!e) return null;
  let u = Math.round(e.preco * 100 / e.q);
  for (const o of opcoesEscolhidas(produto, escolhas)) {
    if (o.acrescimo) u += Math.round(o.acrescimo * 100);
    if (o.fator) u = Math.round(u * o.fator);
  }
  return u;
}
export function total(produto, q, escolhas = []) {
  const u = unitario(produto, q, escolhas);
  return u == null ? null : u * q;
}

// O mais barato por unidade: no último escalão, com as opções incluídas.
export const desde = (produto) => unitario(produto, maximo(produto));

// O próximo escalão a partir de q, para o empurrão «Com 50 un. fica a …».
export function seguinte(produto, q) {
  return produto.quantidades.find((l) => l.q > q) || null;
}

// A técnica que manda no aspecto do logótipo: a da opção escolhida, se a disser.
export function tecnica(produto, escolhas, porOmissao = 'cor') {
  for (const o of opcoesEscolhidas(produto, escolhas)) if (o.tecnica) return o.tecnica;
  return porOmissao;
}

// ——— Grupos de cor (os filtros) ———
export const GRUPOS_COR = [
  { chave: 'brancos', nome: 'Brancos', amostra: '#F4F1EA' },
  { chave: 'pretos', nome: 'Pretos e cinzentos', amostra: '#3B3F48' },
  { chave: 'azuis', nome: 'Azuis', amostra: '#1E4FB8' },
  { chave: 'verdes', nome: 'Verdes', amostra: '#2E9E4F' },
  { chave: 'vermelhos', nome: 'Vermelhos e rosas', amostra: '#C8102E' },
  { chave: 'amarelos', nome: 'Amarelos e laranjas', amostra: '#F6B92D' },
  { chave: 'castanhos', nome: 'Castanhos e beges', amostra: '#8A6240' },
  { chave: 'roxos', nome: 'Roxos', amostra: '#5B2A86' },
];

// Luminância (WCAG): escuro/claro para contornos e texto por cima de uma cor.
export function luminancia(hex) {
  const n = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export const textoSobre = (hex) => (luminancia(hex) > 0.3 ? '#151A33' : '#FFFFFF');

// O acento (a gema do palco, a etiqueta) toma a cor escolhida, menos as quase brancas e as quase
// pretas (desapareciam no papel ou no rodapé escuro).
export const corParaAcento = (hex) => { const l = luminancia(hex); return l > 0.025 && l < 0.7 ? hex : null; };
