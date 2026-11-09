#!/usr/bin/env node
/* AS REGRAS À PROVA (`node scripts/test-regras.mjs`; sem dependências, antes de gerar).
 *
 * scripts/regras.mjs é o ficheiro que o painel vai copiar byte a byte (estatico/js/regras.js). Aqui
 * prova-se que:
 *   · é um módulo puro (sem import, require, process nem node:) que corre fora do Node, e exporta o
 *     que o painel usa;
 *   · as listas fechadas que tem lá dentro são as do site: os desenhos (assets/js/desenhos.js), os
 *     grupos das cores (assets/js/preco.js), os ícones das famílias (scripts/icones.mjs), as técnicas
 *     das áreas dos desenhos e as tintas do CSS;
 *   · cada regra, com dados de ensaio bons e maus: o que está bem não diz nada, e o que está mal di-lo
 *     com a chave e a classe certas — e só isso;
 *   · a neutralização (o que o gerador esconde) e o que vai para o site (rascunhos, famílias vazias,
 *     packs com artigos que não estão no site);
 *   · a guarda sai com 1 só pelo que não se contorna;
 *   · os dados de hoje (dados/) não têm nenhum problema, e cada ficheiro volta a gravar-se igual, byte
 *     a byte;
 *   · uma chave tem sempre a mesma classe (o Worker do painel compara chaves).
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdtempSync, cpSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import * as R from './regras.mjs';
import { lerDados, conferir } from './guarda.mjs';
import { NOMES_ICONES_FAMILIA, iconeFamilia } from './icones.mjs';
import { NOMES_DESENHOS, AREAS } from '../assets/js/desenhos.js';
import { GRUPOS_COR } from '../assets/js/preco.js';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let certas = 0;
const erradas = [];
const grupo = (t) => console.log(`— ${t}`);
function prova(nome, fn) {
  try { fn(); certas++; } catch (e) {
    erradas.push(nome);
    console.log(`  ✗ ${nome}\n      ${String((e && e.message) || e).split('\n').slice(0, 8).join('\n      ')}`);
  }
}

/* Todas as chaves que a bateria vê, com as classes (no fim: uma chave, uma classe). */
const CLASSES = new Map();
const visto = (ps) => { for (const p of ps) CLASSES.set(p.chave, new Set([...(CLASSES.get(p.chave) || []), p.classe])); return ps; };
/* Os problemas como «classe chave», ordenados: compara-se a lista inteira (nem mais, nem menos). */
const lista = (ps) => visto(ps).map((p) => `${p.classe} ${p.chave}`).sort();
const igual = (ps, esperado) => assert.deepEqual(lista(ps), [...esperado].sort());
const copia = (x) => JSON.parse(JSON.stringify(x));

/* ------------------------------------------------------------- os dados de ensaio -- */
const COR = (nome, hex, grupo) => ({ nome, hex, grupo });
const coresBase = () => ({
  branco: COR('Branco', '#FFFFFF', 'brancos'),
  preto: COR('Preto', '#1B1D24', 'pretos'),
  'azul-royal': COR('Azul royal', '#1E4FB8', 'azuis'),
  natural: COR('Natural', '#EFE8D8', 'brancos'),
});
const familiasBase = () => ([
  {
    slug: 't-shirts', nome: 'T-shirts', grupo: 'Têxtil', icone: 'tshirt', singular: 't-shirt', artigo: 'a',
    desenhos: ['tshirt', 'tshirt-tecnica', 'tshirt'], coresCapa: ['#FFEC08', '#1B1D24', '#209478'],
    frase: 'Do algodão leve ao premium.', sublinhado: 'costura', vantagens: ['Impressão a cores incluída', 'Maquete antes de decidir'],
    filtros: { cor: true }, duvidas: [{ p: 'Posso misturar tamanhos?', r: 'Pode, no mesmo modelo e cor.' }],
    h1: { antes: 'T-shirts', destaque: 'personalizadas' },
  },
  {
    slug: 'canetas', nome: 'Canetas', grupo: 'Escrita e escritório', icone: 'caneta', artigo: 'a',
    desenhos: ['caneta-touch'], coresCapa: ['#D81C5C', '#FFEC08'], frase: 'Gravadas a laser.', vantagens: [],
    filtros: { tinta: true }, h1: { antes: 'Canetas', destaque: 'personalizadas' },
  },
]);
const artigoBase = () => ({
  slug: 'classica', familia: 't-shirts', nome: 'Clássica', titulo: 'T-shirt Clássica', tipo: 'T-shirt', desenho: 'tshirt',
  frase: '180 g, o equilíbrio certo.', descricao: 'T-shirt de algodão penteado de 180 g.',
  cores: ['branco', 'preto', 'azul-royal'],
  quantidades: [{ q: 10, preco: 69 }, { q: 25, preco: 152 }, { q: 50, preco: 272 }],
  opcoes: [{ grupo: 'Impressão', opcoes: [{ nome: 'Frente', acrescimo: 0 }, { nome: 'Frente e costas', acrescimo: 2.2 }] }],
  areas: { Frente: 'até 29 × 21 cm' },
  especificacoes: { Tecido: '100 % algodão penteado, 180 g/m²', Tamanhos: 'XS a 3XL' },
  ordem: 1,
});
const canetaBase = () => ({
  slug: 'tejo', familia: 'canetas', nome: 'Tejo', titulo: 'Caneta Tejo', tipo: 'Caneta', desenho: 'caneta-touch', tinta: 'azul',
  frase: 'Alumínio com ponteira táctil.', descricao: 'Caneta de alumínio anodizado.', cores: ['preto', 'branco'],
  quantidades: [{ q: 25, preco: 32.5 }, { q: 50, preco: 52.5 }],
  opcoes: [{ grupo: 'Personalização', opcoes: [{ nome: 'Gravação a laser', acrescimo: 0, tecnica: 'gravacao' }, { nome: 'Impressão UV a cores', acrescimo: 0.25, tecnica: 'cor' }] }],
  especificacoes: { Material: 'Alumínio anodizado' }, ordem: 2,
});
const marcaBase = () => ({
  nome: 'Menta Conecta', assinatura: 'Conectando marcas, pessoas e ideias!', servicos: 'Fardamentos · Gráfica rápida · Brindes',
  descricao: 'Fardamentos, gráfica rápida e brindes com o logótipo da sua empresa.', demo: true,
  endereco: 'https://renatovalente5.github.io/MentaConecta/', whatsapp: '351966635602', telefone: '966 635 602',
  email: 'encomendas@exemplo.pt', firma: '', nif: '', morada: '', codigoPostal: '', localidade: 'Lisboa',
  atendimento: 'Atendimento por WhatsApp, e-mail e telefone.', horario: [{ dias: [1, 2, 3, 4, 5], abre: '09:00', fecha: '18:30' }],
  redes: { instagram: 'https://www.instagram.com/menta.conecta/', facebook: 'https://www.facebook.com/mentaconecta', linkedin: '' },
  iva: 23, entrega: '5 a 7 dias úteis após aprovar a maquete', portes: 'Portes incluídos no continente; ilhas no orçamento',
  mensagens: { geral: 'Olá! Gostava de pedir um orçamento.', duvida: 'Olá! Tenho uma dúvida sobre {produto}.', maquete: 'Olá! Gostava de pedir uma maquete.', teste: '[Teste — pré-visualização] ' },
});
const packsBase = () => ([{
  slug: 'arranque', nome: 'Arranque', frase: 'Para a equipa começar a vestir a marca.',
  pecas: [{ produto: 'classica', quantidade: 2, cor: 'preto' }, { produto: 'tejo', quantidade: 1, cor: 'branco' }],
  preco: 39.9, minimo: 5, inclui: ['Logótipo na frente de cada peça', 'Maquete grátis'],
}]);
const duvidasBase = () => ([{ p: 'A maquete é mesmo grátis?', r: 'É, e sem compromisso.' }]);
const dadosBase = (mudar) => {
  const d = { marca: marcaBase(), familias: familiasBase(), cores: coresBase(), kits: packsBase(), duvidas: duvidasBase(), artigos: { classica: artigoBase(), tejo: canetaBase() } };
  if (mudar) mudar(d);
  return d;
};
const CTX = () => ({ nome: 'classica', familias: R.familiasDe(familiasBase()), cores: coresBase() });
const doArtigo = (mudar, ctx = {}) => { const a = artigoBase(); if (mudar) mudar(a); return R.problemasDoArtigo(a, { ...CTX(), ...ctx }); };
const daCaneta = (mudar) => { const a = canetaBase(); if (mudar) mudar(a); return R.problemasDoArtigo(a, { ...CTX(), nome: 'tejo' }); };
const daMarca = (mudar, opcoes) => { const m = marcaBase(); if (mudar) mudar(m); return R.problemasDaMarca(m, opcoes); };
const dasFamilias = (mudar, ctx) => { const f = familiasBase(); if (mudar) mudar(f); return R.problemasDasFamilias(f, ctx); };
const dasCores = (mudar, ctx) => { const c = coresBase(); if (mudar) mudar(c); return R.problemasDasCores(c, ctx); };
const ARTIGOS_DOS_PACKS = () => new Map([
  ['classica', { titulo: 'T-shirt Clássica', cores: new Set(['branco', 'preto', 'azul-royal']), noSite: true }],
  ['tejo', { titulo: 'Caneta Tejo', cores: new Set(['preto', 'branco']), noSite: true }],
]);
const dosPacks = (mudar, artigos = ARTIGOS_DOS_PACKS()) => { const k = packsBase(); if (mudar) mudar(k); return R.problemasDosPacks(k, { artigos }); };
const dasDuvidas = (mudar) => { const d = duvidasBase(); if (mudar) mudar(d); return R.problemasDasDuvidas(d); };
const N = (s) => `neutraliza artigo:classica:${s}`;
const A = (s) => `avisa artigo:classica:${s}`;

