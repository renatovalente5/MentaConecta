/* AS REGRAS DOS DADOS DA MENTA CONECTA, NUM SÓ SÍTIO.
 *
 * Três leitores, e os três têm de ouvir o mesmo:
 *   · a guarda e o gerador do site (scripts/guarda.mjs e scripts/site.mjs), antes de escrever as
 *     páginas;
 *   · o painel, no browser (o erro aparece por baixo do campo, antes de gravar);
 *   · o Worker do painel, ao gravar (recusa os problemas NOVOS que não sejam lembretes).
 * O painel usa uma CÓPIA BYTE A BYTE deste ficheiro (estatico/js/regras.js, como o painel da Dream
 * Art), com um teste de SHA-256 que falha se divergirem. Por isso é um ES module puro: nenhum import,
 * nada de node:*, fs, process ou require. Corre tal e qual no browser, num Worker e no Node.
 * (A forma é a das regras da Dream Art, src/lib/regras.mjs, que vieram das da Mimices, da Pokóto Wood
 * e da AMMA Creative. Na Menta, 9 nov 2026: um ficheiro por artigo em dados/produtos/, as famílias, a
 * paleta das cores, os packs e as dúvidas; preços por escalão de quantidade, sem pagamentos no site.)
 *
 * CADA PROBLEMA TEM UMA CLASSE (as da Dream Art; «erro» é bloqueia ou neutraliza, «aviso» é avisa):
 *   · bloqueia   — erro que não se contorna: a publicação pára e o site fica como estava. A estrutura
 *                  (um JSON que não se lê, um ficheiro sem a forma que o gerador precisa) e o que todas
 *                  as páginas usam (a marca, os contactos, o horário, as famílias, as cores, as
 *                  dúvidas). Com o site a sério (demo: false), também a identificação que a lei pede
 *                  (DL 7/2004, art. 10.º: firma, NIF, morada e e-mail).
 *   · neutraliza — erro de UM artigo ou de UM pack, contornado só na cópia que o gerador lê (o
 *                  ficheiro não muda — ver neutralizar()): o artigo ou o pack fica escondido do site
 *                  (efeito «esconder»), ou a cor que não está na paleta sai do artigo («sem_cor»). Um
 *                  problema de um artigo nunca pára a publicação dos outros.
 *   · avisa      — só aviso: o site sai na mesma. No painel, os que não são lembrete são erro de campo
 *                  (valor fora da lista, número fora dos limites, texto comprido de mais): o painel não
 *                  os deixa gravar. Os LEMBRETES (lembrete: true) não são erro de ninguém: o painel
 *                  grava na mesma e mostra-os no Início.
 *
 * dados = {
 *   marca:    texto | objecto | null,               dados/marca.json
 *   familias: texto | objecto | null,               dados/familias.json
 *   cores:    texto | objecto | null,               dados/cores.json
 *   kits:     texto | objecto | null,               dados/kits.json (no site, «Packs»)
 *   duvidas:  texto | objecto | null,               dados/duvidas.json
 *   artigos:  { <nome>: texto | objecto | null },   dados/produtos/<nome>.json
 * }
 *   <nome> é o nome do ficheiro sem «.json»: o slug do artigo, o fim do endereço da página
 *   (/produtos/<família>/<slug>/). texto = o conteúdo do ficheiro; null = não existe. Uma chave de
 *   topo AUSENTE não se confere (o painel pode conferir só um artigo); presente e null é «falta o
 *   ficheiro».
 *
 * problema = {
 *   classe:   'bloqueia' | 'neutraliza' | 'avisa',
 *   chave:    estável ('artigo:<slug>:<regra>', 'marca:<campo>[:<regra>]', 'familias:<slug>.<campo>',
 *             'cores:<chave>…', 'kits:<slug>…', 'duvidas:<n>…'). O Worker compara as chaves do HEAD
 *             com as da gravação e recusa só as novas; por isso UMA CHAVE TEM SEMPRE A MESMA CLASSE (o
 *             que só vale com o site a sério tem uma chave própria, acabada em «:producao»);
 *   ficheiro: o caminho do ficheiro;
 *   ecra:     o ecrã do painel onde se corrige («Artigos › T-shirt Clássica»);
 *   mensagem: para a dona, em português simples, sem caminhos de JSON;
 *   campo?:   o campo onde o painel mostra o erro ('nome', 'quantidades.2.preco');
 *   efeito?:  só nos «neutraliza»: 'esconder' | 'sem_cor' | 'sem_fotos';
 *   slug? (o artigo), pack? (o slug do pack), cor?, indice?, campos?, lembrete?
 * }
 *
 * «NÃO FOI DITO» E NULL SÃO O MESMO. E o vazio testa-se ANTES de converter: Number(null) é 0, e 0 é
 * uma escolha (memória numero-zero-nao-e-nao-foi-dito).
 */

/* ------------------------------------------------------------------ */
/* Onde estão as coisas                                                */
/* ------------------------------------------------------------------ */

export const FICHEIROS = Object.freeze({
  marca: 'dados/marca.json',
  familias: 'dados/familias.json',
  cores: 'dados/cores.json',
  kits: 'dados/kits.json',
  duvidas: 'dados/duvidas.json',
});
export const PASTAS = Object.freeze({ artigos: 'dados/produtos' });
export const ficheiroDoArtigo = (nome) => `${PASTAS.artigos}/${nome}.json`;
/* O nome de cada ficheiro, para os ecrãs. */
export const NOMES_FICHEIROS = Object.freeze({ marca: 'Dados da marca', familias: 'Famílias', cores: 'Cores', kits: 'Packs', duvidas: 'Dúvidas' });

/* Os campos de um artigo, PELA ORDEM DO FORMULÁRIO (e de um artigo novo, no ficheiro). Uma chave nova
   entra por esta ordem (ordenarComo()); as que já estão no ficheiro ficam onde estão. */
