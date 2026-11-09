// Mede os pares de cores da paleta (WCAG 2.x). Corre sozinho para ver a tabela;
// o auditar.mjs importa `PARES` e `medir` e falha a publicação abaixo do mínimo.
export function luminancia(hex) {
  const n = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function medir(a, b) {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
export const COR = {
  papel: '#F4FAF7', papel2: '#E8F3EE', branco: '#FFFFFF',
  tinta: '#14211D', tinta2: '#45524D', tinta3: '#56635E',
  magenta: '#D81C5C', magentaEscuro: '#AF1249', magentaClaro: '#FF80AA',
  menta: '#209478', mentaEscuro: '#137A60', mentaClaro: '#6FD8B9', botaoEscuro: '#0D5C48',
  amarelo: '#FFEC08', laranja: '#F48020',
  verdeVivo: '#25D366',
  fundoEscuro: '#0E2A22', escuroTexto: '#C5D3CD',
};
// [frente, fundo, mínimo, onde]
export const PARES = [
  ['tinta', 'papel', 4.5, 'texto'], ['tinta2', 'papel', 4.5, 'texto secundário'], ['tinta3', 'papel', 4.5, 'legendas'],
  ['tinta2', 'papel2', 4.5, 'texto secundário em cartões'], ['tinta3', 'papel2', 4.5, 'legendas em cartões'],
  // O magenta só decora (traço, facetas, ícones): nenhum texto é magenta.
  ['mentaEscuro', 'papel', 4.5, 'destaque dos títulos e ligações'], ['mentaEscuro', 'papel2', 4.5, 'realce em cartões'],
  ['mentaEscuro', 'branco', 4.5, 'realce em cartões brancos'],
  ['branco', 'mentaEscuro', 4.5, 'botão principal'], ['branco', 'botaoEscuro', 4.5, 'botão principal (rato)'],
  ['mentaEscuro', 'papel', 3, 'contorno do foco'],
  ['tinta', 'amarelo', 4.5, 'texto sobre amarelo'], ['tinta', 'laranja', 4.5, 'texto sobre laranja'],
  ['tinta', 'verdeVivo', 4.5, 'botão WhatsApp (texto escuro)'],
  ['branco', 'fundoEscuro', 4.5, 'texto nas secções escuras'], ['escuroTexto', 'fundoEscuro', 4.5, 'texto secundário nas secções escuras'],
  ['amarelo', 'fundoEscuro', 4.5, 'títulos do rodapé'], ['magentaClaro', 'fundoEscuro', 4.5, 'destaque nas secções escuras'],
  ['mentaClaro', 'fundoEscuro', 4.5, 'menta nas secções escuras'],
];
if (import.meta.url === `file://${process.argv[1]}`) {
  let mal = 0;
  for (const [f, b, min, onde] of PARES) {
    const r = medir(COR[f], COR[b]);
    if (r < min) mal++;
    console.log(`${r >= min ? '✓' : '✗'} ${r.toFixed(2).padStart(5)}  ${f} sobre ${b}  (${onde})`);
  }
  process.exit(mal ? 1 : 0);
}
