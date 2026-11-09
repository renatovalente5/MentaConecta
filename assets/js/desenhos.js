// OS DESENHOS DOS PRODUTOS.
//
// Cada modelo é um SVG nosso (viewBox 400×400) em que a cor vem de `--cor`, posta
// no elemento que o contém: mudar a cor de um produto é mudar uma variável, sem
// fotografias por cor. As sombras e as luzes são camadas pretas e brancas com
// opacidade (servem para qualquer cor) e os tons derivados saem de `color-mix`
// no CSS (`.d-esc`, `.d-cla`, `.d-costura`…).
//
// Cada forma é um `<symbol id="d-…">` num sprite por página (`sprite()`), e cada
// desenho na página é só `<svg style="--cor:…"><use href="#d-…"/></svg>`
// (`instancia()`): os ids existem uma vez, os gradientes são neutros (preto e
// branco com opacidade) e servem todas as cores. Num sprite repetido por cartão,
// esconder o primeiro cartão apagava os gradientes dos outros no Chromium.
//
// A área de impressão (`AREAS`) refere dois símbolos do logótipo do cliente: a
// versão a cores e a versão clara (gravação), feita em canvas no carregamento
// (o Safari não aplica `filter` a um `<image>` de SVG). Escrever o `href` desses
// dois `<image>` muda o logótipo em todos os desenhos da página de uma vez; cada
// desenho escolhe a versão com `--usa-claro` (ver desenhos.css).

function gradientes() {
  return `<defs>
<linearGradient id="dg-lados" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".24"/><stop offset=".2" stop-color="#000" stop-opacity=".02"/><stop offset=".5" stop-color="#fff" stop-opacity=".06"/><stop offset=".8" stop-color="#000" stop-opacity=".02"/><stop offset="1" stop-color="#000" stop-opacity=".26"/></linearGradient>
<linearGradient id="dg-cima" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".14"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".16"/></linearGradient>
<linearGradient id="dg-cilindro" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".34"/><stop offset=".14" stop-color="#000" stop-opacity=".06"/><stop offset=".27" stop-color="#fff" stop-opacity=".42"/><stop offset=".36" stop-color="#fff" stop-opacity=".04"/><stop offset=".74" stop-color="#000" stop-opacity=".06"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></linearGradient>
<radialGradient id="dg-luz" cx=".38" cy=".26" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<radialGradient id="dg-chao" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#151A33" stop-opacity=".22"/><stop offset=".6" stop-color="#151A33" stop-opacity=".08"/><stop offset="1" stop-color="#151A33" stop-opacity="0"/></radialGradient>
<linearGradient id="dg-metal" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#7C828E"/><stop offset=".3" stop-color="#F3F5F8"/><stop offset=".55" stop-color="#B7BDC6"/><stop offset=".8" stop-color="#E4E7EC"/><stop offset="1" stop-color="#6E747F"/></linearGradient>
<linearGradient id="dg-metal-v" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#E9ECF0"/><stop offset=".5" stop-color="#AEB4BD"/><stop offset="1" stop-color="#E2E5EA"/></linearGradient>
<linearGradient id="dg-bambu" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#9C7442"/><stop offset=".3" stop-color="#E2BE84"/><stop offset=".6" stop-color="#C79A5C"/><stop offset="1" stop-color="#8A6233"/></linearGradient>
<linearGradient id="dg-papel" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#EEF0F4"/></linearGradient>
<pattern id="dp-polar" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r=".9" fill="#fff" fill-opacity=".1"/><circle cx="4.5" cy="4.5" r=".9" fill="#000" fill-opacity=".08"/></pattern>
<pattern id="dp-canelado" width="4" height="10" patternUnits="userSpaceOnUse"><rect width="2" height="10" fill="#000" fill-opacity=".1"/></pattern>
</defs>`;
}

// Peças comuns a vários desenhos.
const chao = (cx = 200, cy = 364, rx = 118, ry = 11) => `<ellipse class="d-chao" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`;
const logo = (a) => {
  const usos = `<rect class="d-area" x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" rx="6"/><use class="d-logo" href="#logo-cor" x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}"/><use class="d-logo-claro" href="#logo-claro" x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}"/>`;
  return a.rot ? `<g transform="rotate(${a.rot} ${a.x + a.w / 2} ${a.y + a.h / 2})">${usos}</g>` : usos;
};
// Corpo + sombras + luz + contorno com o mesmo caminho: a forma só se escreve uma vez.
const corpo = (d, extra = '') => `<path class="d-cor" d="${d}"/>${extra}<path class="d-sombra-lados" d="${d}"/><path class="d-luz" d="${d}"/>`;
const contorno = (d) => `<path class="d-contorno" d="${d}"/>`;

// As áreas de impressão de cada desenho, na escala do viewBox. `tecnica` diz como o
// logótipo se mostra: «cor» (DTF, sublimação, impressão: a cores), «gravacao» (laser:
// tom metálico), «bordado» (a cores, ligeiramente mais saturado).
export const AREAS = {
  tshirt: { frente: { x: 152, y: 116, w: 96, h: 100 }, tecnica: 'cor' },
  'tshirt-tecnica': { frente: { x: 152, y: 120, w: 96, h: 96 }, tecnica: 'cor' },
  polo: { frente: { x: 220, y: 128, w: 50, h: 40 }, tecnica: 'bordado' },
  'polo-ml': { frente: { x: 220, y: 128, w: 50, h: 40 }, tecnica: 'bordado' },
  sweat: { frente: { x: 152, y: 124, w: 96, h: 96 }, tecnica: 'cor' },
  hoodie: { frente: { x: 158, y: 176, w: 84, h: 66 }, tecnica: 'cor' },
  softshell: { frente: { x: 222, y: 132, w: 52, h: 40 }, tecnica: 'bordado' },
  colete: { frente: { x: 222, y: 132, w: 52, h: 40 }, tecnica: 'bordado' },
  polar: { frente: { x: 222, y: 140, w: 52, h: 40 }, tecnica: 'bordado' },
  bone: { frente: { x: 166, y: 162, w: 68, h: 44 }, tecnica: 'bordado' },
  chapeu: { frente: { x: 164, y: 168, w: 72, h: 42 }, tecnica: 'bordado' },
  'saco-tote': { frente: { x: 140, y: 196, w: 120, h: 110 }, tecnica: 'cor' },
  'saco-mochila': { frente: { x: 146, y: 168, w: 108, h: 104 }, tecnica: 'cor' },
  lanyard: { frente: { x: 162, y: 290, w: 76, h: 46 }, tecnica: 'cor' },
  'garrafa-aluminio': { frente: { x: 170, y: 186, w: 60, h: 96 }, tecnica: 'gravacao' },
  'garrafa-termica': { frente: { x: 170, y: 172, w: 60, h: 104 }, tecnica: 'gravacao' },
  'copo-termico': { frente: { x: 170, y: 176, w: 60, h: 80 }, tecnica: 'gravacao' },
  caneca: { frente: { x: 142, y: 172, w: 96, h: 92 }, tecnica: 'cor' },
  'caneca-esmaltada': { frente: { x: 146, y: 180, w: 88, h: 84 }, tecnica: 'cor' },
  'caneta-clique': { frente: { x: 146, y: 168, w: 108, h: 16, rot: -90 }, tecnica: 'gravacao' },
  'caneta-touch': { frente: { x: 146, y: 168, w: 108, h: 16, rot: -90 }, tecnica: 'gravacao' },
  'caneta-bambu': { frente: { x: 152, y: 160, w: 96, h: 16, rot: -90 }, tecnica: 'gravacao' },
  'caneta-fina': { frente: { x: 150, y: 168, w: 100, h: 13, rot: -90 }, tecnica: 'gravacao' },
  cartoes: { frente: { x: 140, y: 178, w: 120, h: 58 }, tecnica: 'cor' },
  flyer: { frente: { x: 156, y: 100, w: 98, h: 58 }, tecnica: 'cor' },
  autocolantes: { frente: { x: 116, y: 150, w: 112, h: 112 }, tecnica: 'cor' },
  rollup: { frente: { x: 166, y: 76, w: 68, h: 60 }, tecnica: 'cor' },
  caderno: { frente: { x: 150, y: 150, w: 96, h: 86 }, tecnica: 'cor' },
  'porta-chaves': { frente: { x: 156, y: 214, w: 88, h: 112 }, tecnica: 'gravacao' },
  'porta-chaves-redondo': { frente: { x: 154, y: 206, w: 92, h: 92 }, tecnica: 'cor' },
  'guarda-chuva': { frente: { x: 167, y: 150, w: 66, h: 40 }, tecnica: 'cor' },
  // Na agenda, a área está nas medidas da capa direita (desenhada dentro da matriz).
  agenda: { frente: { x: 26, y: 70, w: 100, h: 84 }, tecnica: 'gravacao' },
};