export const CAMPOS_ARTIGO = Object.freeze([
  'slug', 'familia', 'nome', 'titulo', 'tipo', 'grupoTipo', 'desenho', 'fotos', 'corAlvo', 'unidade', 'tinta',
  'frase', 'descricao', 'cores', 'quantidades', 'opcoes', 'areas', 'especificacoes', 'publicado', 'ordem',
]);
/* Os campos dos outros documentos, pela ordem dos ficheiros de hoje. */
export const CAMPOS_FAMILIA = Object.freeze([
  'slug', 'nome', 'grupo', 'icone', 'singular', 'artigo', 'desenhos', 'coresCapa', 'frase', 'sublinhado',
  'vantagens', 'filtros', 'duvidas', 'h1',
]);
export const CAMPOS_PACK = Object.freeze(['slug', 'nome', 'frase', 'destaque', 'pecas', 'preco', 'minimo', 'inclui', 'publicado']);
export const CAMPOS_COR = Object.freeze(['nome', 'hex', 'grupo']);
export const CAMPOS_DUVIDA = Object.freeze(['p', 'r']);
export const CAMPOS_MARCA = Object.freeze([
  'nome', 'assinatura', 'servicos', 'descricao', 'demo', 'endereco', 'whatsapp', 'telefone', 'email',
  'firma', 'formaJuridica', 'nif', 'morada', 'codigoPostal', 'localidade', 'sociedade', 'atendimento',
  'horario', 'redes', 'iva', 'entrega', 'portes', 'mensagens',
]);
export const CAMPOS_MENSAGENS = Object.freeze(['geral', 'duvida', 'maquete', 'teste']);
export const REDES = Object.freeze(['instagram', 'facebook', 'linkedin']);
export const NOMES_REDES = Object.freeze({ instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn' });

/* Sempre escritos pelo painel, com o valor explícito. Ausentes valem o valor por omissão (é o que o
   gerador faz). */
export const BOOLEANOS_ARTIGO = Object.freeze(['publicado']);
export const POR_OMISSAO = Object.freeze({ publicado: true, ordem: 500, unidade: 'un.', iva: 23 });

export const NOMES_CAMPOS = Object.freeze({
  slug: 'Endereço', familia: 'Família', nome: 'Nome do modelo', titulo: 'Nome completo', tipo: 'Tipo',
  grupoTipo: 'Tipo no filtro', desenho: 'Desenho', fotos: 'Fotografias', corAlvo: 'Onde vai a cor', unidade: 'Unidade', tinta: 'Tinta',
  frase: 'Frase curta', descricao: 'Descrição', cores: 'Cores', quantidades: 'Quantidades e preços',
  opcoes: 'Opções', areas: 'Áreas de impressão', especificacoes: 'Especificações', publicado: 'Publicado no site',
  ordem: 'Posição na lista',
});

/* ------------------------------------------------------------------ */
/* As listas fechadas (o painel oferece-as para escolher)               */
/* ------------------------------------------------------------------ */

/* Os desenhos que o site sabe fazer: IGUAL a NOMES_DESENHOS de assets/js/desenhos.js (o
   scripts/test-regras.mjs falha se divergirem). Um desenho novo faz-se lá e acrescenta-se aqui. */
export const NOMES_DESENHOS = Object.freeze([
  'tshirt', 'tshirt-tecnica', 'polo', 'polo-ml', 'sweat', 'hoodie', 'softshell', 'colete', 'polar', 'bone',
  'chapeu', 'saco-tote', 'saco-mochila', 'lanyard', 'garrafa-aluminio', 'garrafa-termica', 'copo-termico',
  'caneca', 'caneca-esmaltada', 'caneta-clique', 'caneta-touch', 'caneta-bambu', 'caneta-fina', 'cartoes',
  'flyer', 'autocolantes', 'rollup', 'caderno', 'porta-chaves', 'porta-chaves-redondo', 'guarda-chuva', 'agenda',
]);
/* As técnicas: como o logótipo se mostra no desenho (AREAS de desenhos.js) e numa opção. */
export const TECNICAS = Object.freeze(['cor', 'gravacao', 'bordado']);
export const NOMES_TECNICAS = Object.freeze({ cor: 'Impressão a cores', gravacao: 'Gravação a laser', bordado: 'Bordado' });
/* Os ícones das famílias: IGUAL a NOMES_ICONES_FAMILIA de scripts/icones.mjs (com teste). */
export const ICONES_FAMILIA = Object.freeze([
  'caneta', 'tshirt', 'polo', 'hoodie', 'casaco', 'bone', 'garrafa', 'caneca', 'impressao', 'garrafa-termica',
  'porta-chaves', 'guarda-chuva', 'agenda',
]);
/* Os grupos das cores (os filtros das famílias): IGUAIS a GRUPOS_COR de assets/js/preco.js (com teste). */
export const CHAVES_GRUPOS_COR = Object.freeze(['brancos', 'pretos', 'azuis', 'verdes', 'vermelhos', 'amarelos', 'castanhos', 'roxos']);
export const NOMES_GRUPOS_COR = Object.freeze({
  brancos: 'Brancos', pretos: 'Pretos e cinzentos', azuis: 'Azuis', verdes: 'Verdes', vermelhos: 'Vermelhos e rosas',
  amarelos: 'Amarelos e laranjas', castanhos: 'Castanhos e beges', roxos: 'Roxos',
});
/* A tinta das canetas (o chip e o filtro «Tinta»). */
export const TINTAS = Object.freeze(['azul', 'preta']);
/* Onde vai a cor num desenho: vazio é por fora; «dentro» é por dentro e na asa (a caneca «Duo»). */
export const CORES_ALVO = Object.freeze(['dentro']);
/* O artigo do nome da família («personalizado» ou «personalizada»). */
export const ARTIGOS_GRAMATICAIS = Object.freeze(['o', 'a']);
export const FILTROS_FAMILIA = Object.freeze(['cor', 'tipo', 'tinta']);
export const TAXAS_IVA = Object.freeze([23, 13, 6, 0]);
/* As famílias deste grupo são têxteis: a ficha pede a composição (Regulamento (UE) 1007/2011). */
export const GRUPO_TEXTIL = 'Têxtil';
/* Os dias do horário: 1 = segunda … 7 = domingo. */
export const NOMES_DIAS = Object.freeze(['', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo']);

/* ------------------------------------------------------------------ */
/* Limites                                                             */
/* ------------------------------------------------------------------ */

/* Os números: [mínimo, máximo]. Os preços em euros, sem IVA. */
export const LIMITES = Object.freeze({
  escaloes: [1, 8],          /* linhas da tabela das quantidades */
  q: [1, 100000],            /* a quantidade de uma linha */
  preco: [0.01, 1000000],    /* o total de uma linha */
  cores: [1, 60],            /* cores de um artigo */
  grupos: [0, 4],            /* grupos de opções */
  opcoes: [1, 6],            /* opções de um grupo */
  acrescimo: [0, 1000],      /* euros por unidade */
  fator: [1, 5],             /* multiplica o preço por unidade (1,2 = mais 20 %) */
  ordem: [0, 9999],
  pecas: [1, 8],             /* peças de um pack */
  quantidadePeca: [1, 100],  /* unidades de uma peça, por pack */
  precoPack: [0.01, 100000],
  minimo: [1, 100000],       /* packs */
  desenhosFamilia: [1, 3],
  fotos: [0, 3],             /* fotografias de um artigo (a primeira é a principal) */
  coresCapa: [2, 3],
});
/* Tamanhos máximos dos textos, em caracteres (e das listas, em linhas). */
export const TAMANHOS = Object.freeze({
  nome: 60, titulo: 80, tipo: 40, grupoTipo: 40, unidade: 20, frase: 120, descricao: 600,
  grupoNome: 40, opcaoNome: 60, areas: 6, areaNome: 30, areaValor: 60, especificacoes: 12, specNome: 40, specValor: 160,
  familiaNome: 40, familiaGrupo: 40, singular: 40, familiaFrase: 160, sublinhado: 20, vantagens: 3, vantagem: 80, h1: 40,
  duvidas: 16, duvidasFamilia: 6, pergunta: 160, resposta: 600,
  packNome: 40, packFrase: 120, inclui: 6, incluiTexto: 80,
  corNome: 40,
  marca: 60, assinatura: 100, servicos: 100, descricaoSite: 300, atendimento: 160, entrega: 120, portes: 120, mensagem: 300,
  email: 160, telefone: 20, firma: 160, morada: 160, localidade: 60, horario: 7,
});
/* O que o Worker do painel aceita gravar (recusa acima); aqui só se lembra, a partir de 80 %. */
export const TECTOS = Object.freeze({ artigoBytes: 64 * 1024, aviso: 0.8 });

/* As palavras que a lei só deixa usar com prova (Diretiva (UE) 2024/825, aplicável desde 27 set
   2026: alegações ambientais genéricas; DL 57/2008: práticas enganosas, como «o mais vendido» sem
   prova) e as certificações que a Menta não nos mostrou. Palavra inteira (com acentos): «preço» e
   «económicas» não contam. alegacaoDe() devolve a palavra encontrada. */
export const RE_ALEGACOES = /(^|[^\p{L}\p{N}])(eco-?friendly|ecol[óo]gic[oa]s?|eco|sustent[áa]ve(?:l|is)|sustentabilidade|amig[oa]s? do ambiente|recicl[áa]ve(?:l|is)|reciclad[oa]s?|org[âa]nic[oa]s?|biol[óo]gic[oa]s?|biodegrad[áa]ve(?:l|is)|compost[áa]ve(?:l|is)|neutr[oa]s? em carbono|carbono (?:zero|neutro)|certificad[oa]s?|oeko-?tex|gots|fsc|en ?71|marca[çc][ãa]o ce|mais vendid[oa]s?|best-?sellers?)(?![\p{L}\p{N}])/iu;
export const alegacaoDe = (texto) => {
  if (typeof texto !== 'string') return null;
  const m = texto.match(RE_ALEGACOES);
  return m ? m[2] : null;
};

/* ------------------------------------------------------------------ */
/* Ajudantes que o painel e o Worker também usam                      */
/* ------------------------------------------------------------------ */

const eObjecto = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const ausente = (x) => x === null || x === undefined;
const vazio = (x) => ausente(x) || (typeof x === 'string' && x.trim() === '') || (Array.isArray(x) && x.length === 0);
const temTexto = (x) => typeof x === 'string' && x.trim() !== '';
const tem = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const numero = (n) => typeof n === 'number' && Number.isFinite(n);
const duasCasas = (n) => Math.abs(Math.round(n * 100) - n * 100) < 1e-6;
const inteiroEntre = (n, [a, b]) => Number.isInteger(n) && n >= a && n <= b;
const bytesDe = (s) => new TextEncoder().encode(s).length;
const eurosDe = (centimos) => `${(centimos / 100).toFixed(2).replace('.', ',')} €`;
const curto = (v, n = 40) => String(v).replace(/[\u0000-\u001F\u007F]+/g, ' ').slice(0, n);

/* Como os ficheiros estão escritos: JSON com UM espaço e a terminação de cada um (os artigos e quase
   todos os documentos com \n no fim; o cores.json sem). Abrir e gravar sem mexer deixa o ficheiro
   igual, byte a byte. Um artigo novo leva \n. */
export const terminacaoDe = (texto) => (typeof texto === 'string' && texto.endsWith('\n') ? '\n' : '');
export function serializar(obj, terminacao = '\n') { return JSON.stringify(obj, null, 1) + (terminacao || ''); }

/* O endereço da página, a partir do nome do ficheiro — IGUAL ao do gerador. */
export const slugDoFicheiro = (nome) => String(nome).replace(/\.json$/, '');
const RE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const slugValido = (s) => typeof s === 'string' && s.length <= 80 && RE_SLUG.test(s);

/* AS FOTOGRAFIAS DE UM ARTIGO (11 nov 2026, pedidas pelo Yuri): até 3, e a primeira é a principal (a
   da lista da família e a que a ficha abre). Cada uma é um JPEG em media/fotos/<endereço do
   artigo>-<8 hex>.jpg, com um nome novo em cada envio (escreve-o o painel: src/admin/fotos.js), e as
   versões para a web fá-las a publicação (scripts/fotos.py). O desenho continua: é a «Simulação»,
   com a cor e o logótipo que o visitante escolhe. */
const RE_FOTO = /^media\/fotos\/[a-z0-9]+(?:-[a-z0-9]+)*-[0-9a-f]{8}\.jpg$/;
/* O prefixo é o endereço do artigo (até 80): media/fotos/ (12) + 80 + -<8 hex>.jpg (13). */
export const fotoValida = (c) => typeof c === 'string' && c.length <= 105 && RE_FOTO.test(c);
export const caminhoDeFotoNova = (prefixo, hex) => `media/fotos/${prefixo}-${hex}.jpg`;
/* As que servem de uma lista: válidas, sem repetidas, até ao máximo (é o que o site mostra). */
export const fotosBoas = (lista) => (Array.isArray(lista) ? [...new Set(lista.filter(fotoValida))].slice(0, LIMITES.fotos[1]) : []);

/* O SLUG DE UM ARTIGO NOVO (ou de um pack, ou de uma cor): gerado UMA vez, ao criar, a partir do nome,
   e nunca mais muda — é o endereço da página que a loja partilha. Minúsculas, sem acentos, o resto
   passa a hífen («T-shirt Clássica» → t-shirt-classica). Repetido: -2, -3… */
export function gerarSlug(nome, existentes = []) {
  const ja = existentes instanceof Set ? existentes : new Set(existentes);
  let base = String(ausente(nome) ? '' : nome)
    .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+/, '').slice(0, 76).replace(/-+$/, '');
  if (!base) base = 'artigo';
  let slug = base;
  for (let n = 2; ja.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

/* NIF português: 9 algarismos (com ou sem espaços), o primeiro nunca é 0, e o de controlo (módulo 11). */
/* Igual ao validarNif do legal-comum (que o gerar.mjs corre em produção): sem ele, um NIF de
   teste gravado no painel passava aqui e parava a publicação no gerar. */
export function nifValido(nif) {
  const s = String(nif ?? '').replace(/\s/g, '');
  if (!/^[1-9][0-9]{8}$/.test(s)) return false;
  if (s === '123456789' || (s[0] === '4' && s[1] !== '5')) return false;
  let soma = 0;
  for (let i = 0; i < 8; i++) soma += Number(s[i]) * (9 - i);
  const resto = soma % 11;
  return (resto < 2 ? 0 : 11 - resto) === Number(s[8]);
}

/* Caracteres de controlo, por escape e nunca literais no código. */
const RE_CONTROLO_LINHA = /[\u0000-\u001F\u007F]/;
const RE_CONTROLO_TEXTO = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

export const RE_EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
export const emailValido = (v) => typeof v === 'string' && v.length <= TAMANHOS.email && RE_EMAIL.test(v.trim());

/* Um número português de 9 algarismos, ou com o indicativo (+351, 00351, 351). → os 9 algarismos, ou
   null. Só algarismos, espaços, pontos e hífenes: o telefone vai tal e qual para um «tel:». */
export function numeroPortugues(v) {
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  let d = String(v).replace(/[\s.-]/g, '');
  if (d.startsWith('+351')) d = d.slice(4); else if (d.startsWith('00351')) d = d.slice(5); else if (/^351\d{9}$/.test(d)) d = d.slice(3);
  return /^[29]\d{8}$/.test(d) ? d : null;
}
export const eTelemovel = (v) => /^9[1236]\d{7}$/.test(numeroPortugues(v) ?? '');
/* O WhatsApp guarda-se como o wa.me o quer: 351 e os 9 algarismos, sem espaços nem «+». */
export const whatsappValido = (v) => typeof v === 'string' && /^351\d{9}$/.test(v) && numeroPortugues(v.slice(3)) !== null;

/* Uma cor em hexadecimal, como a página a escreve: «#1B1D24». */
export const corValida = (v) => typeof v === 'string' && /^#[0-9A-Fa-f]{6}$/.test(v);

/* Uma hora do horário: «09:00» (das 00:00 às 23:59). */
export const horaValida = (h) => typeof h === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(h);
const minutosDe = (h) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3));

/* O endereço de uma rede social: o da página, completo, no domínio da rede (é o que a auditoria do
   site deixa sair). */
export const redeValida = (rede, url) => REDES.includes(rede) && typeof url === 'string' && url.length <= 200
  && new RegExp(`^https://(www\\.)?${rede}\\.com/[^\\s"'<>]+$`).test(url);

/* Igualdade de valores lidos de JSON, com null ≡ ausente e sem ligar à ordem das chaves. */
export function mesmoValor(a, b) {
  if (ausente(a) && ausente(b)) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => mesmoValor(x, b[i]));
  }
  if (eObjecto(a) || eObjecto(b)) {
    if (!eObjecto(a) || !eObjecto(b)) return false;
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (!mesmoValor(a[k], b[k])) return false;
    return true;
  }
  return a === b;
}

/* Lê um ficheiro: o TEXTO (string), o objecto já lido, ou null/undefined. */
function lerJson(valor) {
  if (ausente(valor)) return { ausente: true };
  if (typeof valor !== 'string') return { obj: valor, texto: null };
  try { return { obj: JSON.parse(valor), texto: valor }; } catch (e) { return { ilegivel: String((e && e.message) || e).slice(0, 120), texto: valor }; }
}
const valorEmCaminho = (o, caminho) => caminho.split('.').reduce((x, k) => (eObjecto(x) ? x[k] : undefined), o);

/* As famílias de dados/familias.json: [{ slug, nome, grupo }], ou null se não se lê. */
export function familiasDe(valor) {
  const l = lerJson(valor);
  if (!Array.isArray(l.obj)) return null;
  return l.obj.filter((f) => eObjecto(f) && slugValido(f.slug))
    .map((f) => ({ slug: f.slug, nome: temTexto(f.nome) ? f.nome.trim() : f.slug, grupo: typeof f.grupo === 'string' ? f.grupo : '' }));
}

/* No site, como o gerador decide: tudo menos `publicado: false` (um artigo ou um pack). */
export const noSite = (a) => eObjecto(a) && a.publicado !== false;
/* A posição na lista (mais baixo aparece primeiro); fora dos limites, a por omissão. */
export const ordemDe = (a) => (eObjecto(a) && inteiroEntre(a.ordem, LIMITES.ordem) ? a.ordem : POR_OMISSAO.ordem);
/* O nome que o ecrã mostra, numa linha só, cortado a 80: o nome completo, ou o do modelo. */
export const nomeDoArtigo = (a, slug) => {
  const n = eObjecto(a) ? [a.titulo, a.nome].find(temTexto) : '';
  const limpo = n ? n.replace(/[\u0000-\u001F\u007F]+/g, ' ').replace(/\s+/g, ' ').trim() : '';
  const cortado = limpo.length > 80 ? `${limpo.slice(0, 79)}…` : limpo;
  return cortado || slug || 'artigo sem nome';
};
const ecraDoArtigo = (a, slug) => `Artigos › ${nomeDoArtigo(a, slug)}`;
const nomeDoPack = (k) => (eObjecto(k) && temTexto(k.nome) ? k.nome.trim() : (eObjecto(k) && typeof k.slug === 'string' ? k.slug : 'pack sem nome'));

/* AS CORES EM USO: as dos artigos (também os rascunhos: um rascunho volta a ser publicado) e as das
   peças dos packs. Uma cor só sai da paleta se não estiver aqui. → Map(chave → [nome de quem a usa]) */
/* AS FOTOGRAFIAS EM USO: as de todos os artigos, publicados ou não (um rascunho guarda as dele). Uma
   que deixa de estar aqui sai do repositório no mesmo «Gravar» (o painel: src/admin/fotos.js). */
export function fotosEmUso(dados = {}) {
  const out = new Set();
  const mapa = eObjecto(dados.artigos) ? dados.artigos : {};
  for (const v of Object.values(mapa)) {
    const a = lerJson(v).obj;
    if (eObjecto(a) && Array.isArray(a.fotos)) for (const c of a.fotos) if (fotoValida(c)) out.add(c);
  }
  return out;
}

export function coresEmUso(dados = {}) {
  const d = eObjecto(dados) ? dados : {};
  const usadas = new Map();
  const juntar = (c, quem) => { if (typeof c !== 'string') return; const l = usadas.get(c) || []; if (!l.includes(quem)) l.push(quem); usadas.set(c, l); };
  if (eObjecto(d.artigos)) {
    for (const nome of Object.keys(d.artigos).sort()) {
      const a = lerJson(d.artigos[nome]).obj;
      if (eObjecto(a) && Array.isArray(a.cores)) a.cores.forEach((c) => juntar(c, nomeDoArtigo(a, nome)));
    }
  }
  const ks = lerJson(d.kits).obj;
  if (Array.isArray(ks)) for (const k of ks) if (eObjecto(k) && Array.isArray(k.pecas)) k.pecas.forEach((p) => { if (eObjecto(p)) juntar(p.cor, `pack ${nomeDoPack(k)}`); });
  return usadas;
}

/* O HORÁRIO COMO O SITE O ESCREVE, a partir do horário estruturado (marca.horario: [{ dias: [1..7],
   abre: 'HH:MM', fecha: 'HH:MM' }]; uma linha sem horas é «Por marcação»). As linhas com os mesmos
   dias juntam-se («9h00 – 13h00 e 14h00 – 18h30»). → [{ dias: 'Segunda a sexta', horas: '9h00 – 18h30' }] */
const maiuscula = (t) => (t ? t[0].toUpperCase() + t.slice(1) : t);
function textoDosDias(dias) {
  const ds = [...new Set(dias)].filter((x) => inteiroEntre(x, [1, 7])).sort((a, b) => a - b);
  if (ds.length === 7) return 'Todos os dias';
  const seguidos = [];
  for (const x of ds) { const u = seguidos[seguidos.length - 1]; if (u && x === u[1] + 1) u[1] = x; else seguidos.push([x, x]); }
  const partes = seguidos.flatMap(([a, b]) => (a === b ? [NOMES_DIAS[a]] : b === a + 1 ? [NOMES_DIAS[a], NOMES_DIAS[b]] : [`${NOMES_DIAS[a]} a ${NOMES_DIAS[b]}`]));
  return maiuscula(partes.length > 1 ? `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}` : partes[0] || '');
}
const textoDaHora = (h) => `${Number(h.slice(0, 2))}h${h.slice(3)}`;
export function textoDoHorario(horario) {
  if (!Array.isArray(horario)) return [];
  const grupos = new Map();
  for (const h of horario) {
    if (!eObjecto(h) || !Array.isArray(h.dias)) continue;
    const dias = [...new Set(h.dias.filter((x) => inteiroEntre(x, [1, 7])))].sort((a, b) => a - b);
    if (!dias.length) continue;
    const k = dias.join(',');
    if (!grupos.has(k)) grupos.set(k, { dias, intervalos: [], porMarcacao: false });
    const g = grupos.get(k);
    if (horaValida(h.abre) && horaValida(h.fecha)) g.intervalos.push([h.abre, h.fecha]);
    else g.porMarcacao = true;
  }
  return [...grupos.values()]
    .sort((a, b) => a.dias[0] - b.dias[0] || a.dias.length - b.dias.length)
    .map((g) => {
      const partes = g.intervalos.sort((a, b) => minutosDe(a[0]) - minutosDe(b[0])).map(([a, f]) => `${textoDaHora(a)} – ${textoDaHora(f)}`);
      if (g.porMarcacao) partes.push(partes.length ? 'por marcação' : 'Por marcação');
      return { dias: textoDosDias(g.dias), horas: partes.join(' e ') };
    });
}

/* ------------------------------------------------------------------ */
/* Um artigo                                                            */
/* ------------------------------------------------------------------ */

/* A composição de um tecido: um número com «%» («100 % algodão»). */
const RE_COMPOSICAO = /\d+(?:[.,]\d+)?\s?%/;
/* Os textos que o site mostra de um artigo, com o campo de cada um (para as alegações). */
function textosDoArtigo(a) {
  const out = [];
  for (const k of ['nome', 'titulo', 'tipo', 'grupoTipo', 'unidade', 'frase', 'descricao']) if (typeof a[k] === 'string') out.push([k, a[k]]);
  if (Array.isArray(a.opcoes)) for (const g of a.opcoes) {
    if (!eObjecto(g)) continue;
    if (typeof g.grupo === 'string') out.push(['opcoes', g.grupo]);
    if (Array.isArray(g.opcoes)) for (const o of g.opcoes) if (eObjecto(o) && typeof o.nome === 'string') out.push(['opcoes', o.nome]);
  }
  for (const campo of ['areas', 'especificacoes']) if (eObjecto(a[campo])) for (const [k, v] of Object.entries(a[campo])) { out.push([campo, k]); if (typeof v === 'string') out.push([campo, v]); }
  return out;
}

/* Os problemas de UM artigo. O painel usa-o campo a campo.
   ctx = { nome (o do ficheiro, sem .json), familias?: [{ slug, grupo }] | null (familiasDe()),
           cores?: a paleta (o objecto de dados/cores.json) ou Set de chaves | null }
   O que falta no ctx não se confere. A forma do ficheiro e o endereço são do problemas(). */
export function problemasDoArtigo(a, ctx = {}) {
  const nome = typeof ctx.nome === 'string' ? ctx.nome : '';
  const slug = slugDoFicheiro(nome);
  const ficheiro = ficheiroDoArtigo(nome);
  const familias = Array.isArray(ctx.familias) ? ctx.familias : null;
  const paleta = ctx.cores instanceof Set ? ctx.cores : eObjecto(ctx.cores) ? new Set(Object.keys(ctx.cores)) : null;
  const nomeDaCor = (c) => (eObjecto(ctx.cores) && eObjecto(ctx.cores[c]) && temTexto(ctx.cores[c].nome) ? ctx.cores[c].nome : c);
  const out = [];
  const base = { ficheiro, ecra: ecraDoArtigo(a, slug), slug };
  const chave = (regra) => `artigo:${slug}:${regra}`;
  const neutraliza = (regra, efeito, campo, mensagem, extra = {}) => out.push({ classe: 'neutraliza', chave: chave(regra), campo, efeito, mensagem, ...base, ...extra });
  const esconde = (regra, campo, mensagem, extra) => neutraliza(regra, 'esconder', campo, mensagem, extra);
  const avisa = (regra, campo, mensagem, extra = {}) => out.push({ classe: 'avisa', chave: chave(regra), campo, mensagem, ...base, ...extra });
  if (!eObjecto(a)) return out;
  const FICA = 'O artigo fica escondido do site até';

  // --- neutraliza: o que o site não pode mostrar --------------------------
  for (const [campo, falta, genero] of [['nome', 'o nome do modelo (ex.: Clássica)', 'o'], ['titulo', 'o nome completo (ex.: T-shirt Clássica)', 'o'], ['tipo', 'o tipo (ex.: T-shirt)', 'o'], ['frase', 'a frase curta', 'a'], ['descricao', 'a descrição', 'a']]) {
    const x = a[campo];
    if (vazio(x)) esconde(campo, campo, `Falta ${falta}. ${FICA} estar preenchid${genero}.`);
    else if (typeof x !== 'string') esconde(campo, campo, `«${NOMES_CAMPOS[campo]}» tem de ser texto. ${FICA} ser corrigid${genero}.`);
  }
  const fam = a.familia;
  const daFamilia = familias && typeof fam === 'string' ? familias.find((f) => f.slug === fam) : null;
  if (vazio(fam)) esconde('familia', 'familia', `Falta a família. ${FICA} escolher uma.`);
  else if (typeof fam !== 'string' || (familias && !daFamilia)) esconde('familia', 'familia', `A família não é nenhuma das do site. ${FICA} escolher uma da lista.`);
  const des = a.desenho;
  if (vazio(des)) esconde('desenho', 'desenho', `Falta o desenho. ${FICA} escolher um.`);
  else if (!NOMES_DESENHOS.includes(des)) esconde('desenho', 'desenho', `O desenho não é nenhum dos que o site sabe fazer. ${FICA} escolher um da lista.`);
  /* As fotografias: só o painel as escreve. Uma lista mexida à mão não esconde o artigo — o site
     mostra as que servem (neutralizar(), «sem_fotos») e volta ao desenho se não sobrar nenhuma. */
  if (!ausente(a.fotos)) {
    const fs = a.fotos;
    const max = LIMITES.fotos[1];
    if (!Array.isArray(fs)) neutraliza('fotos', 'sem_fotos', 'fotos', '«Fotografias» tem de ser uma lista. O site mostra o desenho até ser corrigida.');
    else if (fs.length > max || fs.some((c) => !fotoValida(c)) || new Set(fs).size !== fs.length) neutraliza('fotos', 'sem_fotos', 'fotos', `As fotografias são no máximo ${max}, sem repetidas, e juntam-se no painel. O site mostra só as que servem.`);
  }
  if (!vazio(a.tinta) && !TINTAS.includes(a.tinta)) esconde('tinta', 'tinta', `A tinta é azul, preta, ou fica vazia. ${FICA} ser corrigida.`);
  if (!ausente(a.unidade) && typeof a.unidade !== 'string') esconde('unidade', 'unidade', `A unidade tem de ser texto (ex.: cartões). ${FICA} ser corrigida.`);

  // --- as cores ------------------------------------------------------------
  const cs = a.cores;
  if (!Array.isArray(cs) || !cs.length) esconde('sem-cores', 'cores', `O artigo não tem cores. ${FICA} ter pelo menos uma.`);
  else {
    const vistas = new Set();
    let boas = 0;
    cs.forEach((c, indice) => {
      if (typeof c !== 'string' || !slugValido(c)) {
        neutraliza(`cor-invalida:${curto(c)}`, 'sem_cor', 'cores', `«${curto(c)}» não é uma cor da paleta: não aparece no site. Tire-a do artigo e escolha a cor outra vez.`, { cor: c, indice });
        return;
      }
      if (paleta && !paleta.has(c)) {
        neutraliza(`cor-desconhecida:${c}`, 'sem_cor', 'cores', `A cor «${c}» não está na paleta: não aparece neste artigo no site. Tire-a do artigo, ou volte a pô-la nas cores.`, { cor: c, indice });
        return;
      }
      if (vistas.has(c)) { avisa(`cor-repetida:${c}`, 'cores', `A cor «${nomeDaCor(c)}» está duas vezes no artigo. Tire uma delas.`, { cor: c, indice }); return; }
      vistas.add(c);
      boas++;
    });
    if (!boas) esconde('sem-cores', 'cores', `O artigo não tem nenhuma cor da paleta. ${FICA} ter pelo menos uma.`);
    if (cs.length > LIMITES.cores[1]) avisa('cores:muitas', 'cores', `O artigo tem ${cs.length} cores; o máximo é ${LIMITES.cores[1]}.`);
  }

  // --- as quantidades e os preços (o preço de cada linha é o total, sem IVA) ---
  const qs = a.quantidades;
  if (!Array.isArray(qs) || qs.length < LIMITES.escaloes[0]) esconde('quantidades', 'quantidades', `Falta a tabela das quantidades e dos preços. ${FICA} ter pelo menos uma linha.`);
  else {
    if (qs.length > LIMITES.escaloes[1]) avisa('quantidades:muitas', 'quantidades', `A tabela das quantidades tem ${qs.length} linhas; o máximo é ${LIMITES.escaloes[1]}.`);
    let qAntes = 0;
    let antes = null;
    qs.forEach((l, i) => {
      const onde = `Na linha ${i + 1} das quantidades`;
      if (!eObjecto(l)) { esconde(`quantidades.${i}`, `quantidades.${i}`, `A linha ${i + 1} das quantidades não está como deve ser. ${FICA} ser escrita outra vez.`); return; }
      const qBoa = inteiroEntre(l.q, LIMITES.q) && l.q > qAntes;
      if (!qBoa) esconde(`quantidades.${i}.q`, `quantidades.${i}.q`, `${onde}, a quantidade tem de ser um número inteiro${i ? ', maior do que o da linha de cima' : ''} (ex.: ${i ? 25 : 10}). ${FICA} ser corrigida.`);
      else qAntes = l.q;
      const p = l.preco;
      const precoBom = numero(p) && p >= LIMITES.preco[0] && p <= LIMITES.preco[1] && duasCasas(p);
      if (!precoBom) esconde(`quantidades.${i}.preco`, `quantidades.${i}.preco`, `${onde}, o preço é o total dessa quantidade, sem IVA: só o número, sem € (ex.: 152 ou 152,50). ${FICA} ser corrigido.`);
      if (!qBoa || !precoBom) return;
      const un = Math.round(p * 100 / l.q);
      if (antes && un > antes.un) esconde(`quantidades.${i}:sobe`, `quantidades.${i}.preco`, `Com ${l.q} unidades, o preço por unidade (${eurosDe(un)}) fica mais alto do que com ${antes.q} (${eurosDe(antes.un)}): com mais quantidade, não pode subir. ${FICA} ser corrigido.`);
      antes = { q: l.q, un };
    });
  }

  // --- as opções (de cada grupo, a primeira vem incluída no preço) ---------
  const ops = a.opcoes;
  if (!ausente(ops)) {
    if (!Array.isArray(ops)) esconde('opcoes', 'opcoes', `As opções não estão gravadas como uma lista. ${FICA} serem escritas outra vez.`);
    else {
      if (ops.length > LIMITES.grupos[1]) avisa('opcoes:muitas', 'opcoes', `O artigo tem ${ops.length} grupos de opções; o máximo é ${LIMITES.grupos[1]}.`);
      const nomesG = new Set();
      ops.forEach((g, i) => {
        if (!eObjecto(g) || !Array.isArray(g.opcoes)) { esconde(`opcoes.${i}`, `opcoes.${i}`, `O grupo de opções ${i + 1} não está como deve ser. ${FICA} ser escrito outra vez.`); return; }
        const nomeG = temTexto(g.grupo) ? g.grupo.trim() : '';
        const rotulo = nomeG ? `Nas opções «${curto(nomeG)}»` : `No grupo de opções ${i + 1}`;
        if (!nomeG) esconde(`opcoes.${i}.grupo`, `opcoes.${i}.grupo`, `O grupo de opções ${i + 1} não tem nome (ex.: Impressão). ${FICA} ter nome.`);
        else {
          if (g.grupo.length > TAMANHOS.grupoNome) avisa(`opcoes.${i}.grupo:tamanho`, `opcoes.${i}.grupo`, `O nome do grupo de opções ${i + 1} tem mais de ${TAMANHOS.grupoNome} caracteres.`);
          if (RE_CONTROLO_LINHA.test(g.grupo)) avisa(`opcoes.${i}.grupo:controlo`, `opcoes.${i}.grupo`, `O nome do grupo de opções ${i + 1} tem caracteres invisíveis. Escreva-o outra vez.`);
          const k = nomeG.toLowerCase();
          if (nomesG.has(k)) avisa(`opcoes.${i}.grupo:repetido`, `opcoes.${i}.grupo`, `Há dois grupos de opções com o nome «${curto(nomeG)}».`);
          nomesG.add(k);
        }
        if (g.opcoes.length < LIMITES.opcoes[0]) esconde(`opcoes.${i}:vazio`, `opcoes.${i}.opcoes`, `${rotulo} não há nenhuma opção. ${FICA} ter pelo menos uma.`);
        if (g.opcoes.length > LIMITES.opcoes[1]) avisa(`opcoes.${i}:muitas`, `opcoes.${i}.opcoes`, `${rotulo} há ${g.opcoes.length} opções; o máximo é ${LIMITES.opcoes[1]}.`);
        const nomesO = new Set();
        g.opcoes.forEach((o, j) => {
          const c = `opcoes.${i}.opcoes.${j}`;
          if (!eObjecto(o) || !temTexto(o.nome)) { esconde(`${c}.nome`, `${c}.nome`, `${rotulo}, a opção ${j + 1} não tem nome. ${FICA} ter nome.`); return; }
          const nomeO = curto(o.nome.trim());
          if (o.nome.length > TAMANHOS.opcaoNome) avisa(`${c}.nome:tamanho`, `${c}.nome`, `${rotulo}, a opção «${nomeO}» tem mais de ${TAMANHOS.opcaoNome} caracteres.`);
          if (RE_CONTROLO_LINHA.test(o.nome)) avisa(`${c}.nome:controlo`, `${c}.nome`, `${rotulo}, a opção ${j + 1} tem caracteres invisíveis. Escreva-a outra vez.`);
          const k = o.nome.trim().toLowerCase();
          if (nomesO.has(k)) avisa(`${c}.nome:repetido`, `${c}.nome`, `${rotulo}, a opção «${nomeO}» está repetida.`);
          nomesO.add(k);
          const ac = o.acrescimo;
          const fa = o.fator;
          const acBom = ausente(ac) || (numero(ac) && ac >= LIMITES.acrescimo[0] && ac <= LIMITES.acrescimo[1] && duasCasas(ac));
          const faBom = ausente(fa) || (numero(fa) && fa >= LIMITES.fator[0] && fa <= LIMITES.fator[1] && duasCasas(fa));
          if (!acBom) esconde(`${c}.acrescimo`, `${c}.acrescimo`, `${rotulo}, o acréscimo de «${nomeO}» é em euros por unidade, só o número, sem € (ex.: 0,50), de 0 a ${LIMITES.acrescimo[1]}. ${FICA} ser corrigido.`);
          if (!faBom) esconde(`${c}.fator`, `${c}.fator`, `${rotulo}, o fator de «${nomeO}» multiplica o preço por unidade (ex.: 1,2 é mais 20 %), de 1 a ${LIMITES.fator[1]}. ${FICA} ser corrigido.`);
          const comAcrescimo = acBom && numero(ac) && ac > 0;
          const comFator = faBom && numero(fa) && fa !== 1;
          if (comAcrescimo && comFator) esconde(`${c}:acrescimo-e-fator`, c, `${rotulo}, «${nomeO}» tem acréscimo e fator ao mesmo tempo, e o site só mostra um deles. Deixe só um. ${FICA} ser corrigido.`);
          if (!ausente(o.tecnica) && !TECNICAS.includes(o.tecnica)) esconde(`${c}.tecnica`, `${c}.tecnica`, `${rotulo}, a técnica de «${nomeO}» não é nenhuma das da lista (impressão a cores, gravação a laser, bordado). ${FICA} escolher uma.`);
          if (j === 0 && (comAcrescimo || comFator)) avisa(`${c}:incluida`, c, `${rotulo}, a primeira opção («${nomeO}») é a que vem incluída no preço: não pode ter acréscimo. Ponha primeiro a opção sem acréscimo.`);
        });
      });
    }
  }

  // --- as áreas de impressão e as especificações (pequenas listas «nome: texto») ---
  const lista = (campo, maxLinhas, maxNome, maxValor) => {
    const m = a[campo];
    const rotulo = NOMES_CAMPOS[campo];
    if (ausente(m)) return;
    if (!eObjecto(m)) { esconde(campo, campo, `«${rotulo}» não está gravado como deve ser. ${FICA} ser escrito outra vez.`); return; }
    const linhas = Object.entries(m);
    if (linhas.length > maxLinhas) avisa(`${campo}:muitas`, campo, `«${rotulo}» tem ${linhas.length} linhas; o máximo é ${maxLinhas}.`);
    linhas.forEach(([k, v], i) => {
      const c = `${campo}.${i}`;
      if (typeof v !== 'string') { esconde(c, campo, `A linha ${i + 1} de «${rotulo}» não é texto. ${FICA} ser escrita outra vez.`, { indice: i }); return; }
      if (!k.trim() || !v.trim()) avisa(`${c}:vazia`, campo, `A linha ${i + 1} de «${rotulo}» está incompleta: escreva o nome e o texto, ou tire a linha.`, { indice: i });
      if (k.length > maxNome || v.length > maxValor) avisa(`${c}:tamanho`, campo, `A linha ${i + 1} de «${rotulo}» é comprida de mais (o nome até ${maxNome} caracteres, o texto até ${maxValor}).`, { indice: i });
      if (RE_CONTROLO_LINHA.test(k) || RE_CONTROLO_LINHA.test(v)) avisa(`${c}:controlo`, campo, `A linha ${i + 1} de «${rotulo}» tem caracteres invisíveis. Escreva-a outra vez.`, { indice: i });
    });
  };
  lista('areas', TAMANHOS.areas, TAMANHOS.areaNome, TAMANHOS.areaValor);
  lista('especificacoes', TAMANHOS.especificacoes, TAMANHOS.specNome, TAMANHOS.specValor);

  /* A composição dos tecidos (Regulamento (UE) 1007/2011, art. 16.º): numa peça de têxtil, tem de estar
     no site antes da compra, em percentagem. Na Menta, as famílias do grupo «Têxtil». */
  if (daFamilia && daFamilia.grupo === GRUPO_TEXTIL) {
    const esp = eObjecto(a.especificacoes) ? a.especificacoes : {};
    const k = Object.keys(esp).find((x) => x.trim().toLowerCase() === 'tecido');
    if (!(k && typeof esp[k] === 'string' && RE_COMPOSICAO.test(esp[k]))) {
      esconde('tecido', 'especificacoes', `Falta a composição do tecido, em percentagem, nas especificações (ex.: «Tecido: 100 % algodão»): nas peças de têxtil, a lei pede-a no site (Regulamento (UE) 1007/2011). ${FICA} a escrever.`);
    }
  }

  const alegam = [];
  for (const [campo, t] of textosDoArtigo(a)) { const w = alegacaoDe(t); if (w) alegam.push([campo, w]); }
  if (alegam.length) {
    esconde('alegacoes', alegam[0][0], `«${alegam[0][1]}» é uma palavra que a lei só deixa usar com prova (ou uma certificação que não temos). ${FICA} a tirar.`, { campos: [...new Set(alegam.map((x) => x[0]))] });
  }

  // --- avisa: o que o site mostra na mesma ---------------------------------
  if (!vazio(a.corAlvo) && !CORES_ALVO.includes(a.corAlvo)) avisa('corAlvo', 'corAlvo', '«Onde vai a cor» só pode ser «dentro» (a cor por dentro e na asa) ou ficar vazio.');
  if (!ausente(a.grupoTipo) && typeof a.grupoTipo !== 'string') avisa('grupoTipo:tipo', 'grupoTipo', `«${NOMES_CAMPOS.grupoTipo}» tem de ser texto.`);
  for (const b of BOOLEANOS_ARTIGO) if (!ausente(a[b]) && typeof a[b] !== 'boolean') avisa(b, b, `«${NOMES_CAMPOS[b]}» tem de ser sim ou não.`);
  if (!ausente(a.ordem) && a.ordem !== '' && !inteiroEntre(a.ordem, LIMITES.ordem)) avisa('ordem', 'ordem', `A posição é um número inteiro de 0 a ${LIMITES.ordem[1]} (mais baixo aparece primeiro).`);
  const texto = (campo, max, { linha = true } = {}) => {
    const x = a[campo];
    if (typeof x !== 'string') return;
    if (x.length > max) avisa(`${campo}:tamanho`, campo, `«${NOMES_CAMPOS[campo]}» tem mais de ${max} caracteres (tem ${x.length}).`);
    if ((linha ? RE_CONTROLO_LINHA : RE_CONTROLO_TEXTO).test(x)) avisa(`${campo}:controlo`, campo, `«${NOMES_CAMPOS[campo]}» tem caracteres invisíveis${linha ? ' (ex.: uma mudança de linha)' : ''}. Escreva o texto outra vez.`);
  };
  texto('nome', TAMANHOS.nome);
  texto('titulo', TAMANHOS.titulo);
  texto('tipo', TAMANHOS.tipo);
  texto('grupoTipo', TAMANHOS.grupoTipo);
  texto('unidade', TAMANHOS.unidade);
  texto('frase', TAMANHOS.frase);
  texto('descricao', TAMANHOS.descricao, { linha: false });
  return out;
}

/* ------------------------------------------------------------------ */
/* dados/marca.json                                                    */
/* ------------------------------------------------------------------ */

export const SECCOES_MARCA = Object.freeze({
  marca: 'A marca', contactos: 'Contactos', redes: 'Redes sociais', horario: 'Horário', legal: 'Dados legais',
  entrega: 'Preços e entrega', mensagens: 'Mensagens do WhatsApp',
});
/* O que o painel nunca muda: o nome (é o logótipo escrito), a pré-visualização, o endereço do site e o
   aviso das mensagens de teste. São do Renato. */
export const BLOQUEADOS_MARCA = Object.freeze(['nome', 'demo', 'endereco', 'mensagens.teste']);

/* Os problemas de dados/marca.json. producao: o site a sério (por omissão, demo === false). */
export function problemasDaMarca(d, { producao } = {}) {
  const ficheiro = FICHEIROS.marca;
  const out = [];
  const ecraDe = (s) => `Dados da marca › ${SECCOES_MARCA[s] || s}`;
  const bloqueia = (chave, s, campo, mensagem) => out.push({ classe: 'bloqueia', chave: `marca:${chave}`, ficheiro, ecra: ecraDe(s), campo, mensagem });
  const avisa = (chave, s, campo, mensagem, extra = {}) => out.push({ classe: 'avisa', chave: `marca:${chave}`, ficheiro, ecra: ecraDe(s), campo, mensagem, ...extra });
  const lembra = (chave, s, campo, mensagem) => avisa(chave, s, campo, mensagem, { lembrete: true });
  if (!eObjecto(d)) { bloqueia('forma', 'marca', undefined, 'Os dados da marca não têm a forma certa. Só o Renato os pode corrigir.'); return out; }
  const aSerio = typeof producao === 'boolean' ? producao : d.demo === false;

  /* Um texto: obrigatório ou não, o tamanho, os caracteres invisíveis e as alegações. */
  const umTexto = (campo, s, rotulo, max, { obrigatorio = false, linha = true } = {}) => {
    const v = valorEmCaminho(d, campo);
    if (vazio(v)) { if (obrigatorio) bloqueia(`${campo}:vazio`, s, campo, `O campo «${rotulo}» está vazio: o site precisa deste texto em todas as páginas.`); return; }
    if (typeof v !== 'string') { if (obrigatorio) bloqueia(`${campo}:tipo`, s, campo, `«${rotulo}» tem de ser texto.`); else avisa(`${campo}:tipo`, s, campo, `«${rotulo}» tem de ser texto.`); return; }
    if (v.length > max) avisa(`${campo}:tamanho`, s, campo, `«${rotulo}» tem mais de ${max} caracteres (tem ${v.length}).`);
    if ((linha ? RE_CONTROLO_LINHA : RE_CONTROLO_TEXTO).test(v)) avisa(`${campo}:controlo`, s, campo, `«${rotulo}» tem caracteres invisíveis. Escreva o texto outra vez.`);
    const w = alegacaoDe(v);
    if (w) bloqueia(`${campo}:alegacao`, s, campo, `«${rotulo}»: «${w}» é uma palavra que a lei só deixa usar com prova (ou uma certificação que não temos). Tire-a.`);
  };

  // --- a marca ---------------------------------------------------------------
  umTexto('nome', 'marca', 'Nome da marca', TAMANHOS.marca, { obrigatorio: true });
  umTexto('assinatura', 'marca', 'Assinatura', TAMANHOS.assinatura, { obrigatorio: true });
  umTexto('servicos', 'marca', 'Serviços', TAMANHOS.servicos, { obrigatorio: true });
  umTexto('descricao', 'marca', 'Descrição do site', TAMANHOS.descricaoSite, { obrigatorio: true, linha: false });
  umTexto('atendimento', 'marca', 'Atendimento', TAMANHOS.atendimento);
  if (typeof d.demo !== 'boolean') bloqueia('demo', 'marca', 'demo', 'Falta dizer se o site é a pré-visualização ou o site a sério. Só o Renato o pode corrigir.');
  if (!vazio(d.endereco) && (typeof d.endereco !== 'string' || !/^https:\/\/[^\s"'<>]+\/$/.test(d.endereco))) avisa('endereco', 'marca', 'endereco', 'O endereço do site começa por https:// e acaba em /. Só o Renato o pode corrigir.');

  // --- contactos ---------------------------------------------------------------
  if (vazio(d.whatsapp)) lembra('whatsapp:vazio', 'contactos', 'whatsapp', 'Falta o número de WhatsApp: os botões do site abrem o WhatsApp sem destinatário, e os pedidos não chegam à loja.');
  else if (!whatsappValido(d.whatsapp)) bloqueia('whatsapp', 'contactos', 'whatsapp', 'O WhatsApp escreve-se com o indicativo e só algarismos: 351 e os 9 algarismos do número (ex.: 351912345678).');
  if (!vazio(d.telefone) && (typeof d.telefone !== 'string' || d.telefone.length > TAMANHOS.telefone || !numeroPortugues(d.telefone))) bloqueia('telefone', 'contactos', 'telefone', 'O telefone tem de ser um número português de 9 algarismos (ex.: 912 345 678).');
  if (!vazio(d.email) && !emailValido(d.email)) bloqueia('email', 'contactos', 'email', 'O e-mail não parece estar certo (ex.: encomendas@exemplo.pt).');
  const r = d.redes;
  if (!ausente(r)) {
    if (!eObjecto(r)) bloqueia('redes', 'redes', 'redes', 'As redes sociais não estão gravadas como deve ser. Escreva-as outra vez.');
    else for (const k of REDES) if (!vazio(r[k]) && !redeValida(k, r[k])) bloqueia(`redes.${k}`, 'redes', `redes.${k}`, `${NOMES_REDES[k]}: escreva o endereço completo da página (ex.: https://www.${k}.com/menta.conecta/), ou deixe vazio.`);
  }

  // --- o horário ----------------------------------------------------------------
  const h = d.horario;
  if (!Array.isArray(h)) bloqueia('horario', 'horario', 'horario', 'O horário não está gravado como deve ser. Escreva-o outra vez.');
  else {
    if (!h.length) lembra('horario:vazio', 'horario', 'horario', 'O horário está vazio: a página de contactos não mostra horas, nem se o atendimento está aberto.');
    if (h.length > TAMANHOS.horario) avisa('horario:muitas', 'horario', 'horario', `O horário tem ${h.length} linhas; o máximo é ${TAMANHOS.horario}.`);
    const intervalos = [[], [], [], [], [], [], [], []];
    const porMarcacao = new Set();
    h.forEach((l, i) => {
      const onde = `A linha ${i + 1} do horário`;
      if (!eObjecto(l)) { bloqueia(`horario.${i}`, 'horario', `horario.${i}`, `${onde} não está como deve ser: escreva-a outra vez.`); return; }
      const dias = l.dias;
      if (!Array.isArray(dias) || !dias.length || !dias.every((x) => inteiroEntre(x, [1, 7]))) { bloqueia(`horario.${i}.dias`, 'horario', `horario.${i}.dias`, `${onde}: escolha os dias (de segunda a domingo).`); return; }
      if (new Set(dias).size !== dias.length) avisa(`horario.${i}.dias:repetidos`, 'horario', `horario.${i}.dias`, `${onde} tem um dia repetido.`);
      if (vazio(l.abre) && vazio(l.fecha)) { dias.forEach((x) => porMarcacao.add(x)); return; }
      if (!horaValida(l.abre) || !horaValida(l.fecha)) { bloqueia(`horario.${i}.horas`, 'horario', `horario.${i}.${horaValida(l.abre) ? 'fecha' : 'abre'}`, `${onde}: as horas escrevem-se como 09:00 e 18:30 (ou ficam as duas vazias, «por marcação»).`); return; }
      const [ab, fe] = [minutosDe(l.abre), minutosDe(l.fecha)];
      if (ab >= fe) { bloqueia(`horario.${i}.horas`, 'horario', `horario.${i}.fecha`, `${onde}: a hora de fechar tem de ser depois da de abrir.`); return; }
      for (const x of new Set(dias)) intervalos[x].push([ab, fe]);
    });
    /* Um dia em mais de uma linha só com horas que não se cruzam (de manhã e à tarde). */
    const cruzados = [];
    for (let x = 1; x <= 7; x++) {
      const l = intervalos[x].sort((p, q) => p[0] - q[0]);
      if (l.some((v, k) => k > 0 && v[0] < l[k - 1][1]) || (porMarcacao.has(x) && l.length)) cruzados.push(x);
    }
    if (cruzados.length) avisa('horario:cruzado', 'horario', 'horario', `O horário tem linhas que se cruzam (${textoDosDias(cruzados).toLowerCase()}): junte-as numa só, ou acerte as horas.`);
  }

  // --- os dados legais (DL 7/2004, art. 10.º) -------------------------------------
  umTexto('firma', 'legal', 'Firma', TAMANHOS.firma);
  umTexto('morada', 'legal', 'Morada', TAMANHOS.morada);
  umTexto('localidade', 'legal', 'Localidade', TAMANHOS.localidade);
  if (!vazio(d.nif) && !nifValido(d.nif)) bloqueia('nif', 'legal', 'nif', 'O NIF não é um NIF português válido: confira os 9 algarismos.');
  if (!vazio(d.codigoPostal) && !(typeof d.codigoPostal === 'string' && /^\d{4}-\d{3}$/.test(d.codigoPostal.trim()))) avisa('codigoPostal', 'legal', 'codigoPostal', 'O código postal tem a forma 1000-001.');
  /* Com o site a sério, a identificação de quem vende tem de estar completa; na pré-visualização o site
     escreve «(por indicar)». */
  if (aSerio) {
    if (vazio(d.firma)) bloqueia('firma:producao', 'legal', 'firma', 'Falta a firma (o nome da empresa, ou do empresário em nome individual): a lei pede-a no site (DL 7/2004, art. 10.º).');
    if (vazio(d.nif)) bloqueia('nif:producao', 'legal', 'nif', 'Falta o NIF: a lei pede-o no site (DL 7/2004, art. 10.º).');
    const falta = ['morada', 'codigoPostal', 'localidade'].find((k) => vazio(d[k]));
    if (falta) bloqueia('morada:producao', 'legal', falta, 'A morada está incompleta: a lei pede a morada geográfica, com a rua, o código postal e a localidade (DL 7/2004, art. 10.º).');
    if (vazio(d.email)) bloqueia('email:producao', 'contactos', 'email', 'Falta o e-mail: a lei pede um contacto por escrito no site (DL 7/2004, art. 10.º).');
  }

  // --- preços e entrega -------------------------------------------------------------
  if (!ausente(d.iva) && !TAXAS_IVA.includes(d.iva)) bloqueia('iva', 'entrega', 'iva', 'A taxa de IVA tem de ser 23, 13, 6 ou 0 (isento).');
  umTexto('entrega', 'entrega', 'Prazo de entrega', TAMANHOS.entrega, { obrigatorio: true });
  umTexto('portes', 'entrega', 'Portes', TAMANHOS.portes, { obrigatorio: true });

  // --- as mensagens do WhatsApp ------------------------------------------------------
  const m = d.mensagens;
  if (!eObjecto(m)) bloqueia('mensagens', 'mensagens', 'mensagens', 'As mensagens do WhatsApp não estão gravadas. Só o Renato as pode repor.');
  else {
    umTexto('mensagens.geral', 'mensagens', 'Mensagem geral', TAMANHOS.mensagem, { obrigatorio: true });
    umTexto('mensagens.duvida', 'mensagens', 'Mensagem das dúvidas', TAMANHOS.mensagem, { obrigatorio: true });
    umTexto('mensagens.maquete', 'mensagens', 'Mensagem da maquete', TAMANHOS.mensagem, { obrigatorio: true });
    if (typeof m.duvida === 'string' && temTexto(m.duvida) && !m.duvida.includes('{produto}')) avisa('mensagens.duvida:produto', 'mensagens', 'mensagens.duvida', 'A mensagem das dúvidas tem de ter «{produto}»: é aí que o site escreve o nome do artigo.');
    if (typeof m.teste !== 'string') bloqueia('mensagens.teste', 'mensagens', 'mensagens.teste', 'Falta o aviso das mensagens de teste. Só o Renato o pode repor.');
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* dados/familias.json                                                 */
/* ------------------------------------------------------------------ */

/* ctx.comArtigos: Set dos slugs das famílias com pelo menos um artigo no site (sem ele, não se lembra
   das que ficam vazias). */
export function problemasDasFamilias(valor, { comArtigos = null } = {}) {
  const ficheiro = FICHEIROS.familias;
  const out = [];
  const l = lerJson(valor);
  if (!Array.isArray(l.obj) || !l.obj.length) {
    out.push({ classe: 'bloqueia', chave: 'familias:forma', ficheiro, ecra: 'Famílias', mensagem: 'As famílias não se conseguem ler: sem elas o site não se consegue gerar. Só o Renato as pode corrigir.' });
    return out;
  }
  const slugs = new Set();
  l.obj.forEach((f, i) => {
    if (!eObjecto(f) || !slugValido(f.slug)) {
      out.push({ classe: 'bloqueia', chave: `familias:${i}:forma`, ficheiro, ecra: 'Famílias', campo: `${i}`, mensagem: `A família ${i + 1} não tem a forma certa. Só o Renato a pode corrigir.` });
      return;
    }
    const s = f.slug;
    const ecra = `Famílias › ${temTexto(f.nome) ? curto(f.nome.trim(), 60) : s}`;
    const bloqueia = (regra, campo, mensagem) => out.push({ classe: 'bloqueia', chave: `familias:${s}${regra}`, ficheiro, ecra, campo: campo === undefined ? undefined : `${i}.${campo}`, mensagem });
    const avisa = (regra, campo, mensagem, extra = {}) => out.push({ classe: 'avisa', chave: `familias:${s}${regra}`, ficheiro, ecra, campo: campo === undefined ? undefined : `${i}.${campo}`, mensagem, ...extra });
    if (slugs.has(s)) { bloqueia(':repetida', undefined, `A família «${s}» está repetida. Só o Renato a pode corrigir.`); return; }
    slugs.add(s);

    const umTexto = (campo, v, rotulo, max, obrigatorio) => {
      if (vazio(v)) { if (obrigatorio) bloqueia(`.${campo}:vazio`, campo, `O campo «${rotulo}» da família está vazio: o site precisa deste texto no menu e na página da família.`); return; }
      if (typeof v !== 'string') { bloqueia(`.${campo}:tipo`, campo, `«${rotulo}» da família tem de ser texto.`); return; }
      if (v.length > max) avisa(`.${campo}:tamanho`, campo, `«${rotulo}» da família tem mais de ${max} caracteres (tem ${v.length}).`);
      if (RE_CONTROLO_LINHA.test(v)) avisa(`.${campo}:controlo`, campo, `«${rotulo}» da família tem caracteres invisíveis. Escreva o texto outra vez.`);
      const w = alegacaoDe(v);
      if (w) bloqueia(`.${campo}:alegacao`, campo, `«${rotulo}» da família: «${w}» é uma palavra que a lei só deixa usar com prova (ou uma certificação que não temos). Tire-a.`);
    };
    umTexto('nome', f.nome, 'Nome', TAMANHOS.familiaNome, true);
    umTexto('grupo', f.grupo, 'Grupo', TAMANHOS.familiaGrupo, true);
    umTexto('frase', f.frase, 'Frase', TAMANHOS.familiaFrase, true);
    umTexto('singular', f.singular, 'Nome no singular', TAMANHOS.singular, false);
    umTexto('sublinhado', f.sublinhado, 'Sublinhado', TAMANHOS.sublinhado, false);
    if (!eObjecto(f.h1)) bloqueia('.h1', 'h1', 'Falta o título da página da família (ex.: «Canetas» + «personalizadas»).');
    else {
      umTexto('h1.antes', f.h1.antes, 'Título', TAMANHOS.h1, true);
      umTexto('h1.destaque', f.h1.destaque, 'Destaque do título', TAMANHOS.h1, true);
    }
    if (!vazio(f.artigo) && !ARTIGOS_GRAMATICAIS.includes(f.artigo)) avisa('.artigo', 'artigo', 'O artigo da família é «o» ou «a» (o título das fichas diz «personalizado» ou «personalizada»).');

    if (vazio(f.icone) || !ICONES_FAMILIA.includes(f.icone)) bloqueia('.icone', 'icone', 'O ícone da família não é nenhum dos da lista: escolha um.');
    const ds = f.desenhos;
    const [minD, maxD] = LIMITES.desenhosFamilia;
    if (!Array.isArray(ds) || ds.length < minD || !ds.every((x) => NOMES_DESENHOS.includes(x))) bloqueia('.desenhos', 'desenhos', `Os desenhos da família têm de ser escolhidos da lista (de ${minD} a ${maxD}).`);
    else if (ds.length > maxD) avisa('.desenhos:muitos', 'desenhos', `A família tem ${ds.length} desenhos; a capa só mostra ${maxD}.`);
    const cc = f.coresCapa;
    const [minC, maxC] = LIMITES.coresCapa;
    if (!Array.isArray(cc) || cc.length < minC || !cc.every(corValida)) bloqueia('.coresCapa', 'coresCapa', `As cores da capa da família são ${minC} ou ${maxC} cores escritas como #1B1D24.`);
    else if (cc.length > maxC) avisa('.coresCapa:muitas', 'coresCapa', `A família tem ${cc.length} cores de capa; o site só usa ${maxC}.`);

    const vs = f.vantagens;
    if (!Array.isArray(vs)) bloqueia('.vantagens', 'vantagens', 'As vantagens da família não estão gravadas como uma lista. Escreva-as outra vez.');
    else {
      if (vs.length > TAMANHOS.vantagens) avisa('.vantagens:muitas', 'vantagens', `A família tem ${vs.length} vantagens; a página só mostra as ${TAMANHOS.vantagens} primeiras.`);
      vs.forEach((v, j) => {
        if (!temTexto(v)) { avisa(`.vantagens.${j}:vazia`, `vantagens.${j}`, `A vantagem ${j + 1} da família está vazia: escreva-a ou tire-a.`); return; }
        umTexto(`vantagens.${j}`, v, `Vantagem ${j + 1}`, TAMANHOS.vantagem, false);
      });
    }
    const fl = f.filtros;
    if (!ausente(fl) && (!eObjecto(fl) || Object.entries(fl).some(([k, v]) => !FILTROS_FAMILIA.includes(k) || typeof v !== 'boolean'))) {
      avisa('.filtros', 'filtros', 'Os filtros da família são «cor», «tipo» e «tinta», cada um ligado ou desligado.');
    }
    const du = f.duvidas;
    if (!ausente(du)) {
      if (!Array.isArray(du)) bloqueia('.duvidas', 'duvidas', 'As dúvidas da família não estão gravadas como uma lista. Escreva-as outra vez.');
      else {
        if (du.length > TAMANHOS.duvidasFamilia) avisa('.duvidas:muitas', 'duvidas', `A família tem ${du.length} dúvidas; o máximo é ${TAMANHOS.duvidasFamilia}.`);
        du.forEach((x, j) => {
          if (!eObjecto(x)) { bloqueia(`.duvidas.${j}`, `duvidas.${j}`, `A dúvida ${j + 1} da família não está como deve ser: escreva-a outra vez.`); return; }
          umTexto(`duvidas.${j}.p`, x.p, `Pergunta ${j + 1}`, TAMANHOS.pergunta, true);
          umTexto(`duvidas.${j}.r`, x.r, `Resposta ${j + 1}`, TAMANHOS.resposta, true);
        });
      }
    }
    if (comArtigos instanceof Set && !comArtigos.has(s)) {
      avisa(':sem-artigos', undefined, 'A família não tem nenhum artigo no site: não aparece no menu, na lista dos produtos nem no rodapé até ter pelo menos um.', { lembrete: true });
    }
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* dados/cores.json                                                    */
/* ------------------------------------------------------------------ */

/* ctx.usadas: coresEmUso() — uma cor em uso não pode sair da paleta. */
export function problemasDasCores(valor, { usadas = null } = {}) {
  const ficheiro = FICHEIROS.cores;
  const out = [];
  const bloqueia = (chave, campo, mensagem) => out.push({ classe: 'bloqueia', chave: `cores:${chave}`, ficheiro, ecra: 'Cores', campo, mensagem });
  const avisa = (chave, campo, mensagem, extra = {}) => out.push({ classe: 'avisa', chave: `cores:${chave}`, ficheiro, ecra: 'Cores', campo, mensagem, ...extra });
  const l = lerJson(valor);
  if (!eObjecto(l.obj) || !Object.keys(l.obj).length) { bloqueia('forma', undefined, 'A paleta das cores não se consegue ler: sem ela o site não se consegue gerar. Só o Renato a pode corrigir.'); return out; }
  const nomes = new Map();
  for (const [k, c] of Object.entries(l.obj)) {
    if (!slugValido(k)) { bloqueia(`${curto(k)}:chave`, k, `«${curto(k)}» não é um nome de cor válido (só minúsculas, algarismos e hífenes). Só o Renato o pode corrigir.`); continue; }
    if (!eObjecto(c)) { bloqueia(`${k}:forma`, k, `A cor «${k}» não tem a forma certa. Só o Renato a pode corrigir.`); continue; }
    if (!temTexto(c.nome)) bloqueia(`${k}.nome`, `${k}.nome`, `Falta o nome da cor «${k}» (o que o site escreve, ex.: Azul royal).`);
    else {
      if (c.nome.length > TAMANHOS.corNome) avisa(`${k}.nome:tamanho`, `${k}.nome`, `O nome da cor «${curto(c.nome)}» tem mais de ${TAMANHOS.corNome} caracteres.`);
      if (RE_CONTROLO_LINHA.test(c.nome)) avisa(`${k}.nome:controlo`, `${k}.nome`, `O nome da cor «${k}» tem caracteres invisíveis. Escreva-o outra vez.`);
      const w = alegacaoDe(c.nome);
      if (w) bloqueia(`${k}.nome:alegacao`, `${k}.nome`, `O nome da cor «${curto(c.nome)}»: «${w}» é uma palavra que a lei só deixa usar com prova. Tire-a.`);
      const n = c.nome.trim().toLowerCase();
      if (nomes.has(n)) avisa(`${k}.nome:repetido`, `${k}.nome`, `Há duas cores com o nome «${curto(c.nome.trim())}» («${nomes.get(n)}» e «${k}»): no site parecem a mesma.`);
      else nomes.set(n, k);
    }
    if (!corValida(c.hex)) bloqueia(`${k}.hex`, `${k}.hex`, `A cor «${temTexto(c.nome) ? curto(c.nome) : k}» tem de ter o código escrito como #1B1D24.`);
    if (!CHAVES_GRUPOS_COR.includes(c.grupo)) bloqueia(`${k}.grupo`, `${k}.grupo`, `O grupo da cor «${temTexto(c.nome) ? curto(c.nome) : k}» não é nenhum dos da lista (o filtro das famílias).`);
  }
  if (usadas instanceof Map) {
    for (const [k, quem] of usadas) {
      if (tem(l.obj, k)) continue;
      const lista = quem.slice(0, 4).join(', ') + (quem.length > 4 ? ` e mais ${quem.length - 4}` : '');
      avisa(`${curto(k)}:em-uso`, k, `A cor «${curto(k)}» não está na paleta, mas ainda é usada por: ${lista}. Volte a pô-la, ou tire-a primeiro desses artigos e packs.`);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* dados/kits.json (os packs)                                          */
/* ------------------------------------------------------------------ */

/* ctx.artigos: Map(slug → { titulo, cores: Set (as que ficam no site), noSite }) — os artigos como o
   site os vai mostrar (sem ele, as peças não se conferem com os artigos). Um pack com um erro fica
   escondido do site (neutraliza); um pack com um artigo que não está no site também sai, com um
   lembrete. */
export function problemasDosPacks(valor, { artigos = null } = {}) {
  const ficheiro = FICHEIROS.kits;
  const out = [];
  const l = lerJson(valor);
  if (!Array.isArray(l.obj)) {
    out.push({ classe: 'bloqueia', chave: 'kits:forma', ficheiro, ecra: 'Packs', mensagem: 'Os packs não se conseguem ler: sem eles o site não se consegue gerar. Só o Renato os pode corrigir.' });
    return out;
  }
  const mapa = artigos instanceof Map ? artigos : null;
  const slugs = new Set();
  l.obj.forEach((k, i) => {
    if (!eObjecto(k) || !slugValido(k.slug)) {
      out.push({ classe: 'bloqueia', chave: `kits:${i}:forma`, ficheiro, ecra: 'Packs', campo: `${i}`, mensagem: `O pack ${i + 1} não tem a forma certa. Só o Renato o pode corrigir.` });
      return;
    }
    const s = k.slug;
    const ecra = `Packs › ${curto(nomeDoPack(k), 60)}`;
    const base = { ficheiro, ecra, pack: s };
    const em = (campo) => (campo === undefined ? undefined : `${i}.${campo}`);
    if (slugs.has(s)) { out.push({ classe: 'bloqueia', chave: `kits:${s}:repetido`, ...base, mensagem: `O pack «${s}» está repetido. Só o Renato o pode corrigir.` }); return; }
    slugs.add(s);
    const esconde = (regra, campo, mensagem, extra = {}) => out.push({ classe: 'neutraliza', efeito: 'esconder', chave: `kits:${s}${regra}`, campo: em(campo), mensagem, ...base, ...extra });
    const avisa = (regra, campo, mensagem, extra = {}) => out.push({ classe: 'avisa', chave: `kits:${s}${regra}`, campo: em(campo), mensagem, ...base, ...extra });
    const FICA = 'O pack fica escondido do site até';

    for (const [campo, rotulo, genero, max] of [['nome', 'o nome', 'o', TAMANHOS.packNome], ['frase', 'a frase', 'a', TAMANHOS.packFrase]]) {
      const v = k[campo];
      if (!temTexto(v)) { esconde(`.${campo}`, campo, `Falta ${rotulo} do pack. ${FICA} estar preenchid${genero}.`); continue; }
      if (v.length > max) avisa(`.${campo}:tamanho`, campo, `${maiuscula(rotulo)} do pack tem mais de ${max} caracteres (tem ${v.length}).`);
      if (RE_CONTROLO_LINHA.test(v)) avisa(`.${campo}:controlo`, campo, `${maiuscula(rotulo)} do pack tem caracteres invisíveis. Escreva o texto outra vez.`);
    }

    const ps = k.pecas;
    const [minP, maxP] = LIMITES.pecas;
    if (!Array.isArray(ps) || ps.length < minP) esconde('.pecas', 'pecas', `O pack não tem peças. ${FICA} ter pelo menos uma.`);
    else {
      if (ps.length > maxP) avisa('.pecas:muitas', 'pecas', `O pack tem ${ps.length} peças; o máximo é ${maxP}.`);
      ps.forEach((pc, j) => {
        const c = `pecas.${j}`;
        const onde = `A peça ${j + 1} do pack`;
        if (!eObjecto(pc)) { esconde(`.${c}`, c, `${onde} não está como deve ser. ${FICA} ser escrita outra vez.`); return; }
        const a = typeof pc.produto === 'string' && mapa ? mapa.get(pc.produto) : null;
        if (!temTexto(pc.produto) || (mapa && !a)) { esconde(`.${c}.produto`, `${c}.produto`, `${onde} não é nenhum dos artigos do site. ${FICA} escolher um.`); return; }
        if (!inteiroEntre(pc.quantidade, LIMITES.quantidadePeca)) esconde(`.${c}.quantidade`, `${c}.quantidade`, `${onde}: a quantidade por pack é um número inteiro, de 1 a ${LIMITES.quantidadePeca[1]}. ${FICA} ser corrigida.`);
        const nomeA = a ? curto(a.titulo, 60) : pc.produto;
        if (!temTexto(pc.cor) || (a && !a.cores.has(pc.cor))) esconde(`.${c}.cor`, `${c}.cor`, `${onde} («${nomeA}») está numa cor que o artigo não tem. ${FICA} escolher uma das cores dele.`);
        if (a && !a.noSite) avisa(`:fora:${pc.produto}`, `${c}.produto`, `O pack usa «${nomeA}», que não está no site (é um rascunho, ou tem um problema): o pack não aparece no site até o artigo voltar.`, { lembrete: true });
      });
    }
    const p = k.preco;
    if (!(numero(p) && p >= LIMITES.precoPack[0] && p <= LIMITES.precoPack[1] && duasCasas(p))) esconde('.preco', 'preco', `O preço do pack é por pack, sem IVA: só o número, sem € (ex.: 39,90). ${FICA} ser corrigido.`);
    if (!inteiroEntre(k.minimo, LIMITES.minimo)) esconde('.minimo', 'minimo', `O mínimo de packs é um número inteiro, de 1 para cima (ex.: 5). ${FICA} ser corrigido.`);
    const inc = k.inclui;
    if (!Array.isArray(inc)) esconde('.inclui', 'inclui', `«O que inclui» não está gravado como uma lista. ${FICA} ser escrito outra vez.`);
    else {
      if (inc.length > TAMANHOS.inclui) avisa('.inclui:muitas', 'inclui', `«O que inclui» tem ${inc.length} linhas; o máximo é ${TAMANHOS.inclui}.`);
      inc.forEach((t, j) => {
        if (!temTexto(t)) avisa(`.inclui.${j}:vazia`, `inclui.${j}`, `A linha ${j + 1} de «O que inclui» está vazia: escreva-a ou tire-a.`);
        else if (t.length > TAMANHOS.incluiTexto) avisa(`.inclui.${j}:tamanho`, `inclui.${j}`, `A linha ${j + 1} de «O que inclui» tem mais de ${TAMANHOS.incluiTexto} caracteres.`);
        else if (RE_CONTROLO_LINHA.test(t)) avisa(`.inclui.${j}:controlo`, `inclui.${j}`, `A linha ${j + 1} de «O que inclui» tem caracteres invisíveis. Escreva-a outra vez.`);
      });
    }
    for (const b of ['destaque', 'publicado']) if (!ausente(k[b]) && typeof k[b] !== 'boolean') avisa(`.${b}`, b, `«${b === 'destaque' ? 'Em destaque' : 'Publicado no site'}» tem de ser sim ou não.`);
    const textos = [['nome', k.nome], ['frase', k.frase], ...(Array.isArray(inc) ? inc.map((t, j) => [`inclui.${j}`, t]) : [])];
    const alegam = textos.map(([campo, t]) => [campo, alegacaoDe(t)]).filter((x) => x[1]);
    if (alegam.length) esconde(':alegacoes', alegam[0][0], `«${alegam[0][1]}» é uma palavra que a lei só deixa usar com prova (ou uma certificação que não temos). ${FICA} a tirar.`);
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* dados/duvidas.json                                                  */
/* ------------------------------------------------------------------ */

export function problemasDasDuvidas(valor) {
  const ficheiro = FICHEIROS.duvidas;
  const out = [];
  const bloqueia = (chave, campo, mensagem) => out.push({ classe: 'bloqueia', chave: `duvidas:${chave}`, ficheiro, ecra: 'Dúvidas', campo, mensagem });
  const avisa = (chave, campo, mensagem) => out.push({ classe: 'avisa', chave: `duvidas:${chave}`, ficheiro, ecra: 'Dúvidas', campo, mensagem });
  const l = lerJson(valor);
  if (!Array.isArray(l.obj)) { bloqueia('forma', undefined, 'As dúvidas não se conseguem ler: sem elas a página inicial não se consegue gerar. Só o Renato as pode corrigir.'); return out; }
  if (l.obj.length > TAMANHOS.duvidas) avisa('muitas', undefined, `Há ${l.obj.length} dúvidas; o máximo é ${TAMANHOS.duvidas}.`);
  l.obj.forEach((x, i) => {
    if (!eObjecto(x)) { bloqueia(`${i}`, `${i}`, `A dúvida ${i + 1} não está como deve ser: escreva-a outra vez.`); return; }
    for (const [k, rotulo, max] of [['p', 'A pergunta', TAMANHOS.pergunta], ['r', 'A resposta', TAMANHOS.resposta]]) {
      const v = x[k];
      const c = `${i}.${k}`;
      if (!temTexto(v)) { bloqueia(`${c}:vazio`, c, `${rotulo} ${i + 1} está vazia: escreva-a, ou tire a dúvida.`); continue; }
      if (v.length > max) avisa(`${c}:tamanho`, c, `${rotulo} ${i + 1} tem mais de ${max} caracteres (tem ${v.length}).`);
      if (RE_CONTROLO_TEXTO.test(v)) avisa(`${c}:controlo`, c, `${rotulo} ${i + 1} tem caracteres invisíveis. Escreva-a outra vez.`);
      const w = alegacaoDe(v);
      if (w) bloqueia(`${c}:alegacao`, c, `${rotulo} ${i + 1}: «${w}» é uma palavra que a lei só deixa usar com prova (ou uma certificação que não temos). Tire-a.`);
    }
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* Todos                                                               */
/* ------------------------------------------------------------------ */

/* problemas(dados, opcoes) → [problema]
 *   opcoes: { producao?: boolean } — o site a sério; sem ele, o que diz a marca (demo: false). */
export function problemas(dados = {}, opcoes = {}) {
  const d = eObjecto(dados) ? dados : {};
  const docs = {};
  const dosFicheiros = [];
  for (const k of Object.keys(FICHEIROS)) {
    if (!tem(d, k)) continue;
    const l = lerJson(d[k]);
    const ficheiro = FICHEIROS[k];
    const ecra = NOMES_FICHEIROS[k];
    if (l.ausente) dosFicheiros.push({ classe: 'bloqueia', chave: `${k}:ausente`, ficheiro, ecra, mensagem: `Falta o ficheiro ${ficheiro}: sem ele o site não se consegue gerar. Só o Renato o pode repor.` });
    else if (l.ilegivel) dosFicheiros.push({ classe: 'bloqueia', chave: `${k}:ilegivel`, ficheiro, ecra, mensagem: `${ecra}: o ficheiro não se consegue ler (JSON inválido: ${l.ilegivel}). Só o Renato o pode corrigir.` });
    else docs[k] = l.obj;
  }
  const producao = typeof opcoes.producao === 'boolean' ? opcoes.producao : eObjecto(docs.marca) && docs.marca.demo === false;
  const familias = tem(docs, 'familias') ? familiasDe(docs.familias) : null;
  const paleta = eObjecto(docs.cores) ? docs.cores : null;

  /* Os artigos primeiro: os packs e as famílias precisam de saber quais ficam no site. */
  const dosArtigos = [];
  const lidos = new Map();
  const mapa = d.artigos;
  if (eObjecto(mapa)) {
    for (const nome of Object.keys(mapa).sort()) {
      const valor = mapa[nome];
      if (ausente(valor)) continue;
      const slug = slugDoFicheiro(nome);
      const base = { ficheiro: ficheiroDoArtigo(nome), ecra: `Artigos › ${slug}`, slug };
      const l = lerJson(valor);
      if (l.ilegivel) { dosArtigos.push({ classe: 'bloqueia', chave: `artigo:${slug}:ilegivel`, ...base, mensagem: `O ficheiro deste artigo não se consegue ler (JSON inválido: ${l.ilegivel}). Só o Renato o pode corrigir.` }); continue; }
      if (!eObjecto(l.obj)) { dosArtigos.push({ classe: 'bloqueia', chave: `artigo:${slug}:forma`, ...base, mensagem: 'O ficheiro deste artigo não tem a forma de um artigo. Só o Renato o pode corrigir.' }); continue; }
      if (!slugValido(slug)) { dosArtigos.push({ classe: 'bloqueia', chave: `artigo:${slug}:endereco`, ...base, mensagem: `O nome do ficheiro («${curto(nome, 60)}») não é um endereço válido (só minúsculas, algarismos e hífenes). Só o Renato o pode corrigir.` }); continue; }
      if (l.obj.slug !== slug) { dosArtigos.push({ classe: 'bloqueia', chave: `artigo:${slug}:slug`, ...base, ecra: ecraDoArtigo(l.obj, slug), campo: 'slug', mensagem: typeof l.obj.slug === 'string' ? `O endereço escrito no artigo («${curto(l.obj.slug, 60)}») não é o nome do ficheiro («${slug}»). Só o Renato o pode corrigir.` : `O artigo não tem o endereço escrito (devia ser «${slug}»). Só o Renato o pode corrigir.` }); continue; }
      const ps = problemasDoArtigo(l.obj, { nome, familias, cores: paleta });
      dosArtigos.push(...ps);
      const bytes = l.texto !== null ? bytesDe(l.texto) : bytesDe(serializar(l.obj));
      if (bytes > TECTOS.artigoBytes * TECTOS.aviso) dosArtigos.push({ classe: 'avisa', lembrete: true, chave: `artigo:${slug}:tecto`, ...base, ecra: ecraDoArtigo(l.obj, slug), mensagem: `Este artigo está a chegar ao limite do painel (${Math.round(bytes / 1024)} de ${TECTOS.artigoBytes / 1024} KB): encurte os textos.` });
      lidos.set(nome, { a: l.obj, problemas: ps });
    }
  }
  /* Como o site vai mostrar cada artigo: se fica no site, e com que cores (as que saem por não
     estarem na paleta já não contam). */
  const vistos = eObjecto(mapa) ? new Map() : null;
  if (vistos) {
    for (const [nome, { a, problemas: ps }] of lidos) {
      const fora = new Set(ps.filter((p) => p.classe === 'neutraliza' && p.efeito === 'sem_cor').map((p) => p.indice));
      const cores = new Set((Array.isArray(a.cores) ? a.cores : []).filter((c, i) => typeof c === 'string' && !fora.has(i)));
      const escondido = ps.some((p) => p.classe === 'neutraliza' && p.efeito === 'esconder');
      vistos.set(nome, { titulo: nomeDoArtigo(a, nome), familia: a.familia, cores, noSite: noSite(a) && !escondido });
    }
  }
  const comArtigos = vistos ? new Set([...vistos.values()].filter((x) => x.noSite).map((x) => x.familia)) : null;

  const lista = [...dosFicheiros];
  if (tem(docs, 'marca')) lista.push(...problemasDaMarca(docs.marca, { producao }));
  if (tem(docs, 'familias')) lista.push(...problemasDasFamilias(docs.familias, { comArtigos }));
  if (tem(docs, 'cores')) lista.push(...problemasDasCores(docs.cores, { usadas: coresEmUso(d) }));
  if (tem(docs, 'kits')) lista.push(...problemasDosPacks(docs.kits, { artigos: vistos }));
  if (tem(docs, 'duvidas')) lista.push(...problemasDasDuvidas(docs.duvidas));
  lista.push(...dosArtigos);
  return lista;
}

/* ------------------------------------------------------------------ */
/* A cópia que o gerador lê                                            */
/* ------------------------------------------------------------------ */

/* neutralizar(dados, lista) → { artigos: { <nome>: objecto }, kits: [objecto] | null, efeitos, mudou }
 *   Os problemas «neutraliza» aplicados a uma CÓPIA (o repositório não muda):
 *     · esconder — publicado: false (sai do site, como um rascunho): um artigo, ou um pack;
 *     · sem_cor  — a cor que não está na paleta sai do artigo (as outras ficam);
 *     · sem_fotos — as fotografias que não servem saem (fotosBoas); sem nenhuma, volta o desenho.
 *   efeitos: o que muda NO SITE: [{ ficheiro, tipo: 'artigo' | 'pack', slug, nome, efeitos, motivos }] */
export function neutralizar(dados = {}, lista = []) {
  const d = eObjecto(dados) ? dados : {};
  const doArtigo = new Map();
  const doPack = new Map();
  for (const p of Array.isArray(lista) ? lista : []) {
    if (!p || p.classe !== 'neutraliza') continue;
    if (typeof p.pack === 'string') doPack.set(p.pack, [...(doPack.get(p.pack) || []), p]);
    else if (typeof p.ficheiro === 'string') doArtigo.set(p.ficheiro, [...(doArtigo.get(p.ficheiro) || []), p]);
  }
  const artigos = {};
  const efeitos = [];
  let mudou = false;
  const mapa = eObjecto(d.artigos) ? d.artigos : {};
  for (const nome of Object.keys(mapa).sort()) {
    const l = lerJson(mapa[nome]);
    if (!eObjecto(l.obj)) continue;
    const a = JSON.parse(JSON.stringify(l.obj));
    const prs = doArtigo.get(ficheiroDoArtigo(nome)) || [];
    const feitos = [];
    const motivos = [];
    const esconder = prs.filter((p) => p.efeito === 'esconder');
    if (esconder.length && a.publicado !== false) {
      a.publicado = false;
      feitos.push('esconder');
      motivos.push(...esconder.map((p) => p.mensagem));
      mudou = true;
    }
    const semCor = prs.filter((p) => p.efeito === 'sem_cor');
    const tirar = new Set(semCor.map((p) => p.indice));
    if (tirar.size && Array.isArray(a.cores)) {
      a.cores = a.cores.filter((c, i) => !tirar.has(i));
      mudou = true;
      if (!feitos.length && a.publicado !== false) { feitos.push('sem_cor'); motivos.push(...semCor.map((p) => p.mensagem)); }
    }
    if (prs.some((p) => p.efeito === 'sem_fotos')) {
      const boas = fotosBoas(a.fotos);
      if (boas.length) a.fotos = boas; else delete a.fotos;
      mudou = true;
      if (!feitos.length && a.publicado !== false) { feitos.push('sem_fotos'); motivos.push(...prs.filter((p) => p.efeito === 'sem_fotos').map((p) => p.mensagem)); }
    }
    artigos[nome] = a;
    if (feitos.length) efeitos.push({ ficheiro: ficheiroDoArtigo(nome), tipo: 'artigo', slug: nome, nome: nomeDoArtigo(l.obj, nome), efeitos: feitos, motivos });
  }
  let kits = null;
  const lk = lerJson(d.kits);
  if (Array.isArray(lk.obj)) {
    kits = lk.obj.map((k) => {
      if (!eObjecto(k)) return k;
      const c = JSON.parse(JSON.stringify(k));
      const prs = typeof k.slug === 'string' ? doPack.get(k.slug) || [] : [];
      if (prs.length && c.publicado !== false) {
        c.publicado = false;
        mudou = true;
        efeitos.push({ ficheiro: FICHEIROS.kits, tipo: 'pack', slug: k.slug, nome: nomeDoPack(k), efeitos: ['esconder'], motivos: prs.map((p) => p.mensagem) });
      }
      return c;
    });
  }
  return { artigos, kits, efeitos, mudou };
}

const DESCRICAO_EFEITOS = { esconder: 'escondido do site', sem_cor: 'sem as cores que não estão na paleta', sem_fotos: 'sem as fotografias que não servem' };
export const descreverEfeitos = (e) => e.efeitos.map((x) => DESCRICAO_EFEITOS[x] || x).join(' e ');

/* O QUE VAI PARA O SITE, a partir da cópia neutralizada (o gerador escreve isto e só isto; o painel
 * diz o mesmo nos ecrãs):
 *   artigos: os publicados de uma família que existe, pela posição (e, com a mesma, pelo slug);
 *   familias: as que têm pelo menos um artigo no site, pela ordem do ficheiro;
 *   kits: os packs publicados cujas peças são todas de artigos no site, numa cor que o artigo tem.
 *   fora: o que não vai — { artigos: [{ slug, familia }], familias: [slug], kits: [slug] }.
 * paraOSite(dados, neutro?) → { familias, artigos, kits, fora } (sem neutro, calcula-o). */
export function paraOSite(dados = {}, neutro = null) {
  const d = eObjecto(dados) ? dados : {};
  const n = eObjecto(neutro) ? neutro : neutralizar(d, problemas(d));
  const lf = lerJson(d.familias).obj;
  const todas = Array.isArray(lf) ? lf.filter((f) => eObjecto(f) && slugValido(f.slug)) : [];
  const existem = new Set(todas.map((f) => f.slug));
  const porNome = eObjecto(n.artigos) ? n.artigos : {};
  const artigos = Object.keys(porNome)
    .map((nome) => ({ ...porNome[nome], slug: nome }))
    .filter((a) => noSite(a) && existem.has(a.familia))
    .sort((a, b) => ordemDe(a) - ordemDe(b) || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  const noSiteSlug = new Map(artigos.map((a) => [a.slug, a]));
  const familias = todas.filter((f) => artigos.some((a) => a.familia === f.slug));
  const ks = Array.isArray(n.kits) ? n.kits : [];
  const pecaBoa = (pc) => eObjecto(pc) && noSiteSlug.has(pc.produto) && Array.isArray(noSiteSlug.get(pc.produto).cores) && noSiteSlug.get(pc.produto).cores.includes(pc.cor);
  const kits = ks.filter((k) => noSite(k) && slugValido(k.slug) && Array.isArray(k.pecas) && k.pecas.length > 0 && k.pecas.every(pecaBoa));
  return {
    familias,
    artigos,
    kits,
    fora: {
      artigos: Object.keys(porNome).filter((nome) => !noSiteSlug.has(nome)).map((nome) => ({ slug: nome, familia: eObjecto(porNome[nome]) ? porNome[nome].familia : undefined })),
      familias: todas.filter((f) => !familias.includes(f)).map((f) => f.slug),
      kits: ks.filter((k) => !kits.includes(k)).map((k) => (eObjecto(k) ? k.slug : undefined)),
    },
  };
}

/* ------------------------------------------------------------------ */
/* O que o painel não pode mudar ao gravar                             */
/* ------------------------------------------------------------------ */

/* mudancasBloqueadas(antes, depois, qual) → [{ caminho, motivo }] ([] = pode gravar)
 *   'artigo':   as chaves que não são CAMPOS_ARTIGO não mudam; o slug (o endereço) também não, depois
 *               de escrito;
 *   'marca':    BLOQUEADOS_MARCA não mudam, e não aparecem chaves novas que não sejam CAMPOS_MARCA;
 *   'familias': nenhuma família sai (pelo slug) e o grupo de cada uma não muda (é ele que diz se a
 *               família é têxtil); a ordem muda (é a do menu) e entram famílias novas, com qualquer
 *               grupo; as chaves que não são CAMPOS_FAMILIA não mudam (nem aparecem numa nova);
 *   'kits':     em cada pack, as chaves que não são CAMPOS_PACK não mudam (os packs entram e saem);
 *   'cores':    em cada cor, as chaves que não são CAMPOS_COR não mudam (as cores entram e saem: uma
 *               cor em uso não sai, mas isso é um problema das regras, problemasDasCores);
 *   'duvidas':  em cada dúvida, as chaves que não são «p» e «r» não mudam. */
export function mudancasBloqueadas(antes, depois, qual = 'marca') {
  const out = [];
  const foraDosCampos = (a, d, campos, prefixo = '') => {
    for (const k of new Set([...Object.keys(a), ...Object.keys(d)])) {
      if (campos.includes(k) || mesmoValor(a[k], d[k])) continue;
      out.push({ caminho: `${prefixo}${k}`, motivo: tem(a, k) ? 'mudou' : 'chave_nova' });
    }
  };
  const obj = (x) => (eObjecto(x) ? x : {});
  const lista = (x) => (Array.isArray(x) ? x : []);
  if (qual === 'artigo') {
    const a = obj(antes); const d = obj(depois);
    foraDosCampos(a, d, CAMPOS_ARTIGO);
    if (tem(a, 'slug') && !mesmoValor(a.slug, d.slug)) out.push({ caminho: 'slug', motivo: 'mudou' });
    return out;
  }
  if (qual === 'familias') {
    /* Pelo slug (o painel muda a ordem e junta famílias): nenhuma sai, e as que não têm a forma de
       uma família (sem slug) ficam como estavam, pela mesma ordem. */
    const a = lista(antes); const d = lista(depois);
    const temSlug = (f) => eObjecto(f) && typeof f.slug === 'string';
    const deDepois = new Map();
    d.forEach((f, i) => { if (temSlug(f) && !deDepois.has(f.slug)) deDepois.set(f.slug, i); });
    const deAntes = new Map(a.filter(temSlug).map((f) => [f.slug, f]));
    for (const [s] of deAntes) if (!deDepois.has(s)) out.push({ caminho: s, motivo: 'saiu' });
    if (!mesmoValor(a.filter((f) => !temSlug(f)), d.filter((f) => !temSlug(f)))) out.push({ caminho: 'familias', motivo: 'forma' });
    d.forEach((f, i) => {
      if (!temSlug(f)) return;
      const f0 = deAntes.get(f.slug);
      if (f0 && !mesmoValor(f0.grupo, f.grupo)) out.push({ caminho: `${i}.grupo`, motivo: 'mudou' });
      foraDosCampos(obj(f0), f, CAMPOS_FAMILIA, `${i}.`);
    });
    return out;
  }
  if (qual === 'kits') {
    const porSlug = new Map(lista(antes).filter(eObjecto).map((k) => [k.slug, k]));
    lista(depois).forEach((k, i) => { if (eObjecto(k)) foraDosCampos(obj(porSlug.get(k.slug)), k, CAMPOS_PACK, `${i}.`); });
    return out;
  }
  if (qual === 'cores') {
    const a = obj(antes);
    for (const [k, c] of Object.entries(obj(depois))) foraDosCampos(obj(a[k]), obj(c), CAMPOS_COR, `${k}.`);
    return out;
  }
  if (qual === 'duvidas') {
    const a = lista(antes);
    lista(depois).forEach((x, i) => foraDosCampos(obj(a[i]), obj(x), CAMPOS_DUVIDA, `${i}.`));
    return out;
  }
  if (qual !== 'marca') return [{ caminho: String(qual), motivo: 'desconhecido' }];
  const a = obj(antes); const d = obj(depois);
  for (const caminho of BLOQUEADOS_MARCA) if (!mesmoValor(valorEmCaminho(a, caminho), valorEmCaminho(d, caminho))) out.push({ caminho, motivo: 'mudou' });
  const conhecidas = new Set([...Object.keys(a), ...CAMPOS_MARCA]);
  for (const k of Object.keys(d)) if (!conhecidas.has(k)) out.push({ caminho: k, motivo: 'chave_nova' });
  return out;
}

/* A ORDEM DAS CHAVES AO GRAVAR: as que já estavam no ficheiro ficam onde estavam; uma nova entra antes
   da primeira que, na ordem do formulário, vem depois dela (e no fim, se nenhuma vier); as que o
   formulário não conhece vão para o fim. As que saíram, saem. Um artigo novo sai pela ordem de
   CAMPOS_ARTIGO. */
export function ordenarComo(antes, depois, ordem = CAMPOS_ARTIGO) {
  if (!eObjecto(depois)) return depois;
  const a = eObjecto(antes) ? antes : {};
  const chaves = Object.keys(a).filter((k) => tem(depois, k));
  const novas = Object.keys(depois).filter((k) => !chaves.includes(k));
  for (const k of novas.filter((x) => ordem.includes(x))) {
    const i = ordem.indexOf(k);
    const j = chaves.findIndex((x) => ordem.includes(x) && ordem.indexOf(x) > i);
    if (j < 0) chaves.push(k); else chaves.splice(j, 0, k);
  }
  chaves.push(...novas.filter((x) => !ordem.includes(x)));
  const out = {};
  for (const k of chaves) out[k] = depois[k];
  return out;
}
