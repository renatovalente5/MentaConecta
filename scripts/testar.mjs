// A BATERIA (Playwright, Chromium e WebKit; computador e telemóvel).
// `node scripts/testar.mjs` — serve uma cópia do _site/ numa porta própria e
// percorre o que o visitante faz: filtros de cor, configurador, orçamento,
// mensagem, ligação partilhada, kits, logótipo, menu, transbordo, pedidos para
// fora e erros na consola. Uma bateria de cada vez (nunca duas no mesmo _site/).
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { RAIZ, BASE } from './site.mjs';
const require = createRequire(import.meta.url);
let pw;
for (const c of [process.env.PLAYWRIGHT, join(homedir(), 'Websites/carimbo/node_modules/playwright'), 'playwright'].filter(Boolean)) { try { pw = require(c); break; } catch { /* tenta o seguinte */ } }
if (!pw) { console.error('Sem Playwright (PLAYWRIGHT=… ou ~/Websites/carimbo/node_modules/playwright)'); process.exit(1); }

const PORTA = Number(process.env.PORTA || 8941);
const RAIZ_URL = `http://localhost:${PORTA}${BASE}/`;
const servidor = spawn(process.execPath, [join(RAIZ, 'scripts/servir.mjs'), String(PORTA)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 600));

let ok = 0, mal = 0;
const certo = (cond, msg) => { if (cond) ok++; else { mal++; console.log(`  ✗ ${msg}`); } return cond; };