// ——— Têxtil ———
const T_CORPO = 'M164,64 C178,88 222,88 236,64 C252,69 272,74 288,80 C313,92 334,110 348,131 L316,171 C304,164 292,157 281,151 C282,216 284,281 287,346 Q200,358 113,346 C116,281 118,216 119,151 C108,157 96,164 84,171 L52,131 C66,110 87,92 112,80 C128,74 148,69 164,64 Z';
const T_DENTRO = 'M164,64 C178,88 222,88 236,64 C222,57 178,57 164,64 Z';
const D = {};

D.tshirt = () => `${chao()}
${corpo(T_CORPO)}
<path class="d-esc2" d="${T_DENTRO}"/>
<path class="d-esc" d="M157,61 C171,96 229,96 243,61 L236,64 C222,88 178,88 164,64 Z"/>
<path class="d-costura" d="M155,66 C170,101 230,101 245,66"/>
<path class="d-costura" d="M59,125 L91,165 M341,125 L309,165 M117,333 Q200,345 283,333"/>
<path class="d-vinco" d="M112,82 C122,106 124,129 119,151 M288,82 C278,106 276,129 281,151"/>
<path class="d-vinco d-vinco--largo" d="M138,206 C147,248 143,294 148,338 M262,198 C254,240 259,288 253,336 M122,152 C140,166 151,180 158,196"/>
${contorno(T_CORPO)}`;

D['tshirt-tecnica'] = () => {
  const c = 'M168,62 L200,104 L232,62 C252,68 272,74 290,81 C314,93 334,111 348,131 L318,170 C305,163 293,156 282,150 C283,215 285,280 287,346 Q200,358 113,346 C115,280 117,215 118,150 C107,156 95,163 82,170 L52,131 C66,111 86,93 110,81 C128,74 148,68 168,62 Z';
  return `${chao()}
${corpo(c)}
<path class="d-esc2" d="M168,62 L200,104 L232,62 C218,56 182,56 168,62 Z"/>
<path class="d-esc" d="M160,60 L200,114 L240,60 L232,62 L200,104 L168,62 Z"/>
<path class="d-cla" d="M118,150 C146,124 166,86 170,63 L163,64 C158,92 136,126 112,148 Z M282,150 C254,124 234,86 230,63 L237,64 C242,92 264,126 288,148 Z" opacity=".55"/>
<path class="d-costura" d="M119,151 C146,126 165,90 169,64 M281,151 C254,126 235,90 231,64 M59,125 L91,164 M341,125 L309,164 M117,333 Q200,345 283,333"/>
<path class="d-vinco d-vinco--largo" d="M140,210 C148,250 144,294 149,338 M260,204 C253,244 258,290 252,336"/>
${contorno(c)}`;
};

const POLO_CORPO = 'M160,64 L200,88 L240,64 C254,69 272,74 288,80 C313,92 334,110 348,131 L318,168 C305,161 292,155 281,150 C282,216 284,281 287,346 Q200,358 113,346 C116,281 118,216 119,150 C108,155 95,161 82,168 L52,131 C66,110 87,92 112,80 C128,74 146,69 160,64 Z';
const poloGola = `<path class="d-esc2" d="M160,64 C176,54 224,54 240,64 L200,88 Z"/>
<path class="d-cor" d="M200,92 L162,60 C158,66 160,80 172,106 C180,104 192,98 200,92 Z M200,92 L238,60 C242,66 240,80 228,106 C220,104 208,98 200,92 Z"/>
<path class="d-sombra-lados" d="M200,92 L162,60 C158,66 160,80 172,106 C180,104 192,98 200,92 Z M200,92 L238,60 C242,66 240,80 228,106 C220,104 208,98 200,92 Z"/>
<path class="d-contorno" d="M200,92 L162,60 C158,66 160,80 172,106 C180,104 192,98 200,92 Z M200,92 L238,60 C242,66 240,80 228,106 C220,104 208,98 200,92 Z"/>
<rect class="d-esc" x="191" y="90" width="18" height="62" rx="4"/>
<path class="d-costura" d="M191,152 L209,152"/>
<circle class="d-botao" cx="200" cy="106" r="4"/><circle class="d-botao" cx="200" cy="130" r="4"/>`;

D.polo = () => `${chao()}
${corpo(POLO_CORPO)}
<path class="d-esc" d="M52,131 L82,168 L94,160 L64,122 Z M348,131 L318,168 L306,160 L336,122 Z"/>
<path class="d-canelado" d="M52,131 L82,168 L94,160 L64,122 Z M348,131 L318,168 L306,160 L336,122 Z"/>
${poloGola}
<path class="d-costura" d="M117,333 Q200,345 283,333 M106,82 C120,106 123,129 119,150 M294,82 C280,106 277,129 281,150"/>
<path class="d-vinco d-vinco--largo" d="M140,206 C148,248 144,294 149,338 M260,198 C253,240 258,288 252,336"/>
${contorno(POLO_CORPO)}`;

