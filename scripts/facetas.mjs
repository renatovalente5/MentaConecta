// As FACETAS: malhas de triângulos irregulares, como o M (e o fundo do Facebook
// da Menta). Gera os SVG de assets/img/ — `node scripts/facetas.mjs`. A semente
// fixa dá sempre os mesmos triângulos (o ficheiro só muda se mudar este código).
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

function aleatorio(semente) { let s = semente >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// Uma grelha de pontos mexidos, cada célula partida em dois triângulos.
function malha({ largura, altura, colunas, linhas, mexe = .32, semente = 7 }) {
  const r = aleatorio(semente), dx = largura / colunas, dy = altura / linhas, P = [];
  for (let j = 0; j <= linhas; j++) {
    P.push([]);
    for (let i = 0; i <= colunas; i++) {
      const borda = i === 0 || j === 0 || i === colunas || j === linhas;
      P[j].push([i * dx + (borda && (i === 0 || i === colunas) ? 0 : (r() - .5) * dx * mexe * 2), j * dy + (borda && (j === 0 || j === linhas) ? 0 : (r() - .5) * dy * mexe * 2)]);
    }
  }
  const T = [];
  for (let j = 0; j < linhas; j++) for (let i = 0; i < colunas; i++) {
    const a = P[j][i], b = P[j][i + 1], c = P[j + 1][i], d = P[j + 1][i + 1];
    if ((i + j) % 2) T.push([a, b, d], [a, d, c]); else T.push([a, b, c], [b, d, c]);
  }
  return { T, r };
}
const pts = (t) => t.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
const svg = (w, h, corpo) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice">${corpo}</svg>\n`;

// 1. Cinzentas, para o papel claro (o fundo do Facebook deles): quase brancas.
{
  const { T, r } = malha({ largura: 1200, altura: 700, colunas: 9, linhas: 5, mexe: .4, semente: 11 });
  const c = T.map((t) => { const v = r(); return v < .5 ? `<polygon points="${pts(t)}" fill="#14211D" fill-opacity="${(.012 + r() * .03).toFixed(3)}"/>` : `<polygon points="${pts(t)}" fill="#FFFFFF" fill-opacity="${(.3 + r() * .5).toFixed(2)}"/>`; }).join('');
  writeFileSync(join(RAIZ, 'assets/img/facetas-cinza.svg'), svg(1200, 700, c));
}
// 2. De luz, por cima de uma cor (o palco, as amostras): branco e preto com pouca opacidade.
{
  const { T, r } = malha({ largura: 400, altura: 400, colunas: 4, linhas: 4, mexe: .35, semente: 5 });
  const c = T.map((t) => { const v = r(); return v < .45 ? `<polygon points="${pts(t)}" fill="#FFFFFF" fill-opacity="${(.06 + r() * .2).toFixed(2)}"/>` : `<polygon points="${pts(t)}" fill="#000000" fill-opacity="${(.03 + r() * .1).toFixed(2)}"/>`; }).join('');
  writeFileSync(join(RAIZ, 'assets/img/facetas-luz.svg'), svg(400, 400, c));
}
// 3. Com as cores do M, para o fecho escuro: metade dos triângulos acesos.
{
  const CORES = ['#209478', '#44A088', '#FFEC08', '#DCD02C', '#D81C5C', '#9C2060', '#F48020', '#F89C1C', '#E43C30', '#BC202C'];
  const { T, r } = malha({ largura: 600, altura: 400, colunas: 6, linhas: 4, mexe: .38, semente: 23 });
  const c = T.map((t) => (r() < .52 ? `<polygon points="${pts(t)}" fill="${CORES[Math.floor(r() * CORES.length)]}" fill-opacity="${(.55 + r() * .4).toFixed(2)}"/>` : '')).join('');
  writeFileSync(join(RAIZ, 'assets/img/facetas-cor.svg'), svg(600, 400, c));
}
console.log('facetas escritas em assets/img/');