/* ------------------------------------------------------------- o módulo -- */
grupo('scripts/regras.mjs é um módulo puro, que o painel copia byte a byte');
const FONTE = readFileSync(join(RAIZ, 'scripts/regras.mjs'), 'utf8');
prova('sem import, require, process nem node: (fora dos comentários)', () => {
  assert.ok(!/^\s*import\s|require\(|\bprocess\.|node:/m.test(FONTE.replace(/\/\*[\s\S]*?\*\//g, '')));
  assert.ok(!/\bimport\s*\(|\bimport\.meta\b|\bBuffer\b|__dirname/.test(FONTE.replace(/\/\*[\s\S]*?\*\//g, '')));
});
prova('sem caracteres de controlo literais no código (só por escape)', () => assert.ok(!/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(FONTE)));
prova('corre fora do Node (num contexto só com o JavaScript e o TextEncoder) e dá o mesmo que no Node', () => {
  const codigo = FONTE.replace(/^export (const|function) /gm, '$1 ');
  const ctx = vm.createContext({ TextEncoder });
  vm.runInContext(`${codigo}\n;globalThis.__R = { problemas, neutralizar, paraOSite, textoDoHorario };`, ctx);
  const { dados } = lerDados(RAIZ);
  const tal = JSON.parse(JSON.stringify(ctx.__R.problemas(dados)));
  assert.deepEqual(tal, JSON.parse(JSON.stringify(R.problemas(dados))));
  const s = ctx.__R.paraOSite(dados);
  assert.equal(s.artigos.length, R.paraOSite(dados).artigos.length);
  const mau = copia(dados);
  const primeiro = Object.keys(mau.artigos)[0];
  mau.artigos[primeiro] = JSON.stringify({ ...JSON.parse(mau.artigos[primeiro]), desenho: 'nave' });
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.__R.problemas(mau))), JSON.parse(JSON.stringify(R.problemas(mau))));
});
const USADAS = ['problemas', 'problemasDoArtigo', 'problemasDaMarca', 'problemasDasFamilias', 'problemasDasCores', 'problemasDosPacks', 'problemasDasDuvidas',
  'mudancasBloqueadas', 'neutralizar', 'paraOSite', 'descreverEfeitos', 'ordenarComo', 'serializar', 'terminacaoDe', 'gerarSlug', 'slugValido', 'slugDoFicheiro',
  'ficheiroDoArtigo', 'noSite', 'ordemDe', 'nomeDoArtigo', 'familiasDe', 'coresEmUso', 'textoDoHorario', 'nifValido', 'emailValido', 'numeroPortugues',
  'eTelemovel', 'whatsappValido', 'corValida', 'horaValida', 'redeValida', 'mesmoValor', 'alegacaoDe'];
const CONSTANTES = ['FICHEIROS', 'PASTAS', 'CAMPOS_ARTIGO', 'CAMPOS_FAMILIA', 'CAMPOS_PACK', 'CAMPOS_COR', 'CAMPOS_MARCA', 'POR_OMISSAO', 'LIMITES', 'TAMANHOS',
  'NOMES_DESENHOS', 'TECNICAS', 'ICONES_FAMILIA', 'CHAVES_GRUPOS_COR', 'NOMES_GRUPOS_COR', 'TINTAS', 'TAXAS_IVA', 'BLOQUEADOS_MARCA', 'RE_ALEGACOES', 'NOMES_CAMPOS'];
prova(`exporta o que o painel usa (${USADAS.length} funções, ${CONSTANTES.length} constantes)`, () => {
  assert.deepEqual(USADAS.filter((f) => typeof R[f] !== 'function'), []);
  assert.deepEqual(CONSTANTES.filter((c) => R[c] === undefined), []);
});
prova('os caminhos: os cinco documentos e a pasta dos artigos existem', () => {
  assert.deepEqual(Object.keys(R.FICHEIROS), ['marca', 'familias', 'cores', 'kits', 'duvidas']);
  for (const rel of Object.values(R.FICHEIROS)) readFileSync(join(RAIZ, rel));
  assert.equal(R.PASTAS.artigos, 'dados/produtos');
  assert.ok(readdirSync(join(RAIZ, R.PASTAS.artigos)).length > 0);
  assert.equal(R.ficheiroDoArtigo('classica'), 'dados/produtos/classica.json');
  assert.equal(R.slugDoFicheiro('classica.json'), 'classica');
});

/* ------------------------------------------------------------- as listas fechadas -- */
grupo('as listas que as regras têm lá dentro são as do site');
prova('NOMES_DESENHOS = assets/js/desenhos.js (os mesmos, pela mesma ordem)', () => assert.deepEqual([...R.NOMES_DESENHOS], [...NOMES_DESENHOS]));
prova('as áreas dos desenhos: uma para cada desenho, e a técnica de cada uma é uma das TECNICAS', () => {
  assert.deepEqual(Object.keys(AREAS).sort(), [...NOMES_DESENHOS].sort());
  assert.deepEqual(Object.entries(AREAS).filter(([, a]) => !R.TECNICAS.includes(a.tecnica)).map(([n]) => n), []);
  assert.deepEqual([...R.TECNICAS], ['cor', 'gravacao', 'bordado']);
});
prova('CHAVES_GRUPOS_COR e NOMES_GRUPOS_COR = GRUPOS_COR de assets/js/preco.js', () => {
  assert.deepEqual([...R.CHAVES_GRUPOS_COR], GRUPOS_COR.map((g) => g.chave));
  assert.deepEqual({ ...R.NOMES_GRUPOS_COR }, Object.fromEntries(GRUPOS_COR.map((g) => [g.chave, g.nome])));
});
prova('ICONES_FAMILIA = os ícones das famílias de scripts/icones.mjs, e cada um desenha-se', () => {
  assert.deepEqual([...R.ICONES_FAMILIA], [...NOMES_ICONES_FAMILIA]);
  for (const i of R.ICONES_FAMILIA) assert.ok(iconeFamilia(i).includes('<g class="if-k"><'));
  assert.throws(() => iconeFamilia('nave'));
});
prova('cada TINTA tem a cor do chip no CSS', () => {
  const css = readFileSync(join(RAIZ, 'assets/css/componentes.css'), 'utf8');
  for (const t of R.TINTAS) assert.ok(css.includes(`.chip--tinta.chip--${t}`), t);
});

/* ------------------------------------------------------------- um artigo -- */
grupo('um artigo (problemasDoArtigo)');
prova('o artigo de ensaio não tem problemas', () => igual(doArtigo(), []));
prova('e a caneta também não (tinta azul, técnicas na lista, sem tecido)', () => igual(daCaneta(), []));
prova('não é um objecto: nada (a forma do ficheiro é do problemas())', () => { igual(R.problemasDoArtigo(null, CTX()), []); igual(R.problemasDoArtigo([1], CTX()), []); });
for (const campo of ['nome', 'titulo', 'tipo', 'frase', 'descricao']) {
  prova(`sem «${campo}»: escondido (neutraliza)`, () => {
    igual(doArtigo((a) => { delete a[campo]; }), [N(campo)]);
    igual(doArtigo((a) => { a[campo] = '   '; }), [N(campo)]);
    igual(doArtigo((a) => { a[campo] = 7; }), [N(campo)]);
    const p = doArtigo((a) => { a[campo] = ''; })[0];
    assert.equal(p.efeito, 'esconder'); assert.equal(p.campo, campo); assert.equal(p.slug, 'classica'); assert.equal(p.ficheiro, 'dados/produtos/classica.json');
    assert.ok(p.mensagem.length > 20 && !/[{}[\]]/.test(p.mensagem));
  });
}
prova('textos compridos de mais: avisa (nome, título, tipo, frase, descrição, unidade, tipo do filtro)', () => {
  igual(doArtigo((a) => { a.nome = 'x'.repeat(R.TAMANHOS.nome + 1); }), [A('nome:tamanho')]);
  igual(doArtigo((a) => { a.nome = 'x'.repeat(R.TAMANHOS.nome); }), []);
  igual(doArtigo((a) => { a.titulo = 'x'.repeat(R.TAMANHOS.titulo + 1); }), [A('titulo:tamanho')]);
  igual(doArtigo((a) => { a.tipo = 'x'.repeat(R.TAMANHOS.tipo + 1); }), [A('tipo:tamanho')]);
  igual(doArtigo((a) => { a.frase = 'x'.repeat(R.TAMANHOS.frase + 1); }), [A('frase:tamanho')]);
  igual(doArtigo((a) => { a.descricao = 'x'.repeat(R.TAMANHOS.descricao + 1); }), [A('descricao:tamanho')]);
  igual(doArtigo((a) => { a.unidade = 'x'.repeat(R.TAMANHOS.unidade + 1); }), [A('unidade:tamanho')]);
  igual(doArtigo((a) => { a.grupoTipo = 'x'.repeat(R.TAMANHOS.grupoTipo + 1); }), [A('grupoTipo:tamanho')]);
});
prova('caracteres invisíveis: avisa (a descrição pode mudar de linha)', () => {
  igual(doArtigo((a) => { a.nome = 'Clás\nsica'; }), [A('nome:controlo')]);
  igual(doArtigo((a) => { a.descricao = 'Uma linha.\nOutra.'; }), []);
  igual(doArtigo((a) => { a.descricao = 'Com um sino\u0007.'; }), [A('descricao:controlo')]);
});
prova('a família: vazia ou que não existe esconde; sem a lista das famílias, não se confere', () => {
  igual(doArtigo((a) => { a.familia = ''; }), [N('familia')]);
  igual(doArtigo((a) => { a.familia = 'inexistente'; }), [N('familia')]);
  igual(doArtigo((a) => { a.familia = 'inexistente'; }, { familias: null }), []);
});
prova('o desenho tem de ser um dos que o site sabe fazer', () => {
  igual(doArtigo((a) => { a.desenho = 'nave'; }), [N('desenho')]);
  igual(doArtigo((a) => { delete a.desenho; }), [N('desenho')]);
  for (const d of R.NOMES_DESENHOS) igual(doArtigo((a) => { a.desenho = d; }), []);
});
prova('a tinta: azul, preta ou nenhuma (vai para uma classe do CSS)', () => {
  igual(daCaneta((a) => { a.tinta = 'verde'; }), ['neutraliza artigo:tejo:tinta']);
  igual(daCaneta((a) => { a.tinta = 'preta'; }), []);
  igual(daCaneta((a) => { delete a.tinta; }), []);
});
prova('a unidade é texto; onde vai a cor é «dentro» ou nada; o tipo do filtro é texto', () => {
  igual(doArtigo((a) => { a.unidade = 3; }), [N('unidade')]);
  igual(doArtigo((a) => { a.unidade = 'cartões'; }), []);
  igual(doArtigo((a) => { a.corAlvo = 'fora'; }), [A('corAlvo')]);
  igual(doArtigo((a) => { a.corAlvo = 'dentro'; }), []);
  igual(doArtigo((a) => { a.grupoTipo = 5; }), [A('grupoTipo:tipo')]);
});
prova('as cores: sem nenhuma, esconde', () => {
  igual(doArtigo((a) => { a.cores = []; }), [N('sem-cores')]);
  igual(doArtigo((a) => { delete a.cores; }), [N('sem-cores')]);
  igual(doArtigo((a) => { a.cores = 'preto'; }), [N('sem-cores')]);
});
prova('uma cor que não está na paleta sai do artigo (sem_cor), com a cor e o índice', () => {
  const ps = doArtigo((a) => { a.cores = ['branco', 'azul-roial']; });
  igual(ps, [N('cor-desconhecida:azul-roial')]);
  assert.equal(ps[0].efeito, 'sem_cor'); assert.equal(ps[0].cor, 'azul-roial'); assert.equal(ps[0].indice, 1);
  igual(doArtigo((a) => { a.cores = ['branco', 'azul-roial']; }, { cores: null }), []);
  igual(doArtigo((a) => { a.cores = ['branco', 'preto']; }, { cores: new Set(['branco', 'preto']) }), []);
});
prova('uma cor mal escrita também sai; sem nenhuma boa, o artigo esconde-se', () => {
  igual(doArtigo((a) => { a.cores = ['Azul Royal']; }), [N('cor-invalida:Azul Royal'), N('sem-cores')]);
  igual(doArtigo((a) => { a.cores = ['azul-roial']; }), [N('cor-desconhecida:azul-roial'), N('sem-cores')]);
  igual(doArtigo((a) => { a.cores = ['preto', 4]; }), [N('cor-invalida:4')]);
});
prova('uma cor repetida avisa; muitas cores avisa', () => {
  const ps = doArtigo((a) => { a.cores = ['branco', 'preto', 'branco']; });
  igual(ps, [A('cor-repetida:branco')]);
  assert.ok(ps[0].mensagem.includes('Branco'));
  const muitas = Array.from({ length: R.LIMITES.cores[1] + 1 }, (_, i) => `cor-${i}`);
  igual(doArtigo((a) => { a.cores = muitas; }, { cores: new Set(muitas) }), [A('cores:muitas')]);
});
prova('as quantidades: sem tabela, esconde', () => {
  igual(doArtigo((a) => { a.quantidades = []; }), [N('quantidades')]);
  igual(doArtigo((a) => { delete a.quantidades; }), [N('quantidades')]);
  igual(doArtigo((a) => { a.quantidades = [5]; }), [N('quantidades.0')]);
});
prova('de 1 a 8 linhas (mais avisa)', () => {
  igual(doArtigo((a) => { a.quantidades = [{ q: 10, preco: 50 }]; }), []);
  const oito = Array.from({ length: 8 }, (_, i) => ({ q: (i + 1) * 10, preco: (i + 1) * 50 }));
  igual(doArtigo((a) => { a.quantidades = oito; }), []);
  igual(doArtigo((a) => { a.quantidades = [...oito, { q: 90, preco: 450 }]; }), [A('quantidades:muitas')]);
});
prova('a quantidade é um inteiro, a subir', () => {
  igual(doArtigo((a) => { a.quantidades[0].q = 10.5; }), [N('quantidades.0.q')]);
  igual(doArtigo((a) => { a.quantidades[0].q = 0; }), [N('quantidades.0.q')]);
  igual(doArtigo((a) => { a.quantidades[0].q = '10'; }), [N('quantidades.0.q')]);
  igual(doArtigo((a) => { a.quantidades[1].q = 10; }), [N('quantidades.1.q')]);
  igual(doArtigo((a) => { a.quantidades[2].q = 20; }), [N('quantidades.2.q')]);
  igual(doArtigo((a) => { a.quantidades[0].q = R.LIMITES.q[1] + 1; }), [N('quantidades.0.q')]);
});
prova('o preço de uma linha: maior do que zero, com duas casas no máximo', () => {
  igual(doArtigo((a) => { a.quantidades[0].preco = 0; }), [N('quantidades.0.preco')]);
  igual(doArtigo((a) => { a.quantidades[0].preco = -69; }), [N('quantidades.0.preco')]);
  igual(doArtigo((a) => { a.quantidades[0].preco = '69'; }), [N('quantidades.0.preco')]);
  igual(doArtigo((a) => { a.quantidades[0].preco = 69.999; }), [N('quantidades.0.preco')]);
  igual(doArtigo((a) => { delete a.quantidades[0].preco; }), [N('quantidades.0.preco')]);
  igual(doArtigo((a) => { a.quantidades[0].preco = 69.5; }), []);
});
prova('o preço por unidade nunca sobe com a quantidade (igual pode; conta-se ao cêntimo, como o site)', () => {
  const ps = doArtigo((a) => { a.quantidades = [{ q: 10, preco: 60 }, { q: 25, preco: 160 }]; });
  igual(ps, [N('quantidades.1:sobe')]);
  assert.ok(ps[0].mensagem.includes('6,40 €') && ps[0].mensagem.includes('6,00 €'), ps[0].mensagem);
  igual(doArtigo((a) => { a.quantidades = [{ q: 10, preco: 60 }, { q: 20, preco: 120 }]; }), []);
  igual(doArtigo((a) => { a.quantidades = [{ q: 3, preco: 1 }, { q: 4, preco: 1.33 }]; }), []);
  igual(doArtigo((a) => { a.quantidades = [{ q: 3, preco: 1 }, { q: 6, preco: 2.04 }]; }), [N('quantidades.1:sobe')]);
});
prova('as opções: sem opções está bem; a lista tem de ser uma lista', () => {
  igual(doArtigo((a) => { delete a.opcoes; }), []);
  igual(doArtigo((a) => { a.opcoes = []; }), []);
  igual(doArtigo((a) => { a.opcoes = {}; }), [N('opcoes')]);
  igual(doArtigo((a) => { a.opcoes = ['x']; }), [N('opcoes.0')]);
  igual(doArtigo((a) => { a.opcoes = [{ grupo: 'A' }]; }), [N('opcoes.0')]);
});
prova('um grupo: com nome, de 1 a 6 opções (sem nenhuma esconde; mais avisa); até 4 grupos', () => {
  igual(doArtigo((a) => { a.opcoes[0].grupo = ''; }), [N('opcoes.0.grupo')]);
  igual(doArtigo((a) => { a.opcoes[0].opcoes = []; }), [N('opcoes.0:vazio')]);
  igual(doArtigo((a) => { a.opcoes[0].opcoes = [{ nome: 'Frente', acrescimo: 0 }]; }), []);
  igual(doArtigo((a) => { a.opcoes[0].opcoes = Array.from({ length: 7 }, (_, i) => ({ nome: `Opção ${i}`, acrescimo: i })); }), [A('opcoes.0:muitas')]);
  igual(doArtigo((a) => { a.opcoes = Array.from({ length: 5 }, (_, i) => ({ grupo: `Grupo ${i}`, opcoes: [{ nome: 'Sim' }] })); }), [A('opcoes:muitas')]);
  igual(doArtigo((a) => { a.opcoes.push({ grupo: 'impressão', opcoes: [{ nome: 'Uma' }] }); }), [A('opcoes.1.grupo:repetido')]);
  igual(doArtigo((a) => { a.opcoes[0].grupo = 'x'.repeat(R.TAMANHOS.grupoNome + 1); }), [A('opcoes.0.grupo:tamanho')]);
});
prova('uma opção: com nome (sem ele esconde), sem repetir', () => {
  igual(doArtigo((a) => { a.opcoes[0].opcoes[1].nome = ' '; }), [N('opcoes.0.opcoes.1.nome')]);
  igual(doArtigo((a) => { a.opcoes[0].opcoes[1] = 'Costas'; }), [N('opcoes.0.opcoes.1.nome')]);
  igual(doArtigo((a) => { a.opcoes[0].opcoes[1].nome = 'frente'; }), [A('opcoes.0.opcoes.1.nome:repetido')]);
  igual(doArtigo((a) => { a.opcoes[0].opcoes[1].nome = 'x'.repeat(R.TAMANHOS.opcaoNome + 1); }), [A('opcoes.0.opcoes.1.nome:tamanho')]);
});
prova('o acréscimo: euros por unidade, de 0 a 1000, duas casas', () => {
  for (const mau of [-1, 0.255, '2', 1001, Number.NaN]) igual(doArtigo((a) => { a.opcoes[0].opcoes[1].acrescimo = mau; }), [N('opcoes.0.opcoes.1.acrescimo')]);
  igual(doArtigo((a) => { a.opcoes[0].opcoes[1].acrescimo = 0.5; }), []);
  igual(doArtigo((a) => { delete a.opcoes[0].opcoes[1].acrescimo; }), []);
});
prova('o fator: de 1 a 5 (1,2 = mais 20 %), duas casas', () => {
  for (const mau of [0.8, 6, '1.2', 1.234]) igual(doArtigo((a) => { a.opcoes[0].opcoes[1] = { nome: 'Grande', fator: mau }; }), [N('opcoes.0.opcoes.1.fator')]);
  igual(doArtigo((a) => { a.opcoes[0].opcoes[1] = { nome: 'Grande', fator: 1.2 }; }), []);
});
prova('acréscimo e fator ao mesmo tempo: esconde (o site só mostra um)', () => {
  igual(doArtigo((a) => { a.opcoes[0].opcoes[1] = { nome: 'Grande', acrescimo: 1, fator: 1.2 }; }), [N('opcoes.0.opcoes.1:acrescimo-e-fator')]);
  igual(doArtigo((a) => { a.opcoes[0].opcoes[1] = { nome: 'Grande', acrescimo: 1, fator: 1 }; }), []);
});
prova('a técnica de uma opção é uma da lista', () => {
  igual(doArtigo((a) => { a.opcoes[0].opcoes[1].tecnica = 'laser'; }), [N('opcoes.0.opcoes.1.tecnica')]);
  for (const t of R.TECNICAS) igual(doArtigo((a) => { a.opcoes[0].opcoes[1].tecnica = t; }), []);
});
prova('a primeira opção de cada grupo vem incluída: com acréscimo, avisa', () => {
  igual(doArtigo((a) => { a.opcoes[0].opcoes[0].acrescimo = 1; }), [A('opcoes.0.opcoes.0:incluida')]);
  igual(doArtigo((a) => { a.opcoes[0].opcoes[0] = { nome: 'Frente', fator: 1.1 }; }), [A('opcoes.0.opcoes.0:incluida')]);
  igual(doArtigo((a) => { a.opcoes[0].opcoes[0] = { nome: 'Frente', fator: 1 }; }), []);
});
prova('as áreas de impressão: pequenas listas «nome: texto»', () => {
  igual(doArtigo((a) => { delete a.areas; }), []);
  igual(doArtigo((a) => { a.areas = ['Frente']; }), [N('areas')]);
  igual(doArtigo((a) => { a.areas = { Frente: 29 }; }), [N('areas.0')]);
  igual(doArtigo((a) => { a.areas = { '': 'até 10 cm' }; }), [A('areas.0:vazia')]);
  igual(doArtigo((a) => { a.areas = { Frente: ' ' }; }), [A('areas.0:vazia')]);
  igual(doArtigo((a) => { a.areas = { Frente: 'x'.repeat(R.TAMANHOS.areaValor + 1) }; }), [A('areas.0:tamanho')]);
  igual(doArtigo((a) => { a.areas = { ['x'.repeat(R.TAMANHOS.areaNome + 1)]: 'até 10 cm' }; }), [A('areas.0:tamanho')]);
  igual(doArtigo((a) => { a.areas = Object.fromEntries(Array.from({ length: R.TAMANHOS.areas + 1 }, (_, i) => [`Área ${i}`, '10 cm'])); }), [A('areas:muitas')]);
  igual(doArtigo((a) => { a.areas = { 'Fren\tte': '10 cm' }; }), [A('areas.0:controlo')]);
});
prova('as especificações: as mesmas regras', () => {
  igual(doArtigo((a) => { a.especificacoes.Tamanhos = 3; }), [N('especificacoes.1')]);
  igual(doArtigo((a) => { a.especificacoes.Tamanhos = 'x'.repeat(R.TAMANHOS.specValor + 1); }), [A('especificacoes.1:tamanho')]);
  igual(doArtigo((a) => { for (let i = 0; i < R.TAMANHOS.especificacoes; i++) a.especificacoes[`Extra ${i}`] = 'sim'; }), [A('especificacoes:muitas')]);
});
prova('têxtil (família do grupo «Têxtil»): o «Tecido» com a composição em % é obrigatório (Reg. (UE) 1007/2011)', () => {
  igual(doArtigo((a) => { delete a.especificacoes.Tecido; }), [N('tecido')]);
  igual(doArtigo((a) => { delete a.especificacoes; }), [N('tecido')]);
  igual(doArtigo((a) => { a.especificacoes.Tecido = 'Algodão penteado'; }), [N('tecido')]);
  igual(doArtigo((a) => { a.especificacoes.Tecido = '65 % poliéster, 35 % algodão'; }), []);
  igual(doArtigo((a) => { a.especificacoes.Tecido = '100% algodão'; }), []);
  igual(doArtigo((a) => { delete a.especificacoes.Tecido; a.especificacoes.tecido = '100 % algodão'; }), []);
  assert.equal(doArtigo((a) => { delete a.especificacoes.Tecido; })[0].efeito, 'esconder');
  igual(daCaneta((a) => { delete a.especificacoes; }), []);
});
prova('as palavras que a lei só deixa usar com prova escondem o artigo (como na Dream Art)', () => {
  for (const [campo, texto, palavra] of [['descricao', 'Algodão orgânico, macio.', 'orgânico'], ['descricao', 'O mais vendido da loja.', 'mais vendido'], ['frase', 'Linha eco, para todos.', 'eco'],
    ['nome', 'Sustentável', 'Sustentável'], ['descricao', 'Papel 100 % reciclado.', 'reciclado'], ['frase', 'Amiga do ambiente.', 'Amiga do ambiente'], ['descricao', 'Garrafa biodegradável.', 'biodegradável'],
    ['descricao', 'Algodão certificado OEKO-TEX.', 'certificado'], ['titulo', 'Best-seller da casa', 'Best-seller'], ['frase', 'Eco-friendly.', 'Eco-friendly']]) {
    const ps = doArtigo((a) => { a[campo] = texto; });
    igual(ps, [N('alegacoes')]);
    assert.equal(ps[0].campo, campo);
    assert.ok(ps[0].mensagem.startsWith(`«${palavra}»`), `${ps[0].mensagem} (esperava «${palavra}»)`);
  }
  igual(doArtigo((a) => { a.opcoes[0].opcoes[1].nome = 'Papel reciclado'; }), [N('alegacoes')]);
  igual(doArtigo((a) => { a.especificacoes.Certificação = 'GOTS'; }), [N('alegacoes')]);
  for (const t of ['Preço económico, garrafas económicas.', 'Cor natural, 100 % algodão.', 'Ecoponto e ecrã táctil.', 'Mais em conta; a que mais pedem.', 'Recomendamos lavar à mão.']) igual(doArtigo((a) => { a.descricao = t; }), []);
});
prova('publicado: sim ou não (um rascunho não é um problema); a posição: inteiro de 0 a 9999', () => {
  igual(doArtigo((a) => { a.publicado = false; }), []);
  igual(doArtigo((a) => { a.publicado = true; }), []);
  igual(doArtigo((a) => { a.publicado = 'sim'; }), [A('publicado')]);
  for (const mau of [-1, 1.5, '3', 10000]) igual(doArtigo((a) => { a.ordem = mau; }), [A('ordem')]);
  igual(doArtigo((a) => { a.ordem = 0; }), []);
  igual(doArtigo((a) => { delete a.ordem; }), []);
});

/* ------------------------------------------------------------- todos os ficheiros -- */
grupo('os ficheiros (problemas)');
prova('os dados de ensaio, inteiros, não têm problemas', () => igual(R.problemas(dadosBase()), []));
prova('e lidos como texto (como a guarda e o Worker os lêem), também não', () => {
  const d = dadosBase();
  const t = Object.fromEntries(Object.entries(d).map(([k, v]) => [k, k === 'artigos' ? Object.fromEntries(Object.entries(v).map(([n, a]) => [n, R.serializar(a)])) : R.serializar(v)]));
  igual(R.problemas(t), []);
});
prova('um ficheiro que falta ou não se lê: bloqueia; uma chave que não vem não se confere', () => {
  for (const k of Object.keys(R.FICHEIROS)) {
    igual(R.problemas(dadosBase((d) => { d[k] = null; })).filter((p) => p.chave.startsWith(`${k}:`)), [`bloqueia ${k}:ausente`]);
    igual(R.problemas(dadosBase((d) => { d[k] = '{ partido'; })).filter((p) => p.chave.startsWith(`${k}:`)), [`bloqueia ${k}:ilegivel`]);
  }
  igual(R.problemas({ artigos: { classica: artigoBase() } }), []);
  igual(R.problemas({}), []);
});
prova('um artigo que não se lê, que não é um artigo, com um nome de ficheiro mau, ou com outro slug: bloqueia', () => {
  igual(R.problemas({ artigos: { classica: '{' } }), ['bloqueia artigo:classica:ilegivel']);
  igual(R.problemas({ artigos: { classica: '[1]' } }), ['bloqueia artigo:classica:forma']);
  igual(R.problemas({ artigos: { Classica: { ...artigoBase(), slug: 'Classica' } } }), ['bloqueia artigo:Classica:endereco']);
  igual(R.problemas({ artigos: { classica: { ...artigoBase(), slug: 'outra' } } }), ['bloqueia artigo:classica:slug']);
  igual(R.problemas({ artigos: { classica: { ...artigoBase(), slug: undefined } } }), ['bloqueia artigo:classica:slug']);
  igual(R.problemas({ artigos: { classica: null } }), []);
});
prova('o artigo é conferido com as famílias e a paleta dos outros ficheiros', () => {
  igual(R.problemas(dadosBase((d) => { d.artigos.classica.familia = 'canecas'; })), [N('familia'), 'avisa familias:t-shirts:sem-artigos', 'avisa kits:arranque:fora:classica']);
  igual(R.problemas(dadosBase((d) => { d.artigos.classica.cores.push('rosa'); })), [N('cor-desconhecida:rosa'), 'avisa cores:rosa:em-uso']);
});
prova('um artigo a chegar ao limite do painel: lembrete', () => {
  const ps = R.problemas({ artigos: { classica: { ...artigoBase(), descricao: 'x'.repeat(60 * 1024) } } });
  igual(ps, [A('descricao:tamanho'), A('tecto')]);
  assert.equal(ps.find((p) => p.chave.endsWith(':tecto')).lembrete, true);
});

/* ------------------------------------------------------------- a marca -- */
grupo('os dados da marca (problemasDaMarca)');
const M = (s) => `bloqueia marca:${s}`;
prova('os dados de ensaio não têm problemas', () => igual(daMarca(), []));
prova('não é um objecto: bloqueia', () => { igual(R.problemasDaMarca(null), [M('forma')]); igual(R.problemasDaMarca([]), [M('forma')]); });
prova('os textos de todas as páginas são obrigatórios (bloqueia)', () => {
  for (const k of ['nome', 'assinatura', 'servicos', 'descricao', 'entrega', 'portes']) {
    igual(daMarca((m) => { delete m[k]; }), [M(`${k}:vazio`)]);
    igual(daMarca((m) => { m[k] = ' '; }), [M(`${k}:vazio`)]);
    igual(daMarca((m) => { m[k] = 5; }), [M(`${k}:tipo`)]);
  }
  igual(daMarca((m) => { m.assinatura = 'x'.repeat(R.TAMANHOS.assinatura + 1); }), ['avisa marca:assinatura:tamanho']);
});
prova('o atendimento é opcional (texto)', () => {
  igual(daMarca((m) => { m.atendimento = ''; }), []);
  igual(daMarca((m) => { m.atendimento = 5; }), ['avisa marca:atendimento:tipo']);
  igual(daMarca((m) => { m.atendimento = 'x'.repeat(R.TAMANHOS.atendimento + 1); }), ['avisa marca:atendimento:tamanho']);
});
prova('demo é sim ou não; o endereço do site começa por https:// e acaba em /', () => {
  igual(daMarca((m) => { m.demo = 'true'; }), [M('demo')]);
  igual(daMarca((m) => { delete m.demo; }), [M('demo')]);
  igual(daMarca((m) => { m.endereco = 'http://exemplo.pt'; }), ['avisa marca:endereco']);
  igual(daMarca((m) => { m.endereco = ''; }), []);
});
prova('o WhatsApp: 351 e 9 algarismos (vazio é lembrete)', () => {
  for (const mau of ['966635602', '+351966635602', '351 966 635 602', '351166635602', '35196663560', 3519666356]) igual(daMarca((m) => { m.whatsapp = mau; }), [M('whatsapp')]);
  igual(daMarca((m) => { m.whatsapp = '351212345678'; }), []);
  const ps = daMarca((m) => { m.whatsapp = ''; });
  igual(ps, ['avisa marca:whatsapp:vazio']);
  assert.equal(ps[0].lembrete, true);
});
prova('o telefone: um número português (vai para um «tel:»)', () => {
  for (const mau of ['123', '(21) 234 5678', '966635602x', '+44 20 7946 0958', 966635602]) igual(daMarca((m) => { m.telefone = mau; }), [M('telefone')]);
  for (const bom of ['966 635 602', '+351 212 345 678', '212-345-678', '']) igual(daMarca((m) => { m.telefone = bom; }), []);
});
prova('o e-mail: válido quando existe', () => {
  for (const mau of ['x@', 'encomendas@exemplo', 'a b@exemplo.pt']) igual(daMarca((m) => { m.email = mau; }), [M('email')]);
  igual(daMarca((m) => { m.email = ''; }), []);
});
prova('as redes: o endereço completo da página, no domínio da rede', () => {
  igual(daMarca((m) => { m.redes.instagram = 'instagram.com/menta'; }), [M('redes.instagram')]);
  igual(daMarca((m) => { m.redes.facebook = 'https://www.instagram.com/menta'; }), [M('redes.facebook')]);
  igual(daMarca((m) => { m.redes.instagram = 'https://www.instagram.com/menta" onmouseover="x'; }), [M('redes.instagram')]);
  igual(daMarca((m) => { m.redes.linkedin = 'https://www.linkedin.com/company/menta-conecta'; }), []);
  igual(daMarca((m) => { m.redes.facebook = 'https://facebook.com/profile.php?id=123'; }), []);
  igual(daMarca((m) => { m.redes = []; }), [M('redes')]);
  igual(daMarca((m) => { delete m.redes; }), []);
});
prova('o horário: linhas com dias de 1 a 7 e horas «09:00» (sem horas é por marcação)', () => {
  igual(daMarca((m) => { m.horario = 'seg-sex'; }), [M('horario')]);
  for (const dias of [[0], [8], [], ['seg'], [1.5]]) igual(daMarca((m) => { m.horario[0].dias = dias; }), [M('horario.0.dias')]);
  for (const [abre, fecha] of [['9:00', '18:30'], ['09:00', '24:00'], ['09:00', ''], ['09h00', '18h30'], ['18:30', '09:00'], ['09:00', '09:00']]) igual(daMarca((m) => { m.horario[0].abre = abre; m.horario[0].fecha = fecha; }), [M('horario.0.horas')]);
  igual(daMarca((m) => { m.horario = [5]; }), [M('horario.0')]);
  igual(daMarca((m) => { m.horario[0].dias = [1, 1, 2]; }), ['avisa marca:horario.0.dias:repetidos']);
  igual(daMarca((m) => { m.horario = [{ dias: [6] }]; }), []);
  igual(daMarca((m) => { m.horario.push({ dias: [7], abre: '10:00', fecha: '13:00' }); }), []);
});
prova('o horário: manhã e tarde no mesmo dia está bem; horas que se cruzam avisam', () => {
  igual(daMarca((m) => { m.horario = [{ dias: [1, 2, 3, 4, 5], abre: '09:00', fecha: '13:00' }, { dias: [1, 2, 3, 4, 5], abre: '14:00', fecha: '18:30' }]; }), []);
  igual(daMarca((m) => { m.horario = [{ dias: [1, 2, 3, 4, 5], abre: '09:00', fecha: '13:00' }, { dias: [5, 6], abre: '12:00', fecha: '18:30' }]; }), ['avisa marca:horario:cruzado']);
  igual(daMarca((m) => { m.horario.push({ dias: [5] }); }), ['avisa marca:horario:cruzado']);
  const vazio = daMarca((m) => { m.horario = []; });
  igual(vazio, ['avisa marca:horario:vazio']);
  assert.equal(vazio[0].lembrete, true);
  igual(daMarca((m) => { m.horario = Array.from({ length: 8 }, (_, i) => ({ dias: [(i % 7) + 1] })); }), ['avisa marca:horario:muitas']);
});
prova('o NIF (quando existe) e o código postal', () => {
  igual(daMarca((m) => { m.nif = '500000000'; }), []);
  igual(daMarca((m) => { m.nif = '500 000 000'; }), []);
  // O de teste (123456789) e os começados por 4 (menos 45) são recusados, como no legal-comum.
  for (const mau of ['123456789', '400000008', '123456780', '023456789', '12345678', 'PT123456789']) igual(daMarca((m) => { m.nif = mau; }), [M('nif')]);
  igual(daMarca((m) => { m.codigoPostal = '1000-001'; }), []);
  for (const mau of ['1000', '1000001', '1000-01']) igual(daMarca((m) => { m.codigoPostal = mau; }), ['avisa marca:codigoPostal']);
});
prova('com o site a sério (demo: false), a firma, o NIF, a morada e o e-mail são obrigatórios (bloqueia)', () => {
  igual(daMarca((m) => { m.demo = false; }), [M('firma:producao'), M('nif:producao'), M('morada:producao')]);
  igual(daMarca((m) => { m.demo = false; m.email = ''; }), [M('firma:producao'), M('nif:producao'), M('morada:producao'), M('email:producao')]);
  const completa = (m) => { m.demo = false; m.firma = 'Menta Conecta, Lda.'; m.nif = '500000000'; m.morada = 'Rua das Flores, 1'; m.codigoPostal = '1000-001'; };
  igual(daMarca(completa), []);
  igual(daMarca((m) => { completa(m); m.codigoPostal = ''; }), [M('morada:producao')]);
  igual(daMarca((m) => { completa(m); m.localidade = ''; }), [M('morada:producao')]);
  igual(daMarca(), []);
  igual(daMarca((m) => { m.email = ''; }), []);
  igual(daMarca(undefined, { producao: true }), [M('firma:producao'), M('nif:producao'), M('morada:producao')]);
  igual(daMarca((m) => { m.demo = false; }, { producao: false }), []);
});
prova('o IVA: 23, 13, 6 ou 0', () => {
  for (const bom of [23, 13, 6, 0]) igual(daMarca((m) => { m.iva = bom; }), []);
  for (const mau of [22, '23', 23.5, -6]) igual(daMarca((m) => { m.iva = mau; }), [M('iva')]);
  igual(daMarca((m) => { delete m.iva; }), []);
  igual(daMarca((m) => { m.iva = null; }), []);
});
prova('as mensagens do WhatsApp: as três escritas, a das dúvidas com «{produto}», o aviso de teste', () => {
  igual(daMarca((m) => { delete m.mensagens; }), [M('mensagens')]);
  igual(daMarca((m) => { m.mensagens.geral = ''; }), [M('mensagens.geral:vazio')]);
  igual(daMarca((m) => { m.mensagens.duvida = 'Olá! Tenho uma dúvida.'; }), ['avisa marca:mensagens.duvida:produto']);
  igual(daMarca((m) => { delete m.mensagens.teste; }), [M('mensagens.teste')]);
  igual(daMarca((m) => { m.mensagens.teste = ''; }), []);
  igual(daMarca((m) => { m.mensagens.maquete = 'x'.repeat(R.TAMANHOS.mensagem + 1); }), ['avisa marca:mensagens.maquete:tamanho']);
});
prova('as palavras que a lei só deixa usar com prova param a publicação (como na Dream Art)', () => {
  igual(daMarca((m) => { m.descricao = 'Brindes sustentáveis com a sua marca.'; }), [M('descricao:alegacao')]);
  igual(daMarca((m) => { m.mensagens.geral = 'Olá! Quero os mais vendidos.'; }), [M('mensagens.geral:alegacao')]);
});

/* ------------------------------------------------------------- as famílias -- */
grupo('as famílias (problemasDasFamilias)');
const F = (s) => `bloqueia familias:t-shirts${s}`;
const FA = (s) => `avisa familias:t-shirts${s}`;
prova('as famílias de ensaio não têm problemas', () => igual(dasFamilias(), []));
prova('não é uma lista, ou está vazia: bloqueia', () => {
  igual(R.problemasDasFamilias({}), ['bloqueia familias:forma']);
  igual(R.problemasDasFamilias([]), ['bloqueia familias:forma']);
});
prova('cada família tem um slug válido e único', () => {
  igual(dasFamilias((f) => { delete f[0].slug; }), ['bloqueia familias:0:forma']);
  igual(dasFamilias((f) => { f[0].slug = 'T Shirts'; }), ['bloqueia familias:0:forma']);
  igual(dasFamilias((f) => { f[0] = 'x'; }), ['bloqueia familias:0:forma']);
  igual(dasFamilias((f) => { f[1] = { ...f[0] }; }), ['bloqueia familias:t-shirts:repetida']);
});
prova('o nome, o grupo, a frase e o título são obrigatórios', () => {
  igual(dasFamilias((f) => { f[0].nome = ''; }), [F('.nome:vazio')]);
  igual(dasFamilias((f) => { delete f[0].grupo; }), [F('.grupo:vazio')]);
  igual(dasFamilias((f) => { f[0].frase = 5; }), [F('.frase:tipo')]);
  igual(dasFamilias((f) => { delete f[0].h1; }), [F('.h1')]);
  igual(dasFamilias((f) => { f[0].h1.destaque = ''; }), [F('.h1.destaque:vazio')]);
  igual(dasFamilias((f) => { f[0].nome = 'x'.repeat(R.TAMANHOS.familiaNome + 1); }), [FA('.nome:tamanho')]);
  igual(dasFamilias((f) => { f[0].singular = 5; }), [F('.singular:tipo')]);
});
prova('o ícone e os desenhos são da lista; as cores da capa, em #RRGGBB', () => {
  igual(dasFamilias((f) => { f[0].icone = 'nave'; }), [F('.icone')]);
  igual(dasFamilias((f) => { delete f[0].icone; }), [F('.icone')]);
  for (const i of R.ICONES_FAMILIA) igual(dasFamilias((f) => { f[0].icone = i; }), []);
  igual(dasFamilias((f) => { f[0].desenhos = ['nave']; }), [F('.desenhos')]);
  igual(dasFamilias((f) => { f[0].desenhos = []; }), [F('.desenhos')]);
  igual(dasFamilias((f) => { f[0].desenhos = ['tshirt', 'polo', 'bone', 'tshirt']; }), [FA('.desenhos:muitos')]);
  igual(dasFamilias((f) => { f[0].coresCapa = ['red', '#000000']; }), [F('.coresCapa')]);
  igual(dasFamilias((f) => { f[0].coresCapa = ['#FFFFFF']; }), [F('.coresCapa')]);
  igual(dasFamilias((f) => { f[0].coresCapa = ['#FFFFFF;}', '#000000']; }), [F('.coresCapa')]);
  igual(dasFamilias((f) => { f[0].coresCapa = ['#FFFFFF', '#000000', '#111111', '#222222']; }), [FA('.coresCapa:muitas')]);
});
prova('o artigo («o»/«a»), as vantagens e os filtros', () => {
  igual(dasFamilias((f) => { f[0].artigo = 'os'; }), [FA('.artigo')]);
  igual(dasFamilias((f) => { f[0].vantagens = 'Rápido'; }), [F('.vantagens')]);
  igual(dasFamilias((f) => { f[0].vantagens = ['', 'Rápido']; }), [FA('.vantagens.0:vazia')]);
  igual(dasFamilias((f) => { f[0].vantagens = Array.from({ length: R.TAMANHOS.vantagens + 1 }, (_, i) => `Vantagem ${i}`); }), [FA('.vantagens:muitas')]);
  igual(dasFamilias((f) => { f[0].filtros = { cor: 'sim' }; }), [FA('.filtros')]);
  igual(dasFamilias((f) => { f[0].filtros = { preco: true }; }), [FA('.filtros')]);
  igual(dasFamilias((f) => { delete f[0].filtros; }), []);
});
prova('as dúvidas da família: pergunta e resposta escritas', () => {
  igual(dasFamilias((f) => { f[0].duvidas = 'x'; }), [F('.duvidas')]);
  igual(dasFamilias((f) => { f[0].duvidas = [{ p: '', r: 'Sim.' }]; }), [F('.duvidas.0.p:vazio')]);
  igual(dasFamilias((f) => { f[0].duvidas = [3]; }), [F('.duvidas.0')]);
  igual(dasFamilias((f) => { f[0].duvidas = Array.from({ length: R.TAMANHOS.duvidasFamilia + 1 }, (_, i) => ({ p: `P${i}?`, r: 'R.' })); }), [FA('.duvidas:muitas')]);
  igual(dasFamilias((f) => { f[0].duvidas[0].r = 'x'.repeat(R.TAMANHOS.resposta + 1); }), [FA('.duvidas.0.r:tamanho')]);
});
prova('as palavras que a lei só deixa usar com prova param a publicação', () => {
  igual(dasFamilias((f) => { f[0].frase = 'T-shirts de algodão orgânico.'; }), [F('.frase:alegacao')]);
  igual(dasFamilias((f) => { f[0].vantagens[0] = 'Tinta ecológica'; }), [F('.vantagens.0:alegacao')]);
});
prova('uma família sem artigos no site: lembrete (sai do site, não pára nada)', () => {
  const ps = dasFamilias(undefined, { comArtigos: new Set(['t-shirts']) });
  igual(ps, ['avisa familias:canetas:sem-artigos']);
  assert.equal(ps[0].lembrete, true);
});

/* ------------------------------------------------------------- as cores -- */
grupo('a paleta das cores (problemasDasCores)');
const C = (s) => `bloqueia cores:${s}`;
prova('as cores de ensaio não têm problemas', () => igual(dasCores(), []));
prova('não é um objecto, ou está vazia: bloqueia', () => { igual(R.problemasDasCores([]), [C('forma')]); igual(R.problemasDasCores({}), [C('forma')]); });
prova('cada cor: chave válida, nome, #RRGGBB e um grupo da lista', () => {
  igual(dasCores((c) => { c.Azul = COR('Azul', '#0000FF', 'azuis'); }), [C('Azul:chave')]);
  igual(dasCores((c) => { c.preto = '#000000'; }), [C('preto:forma')]);
  igual(dasCores((c) => { c.preto.nome = ''; }), [C('preto.nome')]);
  for (const mau of ['black', '#FFF', '#1B1D24;', 1]) igual(dasCores((c) => { c.preto.hex = mau; }), [C('preto.hex')]);
  igual(dasCores((c) => { c.preto.grupo = 'cinzentos'; }), [C('preto.grupo')]);
  for (const g of R.CHAVES_GRUPOS_COR) igual(dasCores((c) => { c.preto.grupo = g; }), []);
  igual(dasCores((c) => { c.preto.nome = 'x'.repeat(R.TAMANHOS.corNome + 1); }), ['avisa cores:preto.nome:tamanho']);
  igual(dasCores((c) => { c.preto.nome = 'Preto reciclado'; }), [C('preto.nome:alegacao')]);
});
prova('duas cores com o mesmo nome: avisa', () => igual(dasCores((c) => { c.natural.nome = 'branco'; }), ['avisa cores:natural.nome:repetido']));
prova('uma cor em uso não pode sair da paleta (avisa na paleta; no artigo, a cor sai)', () => {
  const ps = R.problemas(dadosBase((d) => { delete d.cores['azul-royal']; }));
  igual(ps, ['avisa cores:azul-royal:em-uso', N('cor-desconhecida:azul-royal')]);
  assert.ok(ps[0].mensagem.includes('T-shirt Clássica'));
  const pack = R.problemas(dadosBase((d) => { delete d.cores.branco; }));
  igual(pack, ['avisa cores:branco:em-uso', N('cor-desconhecida:branco'), 'neutraliza artigo:tejo:cor-desconhecida:branco', 'neutraliza kits:arranque.pecas.1.cor']);
  assert.ok(pack[0].mensagem.includes('pack Arranque'));
  igual(R.problemas(dadosBase((d) => { delete d.cores.natural; })), []);
});

/* ------------------------------------------------------------- os packs -- */
grupo('os packs (problemasDosPacks)');
const K = (s) => `neutraliza kits:arranque${s}`;
prova('os packs de ensaio não têm problemas; sem packs também não', () => { igual(dosPacks(), []); igual(R.problemasDosPacks([]), []); });
prova('não é uma lista: bloqueia; um slug mau ou repetido: bloqueia', () => {
  igual(R.problemasDosPacks({}), ['bloqueia kits:forma']);
  igual(dosPacks((k) => { k[0].slug = 'Arranque!'; }), ['bloqueia kits:0:forma']);
  igual(dosPacks((k) => { k.push(copia(k[0])); }), ['bloqueia kits:arranque:repetido']);
});
prova('um pack com um erro fica escondido (neutraliza), com o slug do pack', () => {
  const ps = dosPacks((k) => { k[0].nome = ''; });
  igual(ps, [K('.nome')]);
  assert.equal(ps[0].efeito, 'esconder'); assert.equal(ps[0].pack, 'arranque'); assert.equal(ps[0].ficheiro, 'dados/kits.json'); assert.equal(ps[0].campo, '0.nome');
  igual(dosPacks((k) => { delete k[0].frase; }), [K('.frase')]);
  igual(dosPacks((k) => { k[0].nome = 'x'.repeat(R.TAMANHOS.packNome + 1); }), ['avisa kits:arranque.nome:tamanho']);
});
prova('as peças: de 1 a 8, de artigos que existem, quantidade de 1 a 100, numa cor que o artigo tem', () => {
  igual(dosPacks((k) => { k[0].pecas = []; }), [K('.pecas')]);
  igual(dosPacks((k) => { k[0].pecas = Array.from({ length: 9 }, () => ({ produto: 'classica', quantidade: 1, cor: 'preto' })); }), ['avisa kits:arranque.pecas:muitas']);
  igual(dosPacks((k) => { k[0].pecas[0].produto = 'inexistente'; }), [K('.pecas.0.produto')]);
  igual(dosPacks((k) => { k[0].pecas[0] = 'classica'; }), [K('.pecas.0')]);
  for (const mau of [0, 1.5, '2', 101]) igual(dosPacks((k) => { k[0].pecas[0].quantidade = mau; }), [K('.pecas.0.quantidade')]);
  igual(dosPacks((k) => { k[0].pecas[1].cor = 'azul-royal'; }), [K('.pecas.1.cor')]);
  igual(dosPacks((k) => { delete k[0].pecas[1].cor; }), [K('.pecas.1.cor')]);
  igual(dosPacks((k) => { k[0].pecas[0].produto = 'inexistente'; }, null), []);
});
prova('o preço por pack (> 0, duas casas) e o mínimo de packs (inteiro ≥ 1)', () => {
  for (const mau of [0, -1, '39.9', 39.999]) igual(dosPacks((k) => { k[0].preco = mau; }), [K('.preco')]);
  for (const mau of [0, 2.5, '5']) igual(dosPacks((k) => { k[0].minimo = mau; }), [K('.minimo')]);
  igual(dosPacks((k) => { k[0].minimo = 1; }), []);
});
prova('o que inclui, o destaque e o publicado', () => {
  igual(dosPacks((k) => { k[0].inclui = 'Maquete'; }), [K('.inclui')]);
  igual(dosPacks((k) => { k[0].inclui = ['']; }), ['avisa kits:arranque.inclui.0:vazia']);
  igual(dosPacks((k) => { k[0].inclui = Array.from({ length: R.TAMANHOS.inclui + 1 }, (_, i) => `Linha ${i}`); }), ['avisa kits:arranque.inclui:muitas']);
  igual(dosPacks((k) => { k[0].destaque = 'sim'; }), ['avisa kits:arranque.destaque']);
  igual(dosPacks((k) => { k[0].destaque = true; k[0].publicado = false; }), []);
});
prova('as palavras que a lei só deixa usar com prova escondem o pack', () => igual(dosPacks((k) => { k[0].frase = 'Brindes sustentáveis.'; }), [K(':alegacoes')]));
prova('um pack com um artigo que não está no site (rascunho, ou escondido por um erro): lembrete', () => {
  const ps = R.problemas(dadosBase((d) => { d.artigos.tejo.publicado = false; }));
  igual(ps, ['avisa kits:arranque:fora:tejo', 'avisa familias:canetas:sem-artigos']);
  assert.ok(ps.every((p) => p.lembrete === true));
  igual(R.problemas(dadosBase((d) => { d.artigos.tejo.desenho = 'nave'; })), ['avisa kits:arranque:fora:tejo', 'avisa familias:canetas:sem-artigos', 'neutraliza artigo:tejo:desenho']);
});

/* ------------------------------------------------------------- as dúvidas -- */
grupo('as dúvidas (problemasDasDuvidas)');
const D = (s) => `bloqueia duvidas:${s}`;
prova('as dúvidas de ensaio não têm problemas', () => igual(dasDuvidas(), []));
prova('não é uma lista: bloqueia; uma dúvida sem pergunta ou resposta: bloqueia', () => {
  igual(R.problemasDasDuvidas({}), [D('forma')]);
  igual(dasDuvidas((d) => { d[0] = 'x'; }), [D('0')]);
  igual(dasDuvidas((d) => { d[0].p = ''; }), [D('0.p:vazio')]);
  igual(dasDuvidas((d) => { delete d[0].r; }), [D('0.r:vazio')]);
});
prova('os tamanhos e as palavras que a lei só deixa usar com prova', () => {
  igual(dasDuvidas((d) => { d[0].p = 'x'.repeat(R.TAMANHOS.pergunta + 1); }), ['avisa duvidas:0.p:tamanho']);
  igual(dasDuvidas((d) => { d[0].r = 'x'.repeat(R.TAMANHOS.resposta + 1); }), ['avisa duvidas:0.r:tamanho']);
  igual(dasDuvidas((d) => { for (let i = 0; i < R.TAMANHOS.duvidas; i++) d.push({ p: `P${i}?`, r: 'R.' }); }), ['avisa duvidas:muitas']);
  igual(dasDuvidas((d) => { d[0].r = 'São todos certificados.'; }), [D('0.r:alegacao')]);
});

/* ------------------------------------------------------------- a neutralização -- */
grupo('a cópia que o gerador lê (neutralizar e paraOSite)');
prova('um artigo com um erro sai do site (publicado: false), na cópia; os ficheiros não mudam', () => {
  const d = dadosBase((x) => { x.artigos.tejo.desenho = 'nave'; });
  const antes = copia(d);
  const n = R.neutralizar(d, R.problemas(d));
  assert.equal(n.artigos.tejo.publicado, false);
  assert.equal(n.artigos.classica.publicado, undefined);
  assert.deepEqual(d, antes);
  assert.equal(n.mudou, true);
  assert.deepEqual(n.efeitos.map((e) => [e.tipo, e.slug, e.efeitos.join()]), [['artigo', 'tejo', 'esconder']]);
  assert.equal(R.descreverEfeitos(n.efeitos[0]), 'escondido do site');
  assert.equal(n.efeitos[0].nome, 'Caneta Tejo');
});
prova('uma cor que não está na paleta sai só do artigo (as outras ficam)', () => {
  const d = dadosBase((x) => { x.artigos.classica.cores = ['branco', 'azul-roial', 'preto', 'rosa']; });
  const n = R.neutralizar(d, R.problemas(d));
  assert.deepEqual(n.artigos.classica.cores, ['branco', 'preto']);
  assert.equal(n.artigos.classica.publicado, undefined);
  assert.deepEqual(n.efeitos.map((e) => [e.slug, e.efeitos.join()]), [['classica', 'sem_cor']]);
  assert.deepEqual(d.artigos.classica.cores, ['branco', 'azul-roial', 'preto', 'rosa']);
});
prova('um pack com um erro sai do site; um rascunho não conta como efeito (já estava fora)', () => {
  const d = dadosBase((x) => { x.kits[0].preco = 0; x.artigos.tejo.publicado = false; x.artigos.tejo.desenho = 'nave'; });
  const n = R.neutralizar(d, R.problemas(d));
  assert.equal(n.kits[0].publicado, false);
  assert.equal(d.kits[0].publicado, undefined);
  assert.deepEqual(n.efeitos.map((e) => [e.tipo, e.slug]), [['pack', 'arranque']]);
  const nada = R.neutralizar(dadosBase(), R.problemas(dadosBase()));
  assert.equal(nada.mudou, false); assert.deepEqual(nada.efeitos, []);
});
prova('paraOSite: os rascunhos não vão; a família que fica sem artigos também não; nem o pack que os usa', () => {
  const d = dadosBase((x) => { x.artigos.tejo.publicado = false; });
  const s = R.paraOSite(d);
  assert.deepEqual(s.artigos.map((a) => a.slug), ['classica']);
  assert.deepEqual(s.familias.map((f) => f.slug), ['t-shirts']);
  assert.deepEqual(s.kits, []);
  assert.deepEqual(s.fora, { artigos: [{ slug: 'tejo', familia: 'canetas' }], familias: ['canetas'], kits: ['arranque'] });
  const tudo = R.paraOSite(dadosBase());
  assert.deepEqual([tudo.artigos.length, tudo.familias.length, tudo.kits.length], [2, 2, 1]);
  assert.deepEqual(tudo.fora, { artigos: [], familias: [], kits: [] });
});
prova('paraOSite: um pack numa cor que o artigo perdeu (sem_cor) não vai; com o mesmo neutro dá o mesmo', () => {
  const d = dadosBase((x) => { delete x.cores.branco; });
  const n = R.neutralizar(d, R.problemas(d));
  const s = R.paraOSite(d, n);
  assert.deepEqual(s.kits, []);
  assert.deepEqual(s.artigos.find((a) => a.slug === 'tejo').cores, ['preto']);
  assert.deepEqual(R.paraOSite(d), s);
});
prova('paraOSite: pela posição e, com a mesma, pelo slug; sem posição vale 500; família que não existe não vai', () => {
  const d = dadosBase((x) => {
    x.artigos.tejo.ordem = 1;
    x.artigos.douro = { ...canetaBase(), slug: 'douro', titulo: 'Caneta Douro', ordem: 1 };
    x.artigos.sado = { ...canetaBase(), slug: 'sado', titulo: 'Caneta Sado' }; delete x.artigos.sado.ordem;
    x.artigos.mondego = { ...canetaBase(), slug: 'mondego', ordem: 0 };
  });
  assert.deepEqual(R.paraOSite(d).artigos.map((a) => a.slug), ['mondego', 'classica', 'douro', 'tejo', 'sado']);
  const sem = dadosBase((x) => { x.artigos.tejo.familia = 'canecas'; });
  assert.deepEqual(R.paraOSite(sem, { artigos: R.neutralizar(sem, []).artigos, kits: sem.kits }).artigos.map((a) => a.slug), ['classica']);
});

/* ------------------------------------------------------------- ajudantes -- */
grupo('os ajudantes que o painel também usa');
prova('serializar: cada ficheiro de dados/ volta a gravar-se igual, byte a byte (JSON com um espaço, a terminação de cada um)', () => {
  const { dados } = lerDados(RAIZ);
  for (const k of Object.keys(R.FICHEIROS)) assert.equal(R.serializar(JSON.parse(dados[k]), R.terminacaoDe(dados[k])), dados[k], k);
  for (const [n, t] of Object.entries(dados.artigos)) assert.equal(R.serializar(JSON.parse(t), R.terminacaoDe(t)), t, n);
  assert.equal(R.terminacaoDe('{}'), ''); assert.equal(R.terminacaoDe('{}\n'), '\n'); assert.equal(R.terminacaoDe(null), '');
  assert.equal(R.serializar({ a: [1] }), '{\n "a": [\n  1\n ]\n}\n');
  assert.equal(R.serializar({ a: 'ã' }, ''), '{\n "a": "ã"\n}');
});
prova('gerarSlug: minúsculas, sem acentos, hífenes; repetido leva -2, -3', () => {
  assert.equal(R.gerarSlug('T-shirt Clássica'), 't-shirt-classica');
  assert.equal(R.gerarSlug('  Ação & Reação!! '), 'acao-reacao');
  assert.equal(R.gerarSlug('Roll-up 85 × 200'), 'roll-up-85-200');
  assert.equal(R.gerarSlug('Clássica', ['classica']), 'classica-2');
  assert.equal(R.gerarSlug('Clássica', new Set(['classica', 'classica-2'])), 'classica-3');
  assert.equal(R.gerarSlug(''), 'artigo');
  assert.equal(R.gerarSlug(null), 'artigo');
  const longo = R.gerarSlug('Uma t-shirt com um nome muito comprido '.repeat(5), Array.from({ length: 12 }, (_, i) => (i ? `x-${i}` : 'x')));
  assert.ok(R.slugValido(longo), longo);
});
prova('slugValido', () => {
  for (const bom of ['roll-up', 'aluminio-500', 't-shirts', 'a']) assert.ok(R.slugValido(bom), bom);
  for (const mau of ['Roll', 'a--b', '-a', 'a-', 'a b', 'ação', '', 'x'.repeat(81), 5]) assert.ok(!R.slugValido(mau), String(mau));
});
prova('nifValido, numeroPortugues, eTelemovel, whatsappValido, emailValido, corValida, horaValida, redeValida', () => {
  assert.ok(R.nifValido('500000000') && R.nifValido('500 000 000') && R.nifValido(500000000) && !R.nifValido('123456789'));
  assert.ok(!R.nifValido('123456780') && !R.nifValido('023456789') && !R.nifValido(''));
  assert.equal(R.numeroPortugues('+351 966 635 602'), '966635602');
  assert.equal(R.numeroPortugues('00351212345678'), '212345678');
  assert.equal(R.numeroPortugues('123456789'), null);
  assert.ok(R.eTelemovel('966 635 602') && !R.eTelemovel('212 345 678'));
  assert.ok(R.whatsappValido('351966635602') && !R.whatsappValido('966635602'));
  assert.ok(R.emailValido('encomendas@mentapersonalizados.pt') && !R.emailValido('encomendas@'));
  assert.ok(R.corValida('#1b1D24') && !R.corValida('#1B1D2') && !R.corValida('1B1D24'));
  assert.ok(R.horaValida('00:00') && R.horaValida('23:59') && !R.horaValida('24:00') && !R.horaValida('9:00'));
  assert.ok(R.redeValida('instagram', 'https://www.instagram.com/menta.conecta/') && !R.redeValida('tiktok', 'https://www.tiktok.com/@menta'));
});
prova('noSite, ordemDe, nomeDoArtigo, familiasDe, mesmoValor, alegacaoDe', () => {
  assert.ok(R.noSite({}) && R.noSite({ publicado: true }) && !R.noSite({ publicado: false }) && !R.noSite(null));
  assert.equal(R.ordemDe({ ordem: 3 }), 3); assert.equal(R.ordemDe({}), R.POR_OMISSAO.ordem); assert.equal(R.ordemDe({ ordem: '3' }), R.POR_OMISSAO.ordem);
  assert.equal(R.nomeDoArtigo(artigoBase(), 'classica'), 'T-shirt Clássica');
  assert.equal(R.nomeDoArtigo({ nome: 'Clássica' }, 'classica'), 'Clássica');
  assert.equal(R.nomeDoArtigo({}, 'classica'), 'classica');
  assert.deepEqual(R.familiasDe(familiasBase()), [{ slug: 't-shirts', nome: 'T-shirts', grupo: 'Têxtil' }, { slug: 'canetas', nome: 'Canetas', grupo: 'Escrita e escritório' }]);
  assert.equal(R.familiasDe('{'), null);
  assert.ok(R.mesmoValor({ a: 1, b: null }, { a: 1 }) && !R.mesmoValor([1], [1, 2]));
  assert.equal(R.alegacaoDe('Algodão Orgânico.'), 'Orgânico');
  assert.equal(R.alegacaoDe('Preço económico'), null);
});
prova('coresEmUso: as cores dos artigos (também os rascunhos) e as das peças dos packs', () => {
  const u = R.coresEmUso(dadosBase((x) => { x.artigos.tejo.publicado = false; }));
  assert.deepEqual([...u.keys()].sort(), ['azul-royal', 'branco', 'preto']);
  assert.deepEqual(u.get('branco'), ['T-shirt Clássica', 'Caneta Tejo', 'pack Arranque']);
  assert.deepEqual(R.coresEmUso({}).size, 0);
});
prova('textoDoHorario: o horário de 9 nov 2026 dá exactamente o texto que o site mostrava (o antigo horarioTexto)', () => {
  assert.deepEqual(R.textoDoHorario([{ dias: [1, 2, 3, 4, 5], abre: '09:00', fecha: '18:30' }]), [{ dias: 'Segunda a sexta', horas: '9h00 – 18h30' }]);
  const { dados } = lerDados(RAIZ);
  assert.equal(JSON.parse(dados.marca).horarioTexto, undefined, 'o texto do horário sai do horário: horarioTexto já não existe');
});
prova('textoDoHorario: os dias por extenso, as horas, «Por marcação», manhã e tarde', () => {
  const T = (h) => R.textoDoHorario(h);
  assert.deepEqual(T([{ dias: [6, 7], abre: '10:00', fecha: '13:00' }]), [{ dias: 'Sábado e domingo', horas: '10h00 – 13h00' }]);
  assert.deepEqual(T([{ dias: [5, 3, 1], abre: '08:05', fecha: '20:00' }]), [{ dias: 'Segunda, quarta e sexta', horas: '8h05 – 20h00' }]);
  assert.deepEqual(T([{ dias: [1, 2, 3, 4, 5, 6, 7], abre: '09:00', fecha: '21:00' }])[0].dias, 'Todos os dias');
  assert.deepEqual(T([{ dias: [1, 2, 3, 5, 6], abre: '09:00', fecha: '18:00' }])[0].dias, 'Segunda a quarta, sexta e sábado');
  assert.deepEqual(T([{ dias: [4], abre: '09:00', fecha: '12:00' }])[0].dias, 'Quinta');
  assert.deepEqual(T([{ dias: [6] }]), [{ dias: 'Sábado', horas: 'Por marcação' }]);
  assert.deepEqual(T([{ dias: [1, 2, 3, 4, 5], abre: '14:00', fecha: '18:30' }, { dias: [6] }, { dias: [5, 4, 3, 2, 1], abre: '09:00', fecha: '13:00' }]),
    [{ dias: 'Segunda a sexta', horas: '9h00 – 13h00 e 14h00 – 18h30' }, { dias: 'Sábado', horas: 'Por marcação' }]);
  assert.deepEqual(T([{ dias: [7], abre: '10:00', fecha: '12:00' }, { dias: [1], abre: '09:00', fecha: '18:00' }]).map((x) => x.dias), ['Segunda', 'Domingo']);
  assert.deepEqual(T('x'), []); assert.deepEqual(T([{ dias: [] }, 3]), []);
});
prova('ordenarComo: as chaves do ficheiro ficam onde estão; uma nova entra pela ordem do formulário', () => {
  /* A ordem da maior parte dos ficheiros de hoje (o título no fim, depois da posição). */
  const antes = Object.fromEntries(['slug', 'familia', 'nome', 'tipo', 'grupoTipo', 'desenho', 'frase', 'descricao', 'cores', 'quantidades', 'opcoes', 'areas', 'especificacoes', 'ordem', 'titulo'].map((k) => [k, artigoBase()[k] ?? 'x']));
  assert.deepEqual(Object.keys(R.ordenarComo(antes, { ...antes })), Object.keys(antes));
  const k = Object.keys(R.ordenarComo(antes, { ...antes, publicado: false }));
  assert.equal(k.indexOf('publicado'), k.indexOf('ordem') - 1);
  const novo = R.ordenarComo({}, { ordem: 3, publicado: true, cores: [], slug: 'x', zzz: 1, nome: 'X', familia: 't-shirts' });
  assert.deepEqual(Object.keys(novo), ['slug', 'familia', 'nome', 'cores', 'publicado', 'ordem', 'zzz']);
  const sem = R.ordenarComo(antes, (({ areas, ...resto }) => resto)(antes));
  assert.ok(!('areas' in sem));
  assert.equal(R.ordenarComo({}, null), null);
});
prova('mudancasBloqueadas: um artigo (o slug não muda; as chaves que não são do formulário também não)', () => {
  const a = artigoBase();
  assert.deepEqual(R.mudancasBloqueadas(a, { ...a, nome: 'Outra', publicado: false, cores: ['preto'] }, 'artigo'), []);
  assert.deepEqual(R.mudancasBloqueadas(a, { ...a, slug: 'outra' }, 'artigo'), [{ caminho: 'slug', motivo: 'mudou' }]);
  assert.deepEqual(R.mudancasBloqueadas({}, a, 'artigo'), []);
  assert.deepEqual(R.mudancasBloqueadas(a, { ...a, preco: 5 }, 'artigo'), [{ caminho: 'preco', motivo: 'chave_nova' }]);
  assert.deepEqual(R.mudancasBloqueadas({ ...a, x: 1 }, { ...a, x: 2 }, 'artigo'), [{ caminho: 'x', motivo: 'mudou' }]);
  assert.deepEqual(R.mudancasBloqueadas({ ...a, x: 1 }, { ...a, x: 1 }, 'artigo'), []);
});
prova('mudancasBloqueadas: a marca (o nome, a pré-visualização, o endereço e o aviso de teste não mudam)', () => {
  const m = marcaBase();
  assert.deepEqual(R.mudancasBloqueadas(m, { ...m, whatsapp: '351912345678', horario: [] }, 'marca'), []);
  for (const k of ['nome', 'demo', 'endereco']) assert.deepEqual(R.mudancasBloqueadas(m, { ...m, [k]: 'x' }, 'marca'), [{ caminho: k, motivo: 'mudou' }]);
  assert.deepEqual(R.mudancasBloqueadas(m, { ...m, mensagens: { ...m.mensagens, teste: '' } }, 'marca'), [{ caminho: 'mensagens.teste', motivo: 'mudou' }]);
  assert.deepEqual(R.mudancasBloqueadas(m, { ...m, cupao: 'X' }, 'marca'), [{ caminho: 'cupao', motivo: 'chave_nova' }]);
  assert.deepEqual(R.mudancasBloqueadas(m, { ...m, formaJuridica: 'lda' }, 'marca'), []);
  assert.deepEqual(R.mudancasBloqueadas(m, m), []);
});
prova('mudancasBloqueadas: as famílias (nenhuma sai e o grupo não muda; a ordem muda e entram novas)', () => {
  const f = familiasBase();
  assert.deepEqual(R.mudancasBloqueadas(f, f.map((x) => ({ ...x, nome: `${x.nome}!`, icone: 'caneca' })), 'familias'), []);
  assert.deepEqual(R.mudancasBloqueadas(f, [f[0]], 'familias'), [{ caminho: 'canetas', motivo: 'saiu' }]);
  assert.deepEqual(R.mudancasBloqueadas(f, [f[1], f[0]], 'familias'), []);
  const nova = { slug: 'canecas', nome: 'Canecas', grupo: 'Cozinha', icone: 'caneca', desenhos: ['caneca'], coresCapa: ['#FFFFFF', '#1B1D24'], frase: 'x', vantagens: [], h1: { antes: 'Canecas', destaque: 'personalizadas' } };
  assert.deepEqual(R.mudancasBloqueadas(f, [f[0], nova, f[1]], 'familias'), []);
  assert.deepEqual(R.mudancasBloqueadas(f, [...f, { ...nova, cupao: 1 }], 'familias'), [{ caminho: '2.cupao', motivo: 'chave_nova' }]);
  assert.deepEqual(R.mudancasBloqueadas(f, [{ ...f[0], grupo: 'Acessórios' }, f[1]], 'familias'), [{ caminho: '0.grupo', motivo: 'mudou' }]);
  assert.deepEqual(R.mudancasBloqueadas(f, [f[1], { ...f[0], grupo: 'Acessórios' }], 'familias'), [{ caminho: '1.grupo', motivo: 'mudou' }]);
  assert.deepEqual(R.mudancasBloqueadas(f, [{ ...f[0], novo: 1 }, f[1]], 'familias'), [{ caminho: '0.novo', motivo: 'chave_nova' }]);
  assert.deepEqual(R.mudancasBloqueadas([...f, 'x'], [...f], 'familias'), [{ caminho: 'familias', motivo: 'forma' }]);
  assert.deepEqual(R.mudancasBloqueadas([...f, 'x'], [f[1], 'x', f[0]], 'familias'), []);
});
prova('mudancasBloqueadas: os packs, as cores e as dúvidas (entram e saem; só as chaves desconhecidas não)', () => {
  const k = packsBase();
  assert.deepEqual(R.mudancasBloqueadas(k, [...k, { slug: 'novo', nome: 'Novo', pecas: [], preco: 1, minimo: 1, inclui: [] }], 'kits'), []);
  assert.deepEqual(R.mudancasBloqueadas(k, [], 'kits'), []);
  assert.deepEqual(R.mudancasBloqueadas(k, [{ ...k[0], cupao: 1 }], 'kits'), [{ caminho: '0.cupao', motivo: 'chave_nova' }]);
  const c = coresBase();
  assert.deepEqual(R.mudancasBloqueadas(c, { ...c, rosa: COR('Rosa', '#F29BC0', 'vermelhos'), preto: { ...c.preto, hex: '#000000' } }, 'cores'), []);
  assert.deepEqual(R.mudancasBloqueadas(c, { ...c, preto: { ...c.preto, pantone: '419 C' } }, 'cores'), [{ caminho: 'preto.pantone', motivo: 'chave_nova' }]);
  assert.deepEqual(R.mudancasBloqueadas(duvidasBase(), [...duvidasBase(), { p: 'Nova?', r: 'Sim.' }], 'duvidas'), []);
  assert.deepEqual(R.mudancasBloqueadas(duvidasBase(), [{ p: 'A?', r: 'B.', link: 'x' }], 'duvidas'), [{ caminho: '0.link', motivo: 'chave_nova' }]);
  assert.deepEqual(R.mudancasBloqueadas({}, {}, 'fotos'), [{ caminho: 'fotos', motivo: 'desconhecido' }]);
});

/* ------------------------------------------------------------- a guarda -- */
grupo('a guarda (scripts/guarda.mjs) sai com 1 só pelo que não se contorna');
const correrGuarda = (mudar) => {
  const pasta = mkdtempSync(join(tmpdir(), 'menta-guarda-'));
  try {
    cpSync(join(RAIZ, 'dados'), join(pasta, 'dados'), { recursive: true });
    if (mudar) mudar(pasta);
    return spawnSync(process.execPath, [join(RAIZ, 'scripts/guarda.mjs'), '--raiz', pasta], { encoding: 'utf8', env: { ...process.env, GITHUB_ACTIONS: '', GITHUB_STEP_SUMMARY: '' } });
  } finally { rmSync(pasta, { recursive: true, force: true }); }
};
const mudarJson = (pasta, rel, fn) => { const c = join(pasta, rel); const t = readFileSync(c, 'utf8'); const o = JSON.parse(t); fn(o); writeFileSync(c, R.serializar(o, R.terminacaoDe(t))); };
prova('os dados de hoje: sai com 0', () => {
  const r = correrGuarda();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.ok(r.stdout.includes('guarda dos dados: 0 param a publicação'), r.stdout);
});
prova('um artigo com um erro e outro em rascunho: sai com 0, e diz o que fica fora do site', () => {
  const { dados } = lerDados(RAIZ);
  const [errado, rascunho] = R.paraOSite(dados).artigos.map((a) => a.slug);
  const r = correrGuarda((p) => {
    mudarJson(p, R.ficheiroDoArtigo(errado), (a) => { a.desenho = 'nave'; });
    mudarJson(p, R.ficheiroDoArtigo(rascunho), (a) => { a.publicado = false; });
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const nome = R.nomeDoArtigo(JSON.parse(dados.artigos[errado]), errado);
  const fora = r.stdout.split('\n').find((l) => l.startsWith('Fora do site')) || '';
  assert.ok(r.stdout.includes(`Artigos › ${nome}: escondido do site`) && [errado, rascunho].every((n) => new RegExp(`[(, ]${n}[,)]`).test(fora)), r.stdout);
});
prova('o que não se contorna (o WhatsApp mal escrito, um JSON partido): sai com 1', () => {
  const r = correrGuarda((p) => mudarJson(p, 'dados/marca.json', (m) => { m.whatsapp = '966635602'; }));
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.ok(r.stdout.includes('Dados da marca › Contactos'), r.stdout);
  assert.equal(correrGuarda((p) => writeFileSync(join(p, 'dados/kits.json'), '[{')).status, 1);
});

/* ------------------------------------------------------------- os dados de hoje -- */
/* Na máquina do Renato, os dados de hoje não têm NENHUM problema (nem um lembrete) e o site sai
   inteiro, só sem os rascunhos. No CI (GITHUB_ACTIONS=true) só falha o que a guarda também pára:
   um rascunho gravado no painel (com o lembrete do pack que o usa) ou um artigo com um erro (que o
   gerador esconde) não podem parar a publicação — é para isso que há a guarda e a neutralização. */
grupo('os dados de hoje (dados/)');
const NO_CI = process.env.GITHUB_ACTIONS === 'true';
const HOJE = lerDados(RAIZ).dados;
const PROBLEMAS_DE_HOJE = R.problemas(HOJE);
const CONFERENCIA = conferir(RAIZ);
console.log(`    (hoje: ${PROBLEMAS_DE_HOJE.length} problemas; no site ${CONFERENCIA.site.familias.length} famílias, ${CONFERENCIA.site.artigos.length} artigos, ${CONFERENCIA.site.kits.length} packs; ${CONFERENCIA.site.fora.artigos.length} artigos fora)`);
prova('nada que pare a publicação', () => igual(PROBLEMAS_DE_HOJE.filter((p) => p.classe === 'bloqueia'), []));
prova(`não têm nenhum problema, e o site sai inteiro, só sem os rascunhos${NO_CI ? ' (no CI, quem decide é a guarda)' : ''}`, () => {
  if (NO_CI) return;
  igual(PROBLEMAS_DE_HOJE, []);
  const rascunhos = Object.keys(HOJE.artigos).filter((n) => !R.noSite(JSON.parse(HOJE.artigos[n])));
  assert.deepEqual(CONFERENCIA.site.fora.artigos.map((a) => a.slug), rascunhos);
  assert.equal(CONFERENCIA.neutro.mudou, false);
  assert.equal(CONFERENCIA.site.artigos.length + rascunhos.length, Object.keys(HOJE.artigos).length);
});
prova('com o site a sério (demo: false), só falta a identificação que a lei pede (se faltar)', () => {
  const extra = lista(R.problemas(HOJE, { producao: true })).filter((x) => !lista(PROBLEMAS_DE_HOJE).includes(x));
  assert.ok(extra.every((x) => /^bloqueia marca:(firma|nif|morada|email):producao$/.test(x)), extra.join('\n'));
});
prova('os rascunhos funcionam com os dados de hoje: um artigo que um pack usa, e uma família inteira', () => {
  const d = copia(HOJE);
  const ler = (n) => JSON.parse(d.artigos[n]);
  const kits = JSON.parse(HOJE.kits);
  const antes = R.paraOSite(HOJE);
  const noSiteHoje = new Set(antes.artigos.map((a) => a.slug));
  const doPack = antes.kits.flatMap((k) => k.pecas.map((pc) => pc.produto)).find((n) => noSiteHoje.has(n));
  const familia = antes.familias[antes.familias.length - 1].slug;
  const rascunhos = new Set([doPack, ...Object.keys(d.artigos).filter((n) => ler(n).familia === familia)].filter(Boolean));
  for (const n of rascunhos) d.artigos[n] = R.serializar({ ...ler(n), publicado: false });
  const s = R.paraOSite(d);
  /* Os dados de hoje são da dona (o painel junta, apaga packs, muda a ordem): o que se prova não
     depende de quantos há — só de haver um pack no site para o lado dos packs. */
  assert.ok(rascunhos.size >= 1);
  assert.ok(!s.artigos.some((a) => rascunhos.has(a.slug)));
  assert.equal(s.artigos.length, antes.artigos.filter((a) => !rascunhos.has(a.slug)).length);
  assert.ok(!s.familias.some((f) => f.slug === familia) && s.fora.familias.includes(familia));
  const packsFora = Array.isArray(kits) ? kits.filter((k) => Array.isArray(k?.pecas) && k.pecas.some((pc) => rascunhos.has(pc?.produto))).map((k) => k.slug) : [];
  if (doPack) assert.ok(packsFora.length >= 1);
  assert.deepEqual(s.kits.map((k) => k.slug), antes.kits.map((k) => k.slug).filter((k) => !packsFora.includes(k)));
  const todos = R.problemas(d);
  const novos = todos.filter((p) => !PROBLEMAS_DE_HOJE.some((q) => q.chave === p.chave));
  assert.ok(novos.every((p) => p.classe === 'avisa' && p.lembrete === true), lista(novos).join('\n'));
  assert.ok(todos.some((p) => p.chave === `familias:${familia}:sem-artigos`));
  for (const k of packsFora) assert.ok(todos.some((p) => p.chave.startsWith(`kits:${k}:fora:`)), k);
});

/* ------------------------------------------------------------- uma chave, uma classe -- */
grupo('uma chave tem sempre a mesma classe');
prova(`em todos os problemas desta bateria (${CLASSES.size} chaves)`, () => {
  assert.deepEqual([...CLASSES].filter(([, s]) => s.size > 1).map(([k, s]) => `${k}: ${[...s].join(', ')}`), []);
});

console.log(`\n${erradas.length ? '✗' : '✓'} regras: ${certas} certas, ${erradas.length} erradas`);
process.exit(erradas.length ? 1 : 0);