// Mangas compridas: desenham-se antes do corpo, que as tapa no ombro.
const MANGA_E = 'M114,80 C92,96 78,140 72,196 C67,244 66,288 66,322 L100,326 C104,290 110,246 118,200 Z';
const MANGA_D = 'M286,80 C308,96 322,140 328,196 C333,244 334,288 334,322 L300,326 C296,290 290,246 282,200 Z';
const mangas = (punho = true) => `<path class="d-cor" d="${MANGA_E}"/><path class="d-cor" d="${MANGA_D}"/>
<path class="d-sombra-lados" d="${MANGA_E}"/><path class="d-sombra-lados" d="${MANGA_D}"/>
<path class="d-vinco d-vinco--largo" d="M86,150 C82,190 80,240 82,300 M314,150 C318,190 320,240 318,300"/>
${punho ? '<path class="d-esc" d="M66,314 L101,318 L100,336 L65,332 Z M334,314 L299,318 L300,336 L335,332 Z"/><path class="d-canelado" d="M66,314 L101,318 L100,336 L65,332 Z M334,314 L299,318 L300,336 L335,332 Z"/>' : ''}
${contorno(MANGA_E)}${contorno(MANGA_D)}`;
const CORPO_ML = 'M160,64 L200,88 L240,64 C256,69 272,74 287,80 C287,150 286,250 288,346 Q200,358 112,346 C114,250 113,150 113,80 C128,74 144,69 160,64 Z';

D['polo-ml'] = () => `${chao()}${mangas()}
${corpo(CORPO_ML)}
${poloGola}
<path class="d-costura" d="M116,333 Q200,345 284,333"/>
<path class="d-vinco d-vinco--largo" d="M140,200 C148,246 144,294 149,338 M260,196 C253,240 258,288 252,336"/>
${contorno(CORPO_ML)}`;

const SWEAT_CORPO = 'M164,62 C178,84 222,84 236,62 C254,68 272,74 288,80 C290,150 290,250 290,330 L110,330 C110,250 110,150 112,80 C128,74 146,68 164,62 Z';
D.sweat = () => `${chao()}${mangas()}
${corpo(SWEAT_CORPO)}
<path class="d-esc2" d="M164,62 C178,84 222,84 236,62 C222,55 178,55 164,62 Z"/>
<path class="d-esc" d="M154,58 C168,100 232,100 246,58 L236,62 C222,84 178,84 164,62 Z"/>
<path class="d-canelado" d="M154,58 C168,100 232,100 246,58 L236,62 C222,84 178,84 164,62 Z"/>
<path class="d-esc" d="M110,324 L290,324 L291,352 Q200,360 109,352 Z"/>
<path class="d-canelado" d="M110,324 L290,324 L291,352 Q200,360 109,352 Z"/>
<path class="d-vinco d-vinco--largo" d="M142,196 C149,240 146,284 150,320 M258,192 C252,236 256,280 252,320"/>
${contorno(SWEAT_CORPO)}${contorno('M110,324 L290,324 L291,352 Q200,360 109,352 Z')}`;

D.hoodie = () => {
  const capuz = 'M150,86 C134,58 146,22 200,20 C254,22 266,58 250,86 C240,70 222,62 200,62 C178,62 160,70 150,86 Z';
  const bolso = 'M146,250 L254,250 L268,316 L132,316 Z';
  return `${chao()}${mangas()}
<path class="d-esc" d="${capuz}"/><path class="d-sombra-lados" d="${capuz}"/>${contorno(capuz)}
${corpo(SWEAT_CORPO)}
<path class="d-esc2" d="M164,62 C176,96 224,96 236,62 C222,56 178,56 164,62 Z"/>
<path class="d-esc" d="M150,60 C164,112 236,112 250,60 L236,62 C224,96 176,96 164,62 Z"/>
<path class="d-cordao" d="M184,100 C182,124 184,140 182,160 M216,100 C218,124 216,140 218,160"/>
<rect class="d-ponteira" x="178.5" y="158" width="7" height="13" rx="3"/><rect class="d-ponteira" x="214.5" y="158" width="7" height="13" rx="3"/>
<path class="d-esc" d="${bolso}" opacity=".55"/><path class="d-costura" d="M150,254 L250,254 M140,256 C150,280 152,300 138,314 M260,256 C250,280 248,300 262,314"/>
${contorno(bolso)}
<path class="d-esc" d="M110,324 L290,324 L291,352 Q200,360 109,352 Z"/><path class="d-canelado" d="M110,324 L290,324 L291,352 Q200,360 109,352 Z"/>
${contorno(SWEAT_CORPO)}${contorno('M110,324 L290,324 L291,352 Q200,360 109,352 Z')}`;
};

const fecho = (y1, y2) => `<path class="d-fecho" d="M200,${y1} L200,${y2}"/><path class="d-dentes" d="M200,${y1} L200,${y2}"/>
<rect class="d-metal" x="195" y="${y1 + 4}" width="10" height="16" rx="3"/><rect class="d-puxador" x="197" y="${y1 + 18}" width="6" height="14" rx="3"/>`;

D.softshell = () => {
  const c = 'M168,46 L232,46 L238,70 C256,74 272,78 288,84 C290,150 290,250 291,348 Q200,358 109,348 C110,250 110,150 112,84 C128,78 144,74 162,70 Z';
  return `${chao()}${mangas(false)}
<path class="d-esc" d="M66,316 L101,320 L100,336 L65,332 Z M334,316 L299,320 L300,336 L335,332 Z"/>
${corpo(c)}
<path class="d-esc" d="M168,46 L232,46 L238,70 L200,78 L162,70 Z"/>
<path class="d-costura" d="M164,66 L236,66 M112,94 C150,104 250,104 288,94 M132,232 L170,232 M230,232 L268,232"/>
<path class="d-fecho-bolso" d="M132,236 L170,236 M230,236 L268,236"/>
<path class="d-vinco d-vinco--largo" d="M140,200 C148,250 144,300 149,340 M260,196 C253,246 258,296 252,340"/>
${fecho(46, 350)}
${contorno(c)}`;
};

D.colete = () => {
  const c = 'M168,46 L232,46 L238,70 C252,74 266,78 278,84 C276,118 290,148 300,160 C300,240 296,300 294,348 Q200,358 106,348 C104,300 100,240 100,160 C110,148 124,118 122,84 C134,78 148,74 162,70 Z';
  return `${chao()}
${corpo(c)}
<path class="d-esc" d="M168,46 L232,46 L238,70 L200,78 L162,70 Z"/>
<path class="d-costura" d="M126,90 C128,120 116,146 106,160 M274,90 C272,120 284,146 294,160 M132,236 L170,236 M230,236 L268,236 M104,196 L296,196"/>
<path class="d-fecho-bolso" d="M132,240 L170,240 M230,240 L268,240"/>
${fecho(46, 350)}
${contorno(c)}`;
};

