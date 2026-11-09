// As imagens que não se desenham no browser: ícones da aplicação (PNG) e as
// imagens de partilha (1200×630) do site e de cada família. Corre-se à mão
// quando a marca ou as famílias mudam (`node scripts/imagens.mjs`); os PNG ficam
// em assets/ e vão para o git.
//
// O WhatsApp mostra a imagem de partilha num QUADRADO cortado ao centro (x 285–915):
// o M e o título ficam no meio, e os desenhos nas pontas, que podem ficar de fora.
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ, marca, familias, produtosDe } from './site.mjs';
import { sprite, instancia } from '../assets/js/desenhos.js';
import { euros, desde, comIva } from '../assets/js/preco.js';
const require = createRequire(import.meta.url);
const pw = require(process.env.PLAYWRIGHT || join(process.env.HOME, 'Websites/carimbo/node_modules/playwright'));
const css = ['base', 'desenhos', 'componentes', 'paginas'].map((n) => readFileSync(join(RAIZ, `assets/css/${n}.css`), 'utf8')).join('\n').replaceAll('../fontes/', `file://${RAIZ}/assets/fontes/`);
const M = `file://${RAIZ}/assets/logo/menta-m.png`;
mkdirSync(join(RAIZ, 'assets/og'), { recursive: true });
mkdirSync(join(RAIZ, '_fonte'), { recursive: true });
const b = await pw.chromium.launch({ channel: 'chrome' });
const foto = async (html, w, h, saida, { transparente = false } = {}) => {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  // Por ficheiro (e não setContent): só assim a página pode ler a letra e as imagens em file://.
  const tmp = join(RAIZ, '_fonte/og-tmp.html');
  writeFileSync(tmp, `<!doctype html><html lang="pt-PT"><meta charset="utf-8"><style>${css} html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;${transparente ? 'background:transparent' : ''}}</style>${html}</html>`);
  await p.goto(`file://${tmp}`);
  await p.evaluate(async () => { await document.fonts.load('780 66px Bricolage'); await document.fonts.load('300 40px Bricolage'); await document.fonts.load('500 28px Inter'); await document.fonts.ready; await Promise.all([...document.images].map((i) => i.decode().catch(() => {}))); });
  await p.waitForTimeout(150);
  await p.screenshot({ path: join(RAIZ, saida), omitBackground: transparente }); await p.close();
};

// Ícones: o M inteiro, com folga, em fundo branco (o iPhone pinta de preto o transparente).
const icone = (t, folga = .16) => `<div style="width:${t}px;height:${t}px;display:grid;place-items:center;background:#fff"><img src="${M}" style="width:${t * (1 - 2 * folga)}px;height:auto;display:block" alt=""></div>`;
for (const [t, f] of [[180, 'assets/apple-touch-icon.png'], [192, 'assets/icone-192.png'], [512, 'assets/icone-512.png']]) await foto(icone(t), t, t, f);
await foto(`<div style="width:64px;height:64px;display:grid;place-items:center"><img src="${M}" style="width:62px;height:auto;display:block" alt=""></div>`, 64, 64, 'assets/favicon.png', { transparente: true });

const BARRA = `<div style="position:absolute;left:0;right:0;bottom:0;height:12px;display:grid;grid-template-columns:repeat(5,1fr)"><i style="background:#209478"></i><i style="background:#FFEC08"></i><i style="background:#D81C5C"></i><i style="background:#F48020"></i><i style="background:#E43C30"></i></div>`;
const og = (titulo, sub, pecas) => `${sprite(pecas.map((x) => x[0]))}
<div style="width:1200px;height:630px;position:relative;background:radial-gradient(circle at 88% 8%, rgba(32,148,120,.22), transparent 42%), radial-gradient(circle at 6% 92%, rgba(255,236,8,.16), transparent 40%), #F4FAF7;overflow:hidden">
  ${pecas.map(([d, c], i) => `<div style="position:absolute;width:${[330, 300, 240][i]}px;${['left:-40px;top:150px;rotate:-8deg', 'right:-30px;top:120px;rotate:7deg', 'right:150px;bottom:-70px;rotate:-6deg'][i]}">${instancia(d, { cor: c })}</div>`).join('')}
  <div style="position:absolute;left:285px;width:630px;top:0;bottom:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:22px">
    <div style="display:flex;align-items:center;gap:16px;color:#14211D"><img src="${M}" style="height:92px;width:auto" alt=""><span style="font:300 44px/1 Bricolage,sans-serif;letter-spacing:-.025em">${marca.nome.split(' ')[0]}<b style="font-weight:800;margin-left:.2em">${marca.nome.split(' ').slice(1).join(' ')}</b></span></div>
    <div style="font:780 60px/1.02 Bricolage,sans-serif;letter-spacing:-.02em;color:#14211D">${titulo}</div>
    <div style="font:500 26px/1.3 Inter,sans-serif;color:#45524D;max-width:600px;text-wrap:balance">${sub}</div>
  </div>
  ${BARRA}
</div>`;
await foto(og('Fardas e brindes<br><span style="color:#137A60">com a sua marca.</span>', 'Escolha, veja o preço e envie o pedido pelo WhatsApp.', [['tshirt', '#FFEC08'], ['garrafa-termica', '#209478'], ['bone', '#D81C5C']]), 1200, 630, 'assets/og/menta.png');
for (const f of familias) {
  const cores = ['#D81C5C', '#209478', '#1B1D24'];
  const d = Math.min(...produtosDe(f.slug).map(desde));
  await foto(og(`${f.h1.antes}<br><span style="color:#137A60">${f.h1.destaque}</span>`, `Desde ${euros(d)} + IVA (${euros(comIva(d))} com IVA) por unidade.`, f.desenhos.map((x, i) => [x, cores[i]])), 1200, 630, `assets/og/${f.slug}.png`);
}
await b.close();
console.log('imagens feitas');
