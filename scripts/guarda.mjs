#!/usr/bin/env node
/* A GUARDA DOS DADOS (`node scripts/guarda.mjs`, antes de gerar; não precisa de segredos).
 *
 * Lê os ficheiros de dados/ e corre as regras de scripts/regras.mjs — as MESMAS que o painel vai
 * mostrar por baixo dos campos e que o Worker do painel vai conferir ao gravar.
 *
 * O PRINCÍPIO (o da Dream Art e do NewAuto): um problema de UM artigo ou de UM pack nunca pára a
 * publicação dos outros. Só pára o que não se pode publicar sem partir o site inteiro (classe
 * «bloqueia»): a estrutura dos ficheiros, a marca e os contactos, as famílias, as cores, as dúvidas
 * e, com o site a sério, a identificação que a lei pede. Um artigo ou um pack com um erro da classe
 * «neutraliza» fica escondido do site (ou perde a cor que não está na paleta): o gerador
 * (scripts/site.mjs) lê os dados pelo conferir() daqui e aplica a mesma neutralização — neutralizar()
 * e paraOSite() das regras — à cópia que lê. Os ficheiros não mudam.
 *
 *   node scripts/guarda.mjs [--raiz <pasta>]
 *       Confere (a pasta do repositório, ou outra com um dados/) e diz tudo, em português. Sai com 1
 *       só se houver um «bloqueia». No GitHub Actions, também as anotações (no máximo 9 de cada
 *       tipo: o GitHub guarda 10 por passo, e uma lista cortada diz «e mais N») e o resumo da
 *       corrida com a lista inteira.
 */