D.polar = () => {
  const c = 'M170,50 L230,50 L236,72 C256,76 272,80 288,86 C290,150 290,250 290,330 L110,330 C110,250 110,150 112,86 C128,80 144,76 164,72 Z';
  return `${chao()}${mangas()}
${corpo(c, `<path class="d-textura-polar" d="${c}"/>`)}
<path class="d-esc" d="M170,50 L230,50 L236,72 L200,80 L164,72 Z"/>
<path class="d-esc" d="M110,324 L290,324 L291,352 Q200,360 109,352 Z"/><path class="d-canelado" d="M110,324 L290,324 L291,352 Q200,360 109,352 Z"/>
${fecho(50, 160)}
${contorno(c)}${contorno('M110,324 L290,324 L291,352 Q200,360 109,352 Z')}`;
};

// ——— Acessórios ———
D.bone = () => {
  const copa = 'M108,236 C102,160 146,128 200,128 C254,128 298,160 292,236 C252,224 148,224 108,236 Z';
  const pala = 'M98,234 C140,214 260,214 302,234 C308,262 262,288 200,290 C138,288 92,262 98,234 Z';
  return `${chao(200, 304, 124, 12)}
${corpo(copa)}
<path class="d-costura" d="M200,130 C182,168 176,198 176,226 M200,130 C218,168 224,198 224,226 M200,130 C160,150 134,182 126,230 M200,130 C240,150 266,182 274,230"/>
<circle class="d-esc" cx="148" cy="180" r="3.2"/><circle class="d-esc" cx="252" cy="180" r="3.2"/>
${contorno(copa)}
<path class="d-esc" d="${pala}"/><path class="d-luz" d="${pala}"/>
<path class="d-esc2" d="M98,234 C140,214 260,214 302,234 C300,240 296,244 290,246 C250,232 150,232 110,246 C104,244 100,240 98,234 Z" opacity=".55"/>
<path class="d-costura" d="M112,252 C150,272 250,272 288,252 M122,262 C156,280 244,280 278,262"/>
${contorno(pala)}
<ellipse class="d-esc" cx="200" cy="130" rx="9" ry="5"/>`;
};

D.chapeu = () => {
  const copa = 'M138,152 C140,118 260,118 262,152 L272,232 C232,224 168,224 128,232 Z';
  const aba = 'M78,240 C84,210 316,210 322,240 C328,268 72,268 78,240 Z';
  return `${chao(200, 296, 132, 12)}
<path class="d-esc" d="${aba}"/><path class="d-sombra-lados" d="${aba}"/><path class="d-luz" d="${aba}"/>
<path class="d-costura" d="M92,240 C98,220 302,220 308,240 M104,241 C112,226 288,226 296,241"/>
${contorno(aba)}
${corpo(copa)}
<path class="d-costura" d="M140,150 C170,140 230,140 260,150 M132,220 C170,212 230,212 268,220"/>
${contorno(copa)}`;
};

D['saco-tote'] = () => {
  const s = 'M112,150 L288,150 L296,346 Q296,352 290,352 L110,352 Q104,352 104,346 Z';
  return `${chao(200, 362, 110, 9)}
<path class="d-alca" d="M150,154 C146,60 194,52 196,104 C198,128 196,140 194,154"/>
<path class="d-alca" d="M250,154 C254,60 206,52 204,104 C202,128 204,140 206,154"/>
${corpo(s)}
<path class="d-costura" d="M110,166 L290,166"/>
<path class="d-esc" d="M140,150 L160,150 L160,180 L140,180 Z M240,150 L260,150 L260,180 L240,180 Z" opacity=".5"/>
<path class="d-vinco d-vinco--largo" d="M128,190 C134,250 130,300 134,344 M272,186 C266,246 270,300 266,344"/>
${contorno(s)}`;
};

D['saco-mochila'] = () => {
  const s = 'M118,112 L282,112 L294,346 Q294,352 288,352 L112,352 Q106,352 106,346 Z';
  return `${chao(200, 362, 108, 9)}
${corpo(s)}
<path class="d-esc" d="M118,112 L282,112 L283,132 L117,132 Z"/>
<path class="d-cordao d-cordao--grosso" d="M126,122 C150,96 250,96 274,122 M124,124 C112,200 104,280 112,344 M276,124 C288,200 296,280 288,344"/>
<path class="d-esc2" d="M106,338 L120,338 L120,352 L106,352 Z M280,338 L294,338 L294,352 L280,352 Z"/>
<path class="d-vinco d-vinco--largo" d="M140,150 C150,220 146,290 150,340 M260,146 C252,220 256,290 252,340"/>
${contorno(s)}`;
};

D.lanyard = () => {
  const fitaE = 'M120,30 L148,24 L206,262 L186,268 Z';
  const fitaD = 'M280,30 L252,24 L194,262 L214,268 Z';
  return `${chao(200, 366, 76, 7)}
<path class="d-esc" d="${fitaD}"/><path class="d-sombra-lados" d="${fitaD}"/>
<path class="d-cor" d="${fitaE}"/><path class="d-luz" d="${fitaE}"/>
<path class="d-costura" d="M128,36 L190,262 M140,32 L200,260"/>
${contorno(fitaE)}${contorno(fitaD)}
<rect class="d-metal" x="188" y="258" width="24" height="16" rx="5"/>
<path class="d-mosquetao" d="M200,274 C190,274 190,290 200,290 C210,290 210,276 202,276"/>
<rect class="d-cartao" x="150" y="284" width="100" height="62" rx="9"/>
<rect class="d-cartao-furo" x="186" y="290" width="28" height="5" rx="2.5"/>`;
};

// ——— Garrafas e canecas ———
D['garrafa-aluminio'] = () => {
  const g = 'M160,152 C160,122 176,106 188,100 L188,88 L212,88 L212,100 C224,106 240,122 240,152 L240,330 Q240,348 222,348 L178,348 Q160,348 160,330 Z';
  return `${chao(200, 360, 66, 8)}
<path class="d-mosquetao d-mosquetao--grosso" d="M206,64 C230,52 236,30 214,24 C196,20 188,40 196,62"/>
<rect class="d-metal" x="184" y="60" width="32" height="30" rx="6"/>
<path class="d-costura d-costura--metal" d="M186,70 L214,70 M186,78 L214,78"/>
<path class="d-cor" d="${g}"/><path class="d-cil" d="${g}"/>
<path class="d-brilho" d="M176,138 C176,124 182,116 188,112 L188,300"/>
${contorno(g)}`;
};

D['garrafa-termica'] = () => {
  const g = 'M160,108 Q160,96 172,96 L228,96 Q240,96 240,108 L240,330 Q240,350 220,350 L180,350 Q160,350 160,330 Z';
  return `${chao(200, 362, 68, 8)}
<rect class="d-metal" x="164" y="52" width="72" height="48" rx="10"/>
<path class="d-costura d-costura--metal" d="M166,64 L234,64"/>
<path class="d-cor" d="${g}"/><path class="d-cil" d="${g}"/>
<path class="d-metal" d="M160,318 L240,318 L240,330 Q240,350 220,350 L180,350 Q160,350 160,330 Z"/>
<path class="d-brilho" d="M180,112 L180,306"/>
${contorno(g)}`;
};