async function percorrer(motor, modo) {
  const b = await pw[motor].launch(motor === 'chromium' ? { channel: 'chrome' } : {});
  const ctx = await b.newContext(modo === 'pc' ? { viewport: { width: 1440, height: 900 } } : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const erros = [], fora = [];
  let a404 = false;
  ctx.on('page', (p) => {
    p.on('pageerror', (e) => erros.push(`${p.url()}: ${e}`));
    p.on('console', (m) => { if (m.type() === 'error' && !(a404 && m.text().includes('404'))) erros.push(`${p.url()}: ${m.text()}`); });
    p.on('request', (r) => { const u = r.url(); if (!/^(http:\/\/localhost|data:|blob:)/.test(u)) fora.push(u); });
  });
  const p = await ctx.newPage();
  const ir = async (c) => { const r = await p.goto(RAIZ_URL + c, { waitUntil: 'load' }); await p.waitForTimeout(250); return r; };
  const nome = `${motor}/${modo}`;
  console.log(`— ${nome}`);

  // Início
  certo((await ir('')).status() === 200, `${nome}: início abre`);
  certo(await p.locator('.amostra').count() === 12, `${nome}: 12 famílias no início`);
  certo(await p.locator('.palco .desenho').count() === 5, `${nome}: o palco tem 5 peças`);

  // Família: filtro de cor
  await ir('produtos/t-shirts/');
  const total = await p.locator('.cartao').count();
  await p.locator('.catalogo').scrollIntoViewIfNeeded();
  await p.locator('input[name="cor"][value="roxos"]').check({ force: true });
  await p.waitForTimeout(250);
  certo(new URL(p.url()).searchParams.get('cor') === 'roxos', `${nome}: o filtro vai para a morada`);
  const visiveis = await p.locator('.cartao:visible').count();
  certo(visiveis > 0 && visiveis < total, `${nome}: o filtro esconde modelos (${visiveis}/${total})`);
  certo((await p.locator('[data-conta]').textContent()).startsWith(String(visiveis)), `${nome}: o contador acerta`);
  const coresVisiveis = await p.$$eval('.cartao', (cs) => cs.filter((c) => c.offsetParent).map((c) => getComputedStyle(c).getPropertyValue('--cor').trim()));
  certo(coresVisiveis.every((h) => h === '#5B2A86'), `${nome}: os cartões passam a roxo (${coresVisiveis.join(',')})`);
  await p.reload(); await p.waitForTimeout(250);
  certo(await p.locator('.cartao:visible').count() === visiveis, `${nome}: o filtro sobrevive ao recarregar`);

  // Produto: configurador
  await ir('produtos/t-shirts/classica/?cor=preto');
  certo((await p.locator('[data-cor-nome]').textContent()).trim() === 'Preto', `${nome}: ?cor=preto escolhe o preto`);
  const corPalco = await p.$eval('[data-palco-produto]', (e) => getComputedStyle(e).getPropertyValue('--cor').trim());
  certo(corPalco.toUpperCase() === '#1B1D24', `${nome}: o desenho fica preto (${corPalco})`);
  await p.locator('input[name="q"][value="100"]').check({ force: true });
  await p.waitForTimeout(800);
  certo((await p.locator('[data-preco-sem]').textContent()).includes('499,00'), `${nome}: 100 un. = 499,00 € + IVA`);
  certo((await p.locator('[data-preco-com]').textContent()).includes('613,77'), `${nome}: com IVA = 613,77 €`);
  await p.locator('input[name="op0"][value="1"]').check({ force: true });
  await p.waitForTimeout(800);
  certo((await p.locator('[data-preco-sem]').textContent()).includes('719,00'), `${nome}: frente e costas soma 2,20 €/un.`);
  await p.locator('#q-outra').fill('60'); await p.waitForTimeout(800);
  certo((await p.locator('[data-qtd-nota]').textContent()).includes('100'), `${nome}: 60 un. sugere o escalão de 100`);
  certo((await p.locator('[data-preco-sem]').textContent()).includes('458,40'), `${nome}: 60 un. no escalão de 50 com costas (60 × 7,64)`);
  await p.locator('#q-outra').fill('50'); await p.waitForTimeout(300);

  // Orçamento
  await p.locator('[data-juntar]').click();
  await p.waitForSelector('.gaveta .linha-orc', { timeout: 5000 });
  certo(await p.locator('.gaveta .linha-orc').count() === 1, `${nome}: a gaveta mostra a linha`);
  certo((await p.locator('[data-contador]').first().textContent()) === '1', `${nome}: o contador do cabeçalho passa a 1`);
  const zap = await p.locator('[data-enviar="whatsapp"]').evaluate((a) => { a.addEventListener('click', (e) => e.preventDefault(), { once: true }); a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); return a.href; });
  const msg = decodeURIComponent(new URL(zap).searchParams.get('text') || '');
  certo(msg.startsWith('[Teste — pré-visualização]'), `${nome}: a mensagem diz que é teste`);
  certo(msg.includes('T-shirt Clássica — Preto · Frente e costas — 50 un.'), `${nome}: a mensagem tem o produto, a cor, a opção e a quantidade`);
  certo(/Ver o orçamento: http.+\/orcamento\/#o=/.test(msg), `${nome}: a mensagem leva a ligação do orçamento`);
  const ligacao = msg.match(/Ver o orçamento: (\S+)/)[1];
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  certo(await p.locator('#orcamento').isHidden(), `${nome}: Esc fecha a gaveta`);

  // Ligação partilhada (noutro contexto, sem nada guardado)
  const p2 = await (await b.newContext()).newPage();
  await p2.goto(ligacao.replace(/^https?:\/\/[^/]+\/MentaConecta\//, RAIZ_URL)); await p2.waitForSelector('.linha-orc', { timeout: 5000 });
  certo((await p2.locator('.linha-orc__nome').first().textContent()).includes('T-shirt Clássica'), `${nome}: a ligação partilhada mostra o orçamento`);
  await p2.context().close();

  // Kits
  await ir('packs/');
  const kit = p.locator('[data-kit="evento"]');
  await kit.locator('[data-pessoas]').fill('30'); await kit.locator('[data-pessoas]').dispatchEvent('input');
  certo((await kit.locator('[data-kit-total]').textContent()).includes('537,00'), `${nome}: pack Evento × 30 = 537,00 € + IVA`);
  await kit.locator('[data-kit-juntar]').click();
  await p.waitForSelector('.gaveta .linha-orc >> nth=1', { timeout: 5000 });
  certo(await p.locator('.gaveta .linha-orc').count() === 2, `${nome}: o pack junta-se ao orçamento`);
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);

  // Logótipo
  await ir('produtos/garrafas-termicas/termica-500/');
  await p.locator('.produto__logo').click();
  await p.locator('dialog.janela-logo input[type=file]').setInputFiles(join(RAIZ, 'scripts/testes/logo-fundo-branco.png'));
  await p.waitForFunction(() => document.documentElement.classList.contains('tem-logo'), null, { timeout: 8000 }).catch(() => {});
  certo(await p.evaluate(() => document.documentElement.classList.contains('tem-logo')), `${nome}: o logótipo carregado liga html.tem-logo`);
  certo(await p.evaluate(() => (document.querySelector('image.logo-cliente[data-versao="cor"]')?.getAttribute('href') || '').startsWith('blob:')), `${nome}: o símbolo do logótipo recebe a imagem`);
  certo((await p.locator('[data-logo-aviso]').textContent()).includes('fundo'), `${nome}: diz que tirou o fundo branco`);
  await p.locator('dialog.janela-logo button[value="feito"]').click();
  await ir('produtos/t-shirts/');
  certo(await p.evaluate(() => document.documentElement.classList.contains('tem-logo')), `${nome}: o logótipo segue para outras páginas`);

  // Menu do telemóvel
  if (modo === 'tm') {
    await p.locator('.botao-menu').click(); await p.waitForTimeout(500);
    certo(await p.locator('#menu-telemovel').isVisible(), `${nome}: o menu abre`);
    certo(await p.evaluate(() => document.activeElement?.matches('[data-menu-fechar]')), `${nome}: o foco vai para o fecho do menu`);
    await p.keyboard.press('Escape'); await p.waitForTimeout(600);
    certo(await p.locator('#menu-telemovel').isHidden(), `${nome}: Esc fecha o menu`);
  }

  // Transbordo e 404
  for (const c of ['', 'produtos/', 'produtos/canetas/', 'produtos/garrafas-termicas/termica-500/', 'produtos/porta-chaves/', 'produtos/guarda-chuvas/golfe/', 'produtos/agendas/diaria-a5/', 'packs/', 'orcamento/', 'sobre/', 'contactos/', 'termos/', 'privacidade/', 'ligacoes/']) {
    await ir(c);
    const t = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    certo(t <= 0, `${nome}: ${c || 'início'} sem transbordo (${t}px)`);
  }
  a404 = true;
  certo((await ir('nao-existe/')).status() === 404, `${nome}: endereço errado dá 404`);

  certo(!fora.length, `${nome}: nenhum pedido para fora (${[...new Set(fora)].slice(0, 3).join(', ')})`);
  certo(!erros.length, `${nome}: sem erros na consola\n    ${erros.slice(0, 5).join('\n    ')}`);
  await b.close();
}

try {
  for (const motor of (process.env.MOTORES || 'chromium,webkit').split(',')) for (const modo of (process.env.MODOS || 'pc,tm').split(',')) {
    try { await percorrer(motor, modo); } catch (e) { mal++; console.log(`  ✗ ${motor}/${modo} parou: ${String(e.message || e).split('\n')[0]}`); }
  }
} finally { servidor.kill(); }
console.log(`\n${mal ? '✗' : '✓'} ${ok} certas, ${mal} erradas`);
process.exit(mal ? 1 : 0);