import { readFileSync, readdirSync, appendFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as R from './regras.mjs';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const MAX_ANOTACOES = 9;

/* Os dados como as regras os lêem: o texto de cada documento e de cada dados/produtos/*.json.
   Um ficheiro que não se lê (ou um «.json» que não é um ficheiro normal) é um «bloqueia». */
export function lerDados(raiz = RAIZ) {
  const estrutura = [];
  const dados = { artigos: {} };
  for (const [k, rel] of Object.entries(R.FICHEIROS)) {
    try { dados[k] = readFileSync(join(raiz, rel), 'utf8'); } catch (e) {
      /* Não existe: as regras dizem «falta o ficheiro». Outra coisa (uma pasta com o nome dele…): aqui. */
      if (e.code === 'ENOENT') dados[k] = null;
      else estrutura.push({ classe: 'bloqueia', chave: `estrutura:${rel}`, ficheiro: rel, ecra: R.NOMES_FICHEIROS[k], mensagem: `${rel} não se consegue ler (${e.code}). Só o Renato o pode corrigir.` });
    }
  }
  let entradas = [];
  try { entradas = readdirSync(join(raiz, R.PASTAS.artigos), { withFileTypes: true }); } catch { entradas = []; }
  for (const e of entradas.filter((x) => x.name.endsWith('.json')).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const rel = `${R.PASTAS.artigos}/${e.name}`;
    if (!e.isFile()) { estrutura.push({ classe: 'bloqueia', chave: `estrutura:${rel}`, ficheiro: rel, ecra: 'Artigos', mensagem: `${rel} não é um ficheiro normal. Só o Renato o pode corrigir.` }); continue; }
    dados.artigos[R.slugDoFicheiro(e.name)] = readFileSync(join(raiz, rel), 'utf8');
  }
  return { dados, estrutura };
}

/* A conferência inteira: os problemas, a cópia neutralizada e o que vai para o site. */
export function conferir(raiz = RAIZ) {
  const { dados, estrutura } = lerDados(raiz);
  const problemas = [...estrutura, ...R.problemas(dados)];
  const neutro = R.neutralizar(dados, problemas);
  const site = R.paraOSite(dados, neutro);
  return { dados, problemas, neutro, site };
}

const GRUPOS = [
  ['bloqueia', 'Param a publicação', '✗'],
  ['neutraliza', 'Escondem do site (ou tiram uma cor)', '!'],
  ['aviso', 'Avisos', '·'],
  ['lembrete', 'Lembretes', '·'],
];
const grupoDe = (p) => (p.classe === 'avisa' ? (p.lembrete ? 'lembrete' : 'aviso') : p.classe);

/* O relatório em texto, para o terminal e para o registo da corrida. */
export function relatorio({ problemas, neutro, site }) {
  const linhas = [];
  const n = (g) => problemas.filter((p) => grupoDe(p) === g).length;
  linhas.push(`guarda dos dados: ${n('bloqueia')} param a publicação, ${n('neutraliza')} escondem, ${n('aviso')} avisos, ${n('lembrete')} lembretes`);
  for (const [g, titulo, sinal] of GRUPOS) {
    const l = problemas.filter((p) => grupoDe(p) === g);
    if (!l.length) continue;
    linhas.push('', `${titulo} (${l.length}):`);
    for (const p of l) linhas.push(`  ${sinal} ${p.ecra}: ${p.mensagem}`);
  }
  if (neutro?.efeitos?.length) {
    linhas.push('', 'No site, por causa disso:');
    for (const e of neutro.efeitos) linhas.push(`  ${e.tipo === 'pack' ? 'Packs' : 'Artigos'} › ${e.nome}: ${R.descreverEfeitos(e)}`);
  }
  if (site) {
    const f = site.fora;
    linhas.push('', `No site: ${site.familias.length} famílias, ${site.artigos.length} artigos, ${site.kits.length} packs.`);
    const fora = [
      f.artigos.length ? `${f.artigos.length} ${f.artigos.length === 1 ? 'artigo' : 'artigos'} (${f.artigos.map((a) => a.slug).join(', ')})` : '',
      f.familias.length ? `${f.familias.length} ${f.familias.length === 1 ? 'família' : 'famílias'} (${f.familias.join(', ')})` : '',
      f.kits.length ? `${f.kits.length} ${f.kits.length === 1 ? 'pack' : 'packs'} (${f.kits.join(', ')})` : '',
    ].filter(Boolean);
    if (fora.length) linhas.push(`Fora do site (rascunhos e escondidos): ${fora.join('; ')}.`);
  }
  return linhas;
}

const umaLinha = (s) => String(s ?? '').replace(/\s+/g, ' ').replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A').slice(0, 900);

/* As anotações do GitHub Actions: no máximo MAX_ANOTACOES de cada tipo. */
function anotar(problemas) {
  const comando = { bloqueia: 'error', neutraliza: 'warning', aviso: 'notice', lembrete: 'notice' };
  for (const tipo of ['error', 'warning', 'notice']) {
    const l = problemas.filter((p) => comando[grupoDe(p)] === tipo);
    l.slice(0, MAX_ANOTACOES).forEach((p) => console.log(`::${tipo} title=${umaLinha(p.ecra)}::${umaLinha(p.mensagem)}`));
    if (l.length > MAX_ANOTACOES) console.log(`::${tipo}::e mais ${l.length - MAX_ANOTACOES}`);
  }
}

/* O resumo da corrida (a lista inteira). */
function resumo(conf) {
  const f = process.env.GITHUB_STEP_SUMMARY;
  if (!f) return;
  const linhas = ['## A guarda dos dados', ''];
  for (const [g, titulo] of GRUPOS) {
    const l = conf.problemas.filter((p) => grupoDe(p) === g);
    if (!l.length) continue;
    linhas.push(`### ${titulo} (${l.length})`, '');
    for (const p of l) linhas.push(`- **${p.ecra}** — ${p.mensagem}`);
    linhas.push('');
  }
  if (!conf.problemas.length) linhas.push('Sem nada a dizer.', '');
  const s = conf.site;
  linhas.push(`No site: ${s.familias.length} famílias, ${s.artigos.length} artigos, ${s.kits.length} packs.`);
  appendFileSync(f, `${linhas.join('\n')}\n`);
}

function main(argv) {
  const i = argv.indexOf('--raiz');
  const conf = conferir(i >= 0 && argv[i + 1] ? resolve(argv[i + 1]) : RAIZ);
  for (const l of relatorio(conf)) console.log(l);
  if (process.env.GITHUB_ACTIONS === 'true') anotar(conf.problemas);
  resumo(conf);
  const param = conf.problemas.filter((p) => p.classe === 'bloqueia').length;
  console.log(param ? `\n✗ a publicação pára: ${param} ${param === 1 ? 'problema' : 'problemas'} que não se contornam` : '\n✓ a guarda deixa publicar');
  return param ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));