D['copo-termico'] = () => {
  const g = 'M150,124 L250,124 L238,338 Q237,350 225,350 L175,350 Q163,350 162,338 Z';
  return `${chao(200, 362, 70, 8)}
<path class="d-cor" d="${g}"/><path class="d-cil" d="${g}"/>
<rect class="d-tampa" x="142" y="98" width="116" height="30" rx="10"/>
<rect class="d-tampa-topo" x="150" y="90" width="100" height="14" rx="7"/>
<rect class="d-tampa-furo" x="206" y="93" width="26" height="6" rx="3"/>
<path class="d-brilho" d="M172,140 L182,330"/>
${contorno(g)}`;
};

D.caneca = () => {
  const c = 'M120,128 L270,128 L270,312 Q270,338 244,338 L146,338 Q120,338 120,312 Z';
  return `${chao(200, 350, 110, 10)}
<path class="d-asa" d="M268,170 C318,166 324,240 300,262 C290,272 280,276 268,276"/>
<path class="d-asa-luz" d="M268,170 C318,166 324,240 300,262 C290,272 280,276 268,276"/>
<path class="d-cor" d="${c}"/><path class="d-cil" d="${c}"/>
<ellipse class="d-dentro-caneca" cx="195" cy="128" rx="75" ry="13"/>
<ellipse class="d-bordo" cx="195" cy="128" rx="75" ry="13"/>
${contorno(c)}`;
};

D['caneca-esmaltada'] = () => {
  const c = 'M128,140 L262,140 L262,318 Q262,336 244,336 L146,336 Q128,336 128,318 Z';
  return `${chao(200, 348, 100, 9)}
<path class="d-asa d-asa--fina" d="M260,176 C300,174 304,236 282,252 C276,256 268,258 260,258"/>
<path class="d-cor" d="${c}"/><path class="d-cil" d="${c}"/>
<ellipse class="d-dentro-caneca" cx="195" cy="140" rx="67" ry="11"/>
<ellipse class="d-aro" cx="195" cy="140" rx="67" ry="11"/>
<path class="d-aro-baixo" d="M128,318 Q128,336 146,336 L244,336 Q262,336 262,318"/>
${contorno(c)}`;
};

// ——— Canetas (desenhadas na vertical e inclinadas) ———
const caneta = (tipo) => {
  const fina = tipo === 'fina';
  const w = fina ? 16 : 22, x = 200 - w / 2;
  const corpoD = `M${x},96 L${x + w},96 L${x + w},292 Q${x + w},298 ${x + w - 2},300 L${x + 2},300 Q${x},298 ${x},292 Z`;
  const ponta = `M${x + 1},300 L${x + w - 1},300 L${203},338 L${197},338 Z`;
  const topo = tipo === 'touch'
    ? `<rect class="d-cor" x="${x + 2}" y="62" width="${w - 4}" height="36" rx="4"/><rect class="d-cil" x="${x + 2}" y="62" width="${w - 4}" height="36" rx="4"/><ellipse class="d-borracha" cx="200" cy="60" rx="${w / 2 - 1}" ry="9"/><rect class="d-metal" x="${x}" y="66" width="${w}" height="5" rx="2"/>`
    : `<rect class="d-cor" x="${x + 2}" y="60" width="${w - 4}" height="38" rx="${fina ? 6 : 5}"/><rect class="d-cil" x="${x + 2}" y="60" width="${w - 4}" height="38" rx="5"/>`;
  const bambu = tipo === 'bambu'
    ? `<rect class="d-bambu" x="${x}" y="206" width="${w}" height="88"/><path class="d-no-bambu" d="M${x},236 L${x + w},236 M${x},266 L${x + w},266"/>` : '';
  const aneis = fina ? `<rect class="d-metal" x="${x - 1}" y="190" width="${w + 2}" height="6" rx="2"/>`
    : `<rect class="d-metal" x="${x - 1}" y="258" width="${w + 2}" height="4" rx="1.5"/><rect class="d-metal" x="${x - 1}" y="266" width="${w + 2}" height="4" rx="1.5"/>`;
  return `${chao(200, 352, 84, 8)}
<g transform="rotate(-36 200 200)">
${topo}
<rect class="d-metal" x="${x - 1}" y="92" width="${w + 2}" height="7" rx="2.5"/>
<path class="d-cor" d="${corpoD}"/>${bambu}<path class="d-cil" d="${corpoD}"/>
${aneis}
<path class="d-metal" d="${ponta}"/><circle class="d-ponta" cx="200" cy="341" r="2.6"/>
<path class="d-clip" d="M${x + w - 1},70 L${x + w + 5},72 L${x + w + 5},176 Q${x + w + 5},184 ${x + w + 1},186 L${x + w - 1},186 Z"/>
${contorno(corpoD)}
LOGO
</g>`;
};
D['caneta-clique'] = () => caneta('clique');
D['caneta-touch'] = () => caneta('touch');
D['caneta-bambu'] = () => caneta('bambu');
D['caneta-fina'] = () => caneta('fina');

// ——— Impressão ———
D.cartoes = () => `${chao(200, 316, 120, 10)}
<g transform="rotate(-8 200 210)"><rect class="d-papel" x="118" y="150" width="176" height="104" rx="8"/></g>
<g transform="rotate(5 200 210)"><rect class="d-papel" x="112" y="156" width="176" height="104" rx="8"/></g>
<rect class="d-cor" x="112" y="160" width="176" height="104" rx="8"/><rect class="d-luz" x="112" y="160" width="176" height="104" rx="8"/>
<rect class="d-contorno" x="112" y="160" width="176" height="104" rx="8"/>
<path class="d-linha-texto" d="M140,246 L210,246"/>`;

D.flyer = () => `${chao(200, 344, 104, 9)}
<g transform="rotate(4 200 200)">
<rect class="d-papel" x="126" y="62" width="156" height="224" rx="4"/>
<path class="d-cor" d="M126,66 Q126,62 130,62 L278,62 Q282,62 282,66 L282,170 C230,190 180,150 126,174 Z"/>
<path class="d-luz" d="M126,66 Q126,62 130,62 L278,62 Q282,62 282,66 L282,170 C230,190 180,150 126,174 Z"/>
<path class="d-linha-texto" d="M146,206 L262,206 M146,222 L250,222 M146,238 L230,238"/>
<rect class="d-cor" x="146" y="254" width="62" height="16" rx="8"/>
<rect class="d-contorno" x="126" y="62" width="156" height="224" rx="4"/>
LOGO
</g>`;

D.autocolantes = () => `${chao(200, 330, 120, 10)}
<g transform="rotate(10 290 230)"><rect class="d-papel-autocolante" x="236" y="176" width="104" height="104" rx="26"/><rect class="d-esc" x="244" y="184" width="88" height="88" rx="20"/><path class="d-brilho" d="M256,196 L270,196"/></g>
<path class="d-papel-autocolante" d="M298,104 l9,21 22,2 -17,14 5,22 -19,-12 -19,12 5,-22 -17,-14 22,-2 Z"/>
<path class="d-cla" d="M298,114 l6,14 15,1.5 -11.5,9.5 3.4,15 -12.9,-8 -12.9,8 3.4,-15 -11.5,-9.5 15,-1.5 Z"/>
<circle class="d-papel-autocolante" cx="172" cy="206" r="72"/>
<circle class="d-cor" cx="172" cy="206" r="62"/><circle class="d-luz" cx="172" cy="206" r="62"/>`;

D.rollup = () => `${chao(200, 356, 92, 8)}
<rect class="d-papel" x="152" y="40" width="96" height="290" rx="3"/>
<path class="d-cor" d="M152,43 Q152,40 155,40 L245,40 Q248,40 248,43 L248,200 C220,220 180,180 152,206 Z"/>
<path class="d-luz" d="M152,43 Q152,40 155,40 L245,40 Q248,40 248,43 L248,200 C220,220 180,180 152,206 Z"/>
<path class="d-linha-texto" d="M168,236 L232,236 M168,252 L222,252 M168,268 L210,268"/>
<rect class="d-cor" x="168" y="290" width="52" height="14" rx="7"/>
<rect class="d-contorno" x="152" y="40" width="96" height="290" rx="3"/>
<rect class="d-metal-v" x="136" y="328" width="128" height="16" rx="6"/>
<path class="d-pe" d="M146,344 L134,354 M254,344 L266,354"/>`;

D.caderno = () => {
  const capa = 'M128,82 L286,82 Q296,82 296,92 L296,318 Q296,328 286,328 L128,328 Q118,328 118,318 L118,92 Q118,82 128,82 Z';
  return `${chao(208, 340, 110, 10)}
<path class="d-folhas" d="M126,88 L292,88 L300,96 L300,322 L292,332 L126,332 Z"/>
<path class="d-linhas-folhas" d="M296,104 L301,104 M296,120 L301,120 M296,136 L301,136 M296,152 L301,152 M296,168 L301,168 M296,184 L301,184 M296,200 L301,200 M296,216 L301,216 M296,232 L301,232 M296,248 L301,248 M296,264 L301,264 M296,280 L301,280 M296,296 L301,296"/>
${corpo(capa)}
<path class="d-fita" d="M232,328 L232,358 L240,350 L248,358 L248,328 Z"/>
<rect class="d-elastico" x="266" y="80" width="9" height="250" rx="3"/>
${contorno(capa)}`;
};

// ——— Porta-chaves ———
// Formas em caminho: o círculo com `inv` dá a volta ao contrário e fica furo dentro
// de outra forma (regra nonzero); o retângulo tem os cantos redondos.
const num = (v) => Math.round(v * 100) / 100;
const circ = (cx, cy, r, inv = false) => `M${num(cx - r)},${num(cy)} A${r},${r} 0 1 ${inv ? 0 : 1} ${num(cx + r)},${num(cy)} A${r},${r} 0 1 ${inv ? 0 : 1} ${num(cx - r)},${num(cy)} Z`;
const ret = (x, y, w, h, r) => `M${num(x + r)},${y} H${num(x + w - r)} A${r},${r} 0 0 1 ${num(x + w)},${num(y + r)} V${num(y + h - r)} A${r},${r} 0 0 1 ${num(x + w - r)},${num(y + h)} H${num(x + r)} A${r},${r} 0 0 1 ${x},${num(y + h - r)} V${num(y + r)} A${r},${r} 0 0 1 ${num(x + r)},${y} Z`;
// A argola de frente (o traço é a junta das duas voltas do arame) e os elos, de
// frente (oval) ou de lado (uma barra): passam uns pelos outros só pela ordem.
const argola = (cx, cy, r = 36, e = 8) => {
  const anel = circ(cx, cy, r) + circ(cx, cy, r - e, true);
  const m = r - e / 2, p = (g, rr = m) => `${num(cx + rr * Math.cos(g * Math.PI / 180))},${num(cy + rr * Math.sin(g * Math.PI / 180))}`;
  return `<path class="d-metal" d="${anel}"/><path class="d-costura d-costura--metal" d="M${p(-62)} A${m},${m} 0 1 1 ${p(-100)} M${p(-62)} L${p(-62, r - 0.8)}"/>${contorno(anel)}`;
};
const eloLado = (cx, y, h) => `<rect class="d-metal" x="${cx - 4}" y="${y}" width="8" height="${h}" rx="4"/><rect class="d-contorno" x="${cx - 4}" y="${y}" width="8" height="${h}" rx="4"/>`;
const eloFrente = (cx, cy, rx = 10, ry = 16, e = 4.5) => {
  const d = `M${cx - rx},${cy} A${rx},${ry} 0 1 1 ${cx + rx},${cy} A${rx},${ry} 0 1 1 ${cx - rx},${cy} Z M${cx - rx + e},${cy} A${rx - e},${ry - e} 0 1 0 ${cx + rx - e},${cy} A${rx - e},${ry - e} 0 1 0 ${cx - rx + e},${cy} Z`;
  return `<path class="d-metal" d="${d}"/>${contorno(d)}`;
};

// Alumínio anodizado: a face na cor, o bisel de metal à volta (o corte diamantado)
// e a espessura a espreitar em baixo, à direita.
D['porta-chaves'] = () => {
  const aro = ret(138, 170, 124, 178, 22) + circ(200, 192, 8, true);
  const lado = ret(141, 174, 124, 178, 22) + circ(203, 196, 8, true);
  const face = ret(143, 175, 114, 168, 17) + circ(200, 192, 12.5, true);
  return `${chao(200, 362, 78, 8)}
${argola(200, 80)}
${eloFrente(200, 150)}
${eloLado(200, 104, 38)}
<path class="d-esc2" d="${lado}"/>
<path class="d-metal" d="${aro}"/><path d="${aro}" fill="url(#dg-cima)"/>
${corpo(face)}
${contorno(aro)}
${eloLado(200, 156, 42)}`;
};

// Plástico ou acrílico: o disco na cor, com a cúpula ao centro (onde vai o logótipo)
// e o brilho do acrílico.
D['porta-chaves-redondo'] = () => {
  const disco = circ(200, 252, 92) + circ(200, 175, 7.5, true);
  const lado = circ(201.5, 257, 92) + circ(201.5, 180, 7.5, true);
  return `${chao(200, 362, 90, 9)}
${argola(200, 106)}
<path class="d-esc2" d="${lado}"/>
${corpo(disco)}
<path class="d-luz" d="${circ(200, 252, 69)}"/>
<circle class="d-contorno" cx="200" cy="252" r="69"/>
<path class="d-brilho" d="M145.6,226.6 A60,60 0 0 1 174.6,197.6"/>
${contorno(disco)}
${eloLado(200, 132, 48)}`;
};

// ——— Guarda-chuva ———
// A copa é uma calote esférica com 8 varetas, vista de cima a 3/4. As contas (uma
// projecção paralela) fazem-se aqui e saem em curvas de Bézier. A silhueta pinta-se
// na cor e, por cima, os cinco gomos da frente, cada um com uma camada clara ou
// escura (alternadas, servem a qualquer cor) mais a sombra da luz, que vem de cima à
// esquerda. O gomo do meio fica virado para quem vê: é nele que vai o logótipo.
D['guarda-chuva'] = () => {
  const cx = 200, cy = 160, R = 152, H = 70, el = 22 * Math.PI / 180, g = Math.PI / 180;
  const rho = (R * R + H * H) / (2 * H), tMax = Math.asin(R / rho), ce = Math.cos(el), se = Math.sin(el);
  const P = (t, f) => [rho * Math.sin(t) * Math.cos(f), H - rho + rho * Math.cos(t), rho * Math.sin(t) * Math.sin(f)];
  const dT = (t, f) => [rho * Math.cos(t) * Math.cos(f), -rho * Math.sin(t), rho * Math.cos(t) * Math.sin(f)];
  const dF = (t, f) => [-rho * Math.sin(t) * Math.sin(f), 0, rho * Math.sin(t) * Math.cos(f)];
  const ecra = ([x, y, z]) => [cx + x, cy - (y * ce + z * se)];
  const mais = (a, [x, y, z], k) => [a[0] + x * k, a[1] - (y * ce + z * se) * k];
  const pt = (p) => `${num(p[0])},${num(p[1])}`;
  const DF = 45 * g, folga = 0.09; // o bordo sobe entre duas varetas
  const vareta = (f, ida) => {
    const a = ecra(P(0, f)), b = ecra(P(tMax, f));
    const ta = mais(a, dT(0, f), tMax / 3), tb = mais(b, dT(tMax, f), -tMax / 3);
    return ida ? `C${pt(ta)} ${pt(tb)} ${pt(b)}` : `C${pt(tb)} ${pt(ta)} ${pt(a)}`;
  };
  const bordo = (f0, ida = true) => {
    const d = (u) => {
      const t = tMax - folga * Math.sin(Math.PI * u), f = f0 + DF * u, dt = -folga * Math.PI * Math.cos(Math.PI * u);
      const a = dT(t, f), b = dF(t, f);
      return [a[0] * dt + b[0] * DF, a[1] * dt + b[1] * DF, a[2] * dt + b[2] * DF];
    };
    const a = ecra(P(tMax, f0)), b = ecra(P(tMax, f0 + DF)), ta = mais(a, d(0), 1 / 3), tb = mais(b, d(1), -1 / 3);
    return ida ? `C${pt(ta)} ${pt(tb)} ${pt(b)}` : `C${pt(tb)} ${pt(ta)} ${pt(a)}`;
  };
  const bico = ecra(P(0, 0)), tras = [ecra(P(tMax, 157.5 * g)), ecra(P(tMax, 22.5 * g))];
  // Gomo k: entre as varetas -67.5° + 45°·k e a seguinte (o 7 é o da frente). A camada
  // clara (branco a 10%) ou escura (preto a 8%) e a sombra (preto) dão uma só camada
  // cinzenta, com a opacidade das duas uma por cima da outra.
  const gomos = [5, 1, 6, 0, 7].map((k) => {
    const f0 = (-67.5 + 45 * k) * g, fm = f0 + DF / 2, tm = tMax * 0.6;
    const luz = Math.sin(tm) * Math.cos(fm) * -0.45 + Math.cos(tm) * 0.75 + Math.sin(tm) * Math.sin(fm) * -0.5;
    const sombra = Math.max(0, Math.min(0.2, (0.9 - luz) * 0.25)), claro = k % 2 === 1, a = claro ? 0.1 : 0.08;
    const alfa = 1 - (1 - a) * (1 - sombra), v = claro ? Math.round(255 * a * (1 - sombra) / alfa) : 0;
    return { d: `M${pt(bico)} ${vareta(f0, true)} ${bordo(f0)} ${vareta(f0 + DF, false)} Z`, tinta: `#${v.toString(16).padStart(2, '0').repeat(3)}`, alfa: num(alfa) };
  });
  const silhueta = `M${pt(tras[0])} A${num(rho)},${num(rho)} 0 0 1 ${pt(tras[1])} ${[1, 0, 7, 6, 5].map((k) => bordo((-67.5 + 45 * k) * g, false)).join(' ')} Z`;
  const pontas = [157.5, -157.5, -112.5, -67.5, -22.5, 22.5].map((a) => { const [x, y] = ecra(P(tMax, a * g)); return `<circle class="d-tampa" cx="${num(x)}" cy="${num(y)}" r="3.4"/>`; }).join('');
  const y0 = 290, y1 = 322, rc = 18, w = 8;
  const pega = `M${cx - w},${y0} L${cx + w},${y0} L${cx + w},${y1} A${rc + w},${rc + w} 0 0 1 ${cx - 2 * rc - w},${y1} A${w},${w} 0 0 1 ${cx - 2 * rc + w},${y1} A${rc - w},${rc - w} 0 0 0 ${cx - w},${y1} Z`;
  return `${chao(200, 360, 100, 9)}
<rect class="d-metal" x="${cx - 3.5}" y="${cy}" width="7" height="${y0 - cy}"/>
<path class="d-tampa" d="${pega}"/>
<rect x="${cx - 5.5}" y="${y0 + 8}" width="3" height="${y1 - y0 - 6}" rx="1.5" fill="#fff" fill-opacity=".22"/>
<rect class="d-metal" x="${cx - 9.5}" y="${y0 - 6}" width="19" height="11" rx="3"/>
<path class="d-cor" d="${silhueta}"/>
${gomos.map(({ d, tinta, alfa }) => `<path d="${d}" fill="${tinta}" fill-opacity="${alfa}"/>`).join('')}
${contorno(gomos.map(({ d }) => d).join(' '))}
<path class="d-luz" d="${silhueta}"/>${contorno(silhueta)}
${pontas}
<rect class="d-metal" x="${num(bico[0] - 3)}" y="${num(bico[1] - 26)}" width="6" height="24" rx="3"/>
<ellipse class="d-tampa" cx="${num(bico[0])}" cy="${num(bico[1])}" rx="9" ry="4.5"/>`;
};

// ——— Agenda ———
// Fechada e virada a 3/4. Tudo se desenha direito no plano da capa, dentro de uma
// matriz (projecção paralela): a contracapa é a capa deslocada por (dx, dy), e a
// lombada e o topo (as folhas) ficam entre as duas. O logótipo vai na capa (LOGO),
// com a área nas medidas da capa direita.
// O casco de um retângulo de cantos redondos arrastado por (dx, dy), para cima e
// para a esquerda: a silhueta de um bloco com espessura.
const casco = (x, y, w, h, r, dx, dy) => {
  const L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
  const p2 = [x + w - r + r * nx, y + r + r * ny], p1 = [p2[0] + dx, p2[1] + dy];
  const p3 = [x + r - r * nx, y + h - r - r * ny], p4 = [p3[0] + dx, p3[1] + dy];
  const q = (p) => `${num(p[0])},${num(p[1])}`;
  return `M${q(p1)} L${q(p2)} A${r},${r} 0 0 1 ${num(x + w)},${num(y + r)} V${num(y + h - r)} A${r},${r} 0 0 1 ${num(x + w - r)},${num(y + h)} H${num(x + r)} A${r},${r} 0 0 1 ${q(p3)} L${q(p4)} A${r},${r} 0 0 1 ${num(x + dx)},${num(y + h - r + dy)} V${num(y + r + dy)} A${r},${r} 0 0 1 ${num(x + r + dx)},${num(y + dy)} H${num(x + w - r + dx)} A${r},${r} 0 0 1 ${q(p1)} Z`;
};
D.agenda = () => {
  const W = 170, A = 244, r = 14, T = 30, b = 34 * Math.PI / 180, e = 20 * Math.PI / 180;
  const cb = Math.cos(b), sb = Math.sin(b), ce = Math.cos(e), se = Math.sin(e);
  const ox = 141, oy = 106, dx = -T * sb / cb, dy = -T * se / (cb * ce);
  const L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
  const capa = ret(0, 0, W, A, r), fx = W - 32;
  // A lombada com os cantos redondos de cima e de baixo (o lado direito fica por baixo da capa).
  const p3 = [r - r * nx, A - r - r * ny];
  const lombada = `M${r},0 L${num(r + dx)},${num(dy)} A${r},${r} 0 0 0 ${num(dx)},${num(r + dy)} V${num(A - r + dy)} A${r},${r} 0 0 0 ${num(p3[0] + dx)},${num(p3[1] + dy)} L${num(p3[0])},${num(p3[1])} A${r},${r} 0 0 0 ${r},${A} Z`;
  const linhas = [0.3, 0.5, 0.7].map((s) => `M${num(r + dx * s)},${num(3 + dy * s)} H${num(W - r + dx * s)}`).join(' ');
  // A caneta na presilha, presa à lombada junto à contracapa (fora da matriz: fica direita).
  const px = num(ox + cb * (-4.5 + dx * 0.8)), py = num(oy - sb * se * (-4.5 + dx * 0.8) + dy * 0.8 * ce);
  // A sombra no chão segue a base da agenda, que sobe para a direita.
  return `<g transform="rotate(-12 205 330)">${chao(205, 330, 102, 11)}</g>
<g transform="matrix(${[cb, -sb * se, 0, ce, ox, oy].map((v) => +v.toFixed(4)).join(' ')})">
<path class="d-esc2" d="M50,232 C50,248 48,258 49,270 L54,265 L59,271 C58,258 60,248 60,232 Z"/>
<path class="d-esc" d="${casco(0, 0, W, A, r, dx, dy)}"/>
<path class="d-folhas" d="${casco(dx * 0.08, 3 + dy * 0.08, W - 3, A - 6, r - 3, dx * 0.84, dy * 0.84)}"/>
<path class="d-linhas-folhas" d="${linhas}"/>
<path class="d-cor" d="${lombada}"/><path class="d-cil" d="${lombada}"/>
<path class="d-esc2" d="M${fx},0 h9 l${num(dx)},${num(dy)} h-9 Z"/>
${corpo(capa)}
<path class="d-costura" d="${ret(8, 8, W - 16, A - 16, r - 6)}"/>
<rect class="d-esc2" x="${fx}" y="0" width="9" height="${A}"/><rect class="d-sombra-lados" x="${fx}" y="0" width="9" height="${A}"/>
<path d="M${fx + 0.7},0 V${A}" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="1"/>
${contorno(capa)}${contorno(casco(0, 0, W, A, r, dx, dy))}
LOGO
</g>
<rect class="d-metal" x="${px - 4.5}" y="${py - 10}" width="9" height="150" rx="4.5"/>
<path class="d-metal" d="M${px - 4},${py + 138} L${px},${py + 151} L${px + 4},${py + 138} Z"/><circle class="d-ponta" cx="${px}" cy="${py + 151}" r="1.7"/>
<rect class="d-clip" x="${px - 4}" y="${py - 4}" width="3" height="50" rx="1.5"/>
<rect class="d-esc2" x="${px - 6.5}" y="${py + 26}" width="${num(ox - px + 4)}" height="22" rx="3"/><rect class="d-sombra-lados" x="${px - 6.5}" y="${py + 26}" width="${num(ox - px + 4)}" height="22" rx="3"/>`;
};

// O símbolo de uma forma (o desenho + a área do logótipo).
export function simbolo(nome) {
  const f = D[nome];
  if (!f) throw new Error(`desenho desconhecido: ${nome}`);
  const area = AREAS[nome];
  let c = f();
  const l = area ? logo(area.frente) : '';
  c = c.includes('LOGO') ? c.replace('LOGO', l) : c + l;
  return `<symbol id="d-${nome}" viewBox="0 0 400 400">${c}</symbol>`;
}

// O sprite da página: os gradientes, as formas pedidas e os dois símbolos do
// logótipo (sem viewBox: o <image> enche a área toda, com «meet»).
export function sprite(nomes = NOMES_DESENHOS) {
  const unicos = [...new Set(nomes)];
  return `<svg class="sprite-desenhos" width="0" height="0" aria-hidden="true" focusable="false">${gradientes()}${unicos.map(simbolo).join('')}<symbol id="logo-cor"><image class="logo-cliente" data-versao="cor" width="100%" height="100%" preserveAspectRatio="xMidYMid meet"/></symbol><symbol id="logo-claro"><image class="logo-cliente" data-versao="claro" width="100%" height="100%" preserveAspectRatio="xMidYMid meet"/></symbol></svg>`;
}

// Um desenho na página. `rotulo` é o nome acessível («T-shirt Clássica em azul
// royal»); sem rótulo é decorativo.
export function instancia(nome, { cor = '#C9CCD6', corDentro = '', rotulo = '', classe = '', tecnica } = {}) {
  // Caneca «Duo»: branca por fora, a cor escolhida dentro e na asa.
  const t = tecnica || AREAS[nome]?.tecnica || 'cor';
  const aria = rotulo ? `role="img" aria-label="${rotulo.replace(/"/g, '&quot;')}"` : 'aria-hidden="true"';
  // cor === null: a cor vem do elemento de fora (cartões filtrados, palco do produto).
  const estilo = `${cor === null ? '' : `--cor:${cor};`}--usa-claro:${t === 'gravacao' ? 1 : 0}${corDentro ? `;--cor-dentro:${corDentro};--cor-asa:${corDentro}` : ''}`;
  return `<svg class="desenho${classe ? ' ' + classe : ''}" viewBox="0 0 400 400" style="${estilo}" ${aria} focusable="false" data-desenho="${nome}"><use href="#d-${nome}"/></svg>`;
}

export const NOMES_DESENHOS = Object.keys(D);
