// Ícones de interface (24×24, traço). Escritos à mão: nenhum vem de bibliotecas.
// Os das famílias desenham-se em três camadas (menta, magenta, amarelo) que se
// acertam ao passar o rato (ver .icone-familia no CSS).
const INTERFACE = {
  menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
  fechar: '<path d="M6 6l12 12M18 6L6 18"/>',
  seta: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  'seta-esq': '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  chevron: '<path d="M6 9l6 6 6-6"/>',
  'chevron-esq': '<path d="M15 6l-6 6 6 6"/>',
  'chevron-dir': '<path d="M9 6l6 6-6 6"/>',
  visto: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  menos: '<path d="M5 12h14"/>',
  lixo: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
  orcamento: '<path d="M8 4h8l1 2h2v15H5V6h2z"/><path d="M8 4v3h8V4M9 12h6M9 16h4"/>',
  email: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M4 7l8 6 8-6"/>',
  telefone: '<path d="M6.6 3.5h2.6l1.4 4.1-2 1.5a12 12 0 0 0 6.3 6.3l1.5-2 4.1 1.4v2.6a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2z"/>',
  morada: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  relogio: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  copiar: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  ligacao: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
  carregar: '<path d="M12 16V4M7 9l5-5 5 5M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16"/>',
  imagem: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="M4 18l5-5 4 4 2.5-2.5L20 19"/>',
  pausa: '<path d="M9 6v12M15 6v12"/>',
  tocar: '<path d="M8 5.5v13l10-6.5z"/>',
  maquete: '<rect x="3.5" y="4.5" width="17" height="13" rx="2"/><path d="M8 21h8M12 17.5V21"/><path d="M8.5 11.5l2.5 2.5 4.5-5"/>',
  equipa: '<circle cx="9" cy="8.5" r="3"/><circle cx="17" cy="9.5" r="2.4"/><path d="M3.5 19c.6-3.3 2.8-5 5.5-5s4.9 1.7 5.5 5M14.5 14.6c.7-.4 1.6-.6 2.5-.6 2.2 0 3.8 1.4 4.3 4.5"/>',
  camiao: '<path d="M2.5 6.5h11v9h-11zM13.5 9.5h4l3 3.2v2.8h-7z"/><circle cx="6.5" cy="17.2" r="1.8"/><circle cx="16.8" cy="17.2" r="1.8"/>',
  pincel: '<path d="M14.5 4.5l5 5-8 8-5-5z"/><path d="M6.5 12.5l-2 6 6-2"/>',
  estrela: '<path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>',
  instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".6" fill="currentColor"/>',
  facebook: '<path d="M14.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.5V4.4a20 20 0 0 0-2.3-.1c-2.3 0-3.8 1.4-3.8 3.9v2.3H9v3h2.5V21"/>',
  linkedin: '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M8 10.5V16M8 7.6v.1M11.5 16v-5.5M11.5 13c0-1.6 1-2.6 2.4-2.6s2.1.9 2.1 2.6V16"/>',
  whatsapp: '<path d="M20.5 11.6a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.5-4.3A8.5 8.5 0 1 1 20.5 11.6z"/><path d="M9 8.6c.2 2.8 2.9 5.5 5.7 5.8l1.1-1.2-1.8-1-1 .7c-.9-.4-1.6-1.1-2-2l.7-1-1-1.8z"/>',
  livro: '<path d="M4.5 5.5A2 2 0 0 1 6.5 3.5H19v15H6.5a2 2 0 0 0-2 2z"/><path d="M4.5 20.5a2 2 0 0 1 2-2H19v2.5"/>',
};
// Famílias: os ícones que uma família pode ter (a lista que o painel oferece). As regras
// (scripts/regras.mjs, ICONES_FAMILIA) têm uma cópia; o scripts/test-regras.mjs falha se divergirem.
const FAMILIAS = {
  caneta: '<path d="M16.5 3.5l4 4L9 19l-5 1 1-5z"/><path d="M14 6l4 4"/>',
  tshirt: '<path d="M8.6 5.2 4.3 7.3l1.5 3 1.6-.8V20h9.2v-10.5l1.6.8 1.5-3-4.3-2.1c-.4 1.1-1.8 1.9-3.4 1.9s-3-.8-3.4-1.9z"/>',
  polo: '<path d="M8.6 5.2 4.3 7.3l1.5 3 1.6-.8V20h9.2v-10.5l1.6.8 1.5-3-4.3-2.1"/><path d="M8.6 5.2l1.8 2.6L12 6.6l1.6 1.2 1.8-2.6M12 6.6v4"/>',
  hoodie: '<path d="M8 8.2 4.2 10.1l1.4 3.9 1.5-.6V20h9.8v-6.6l1.5.6 1.4-3.9L16 8.2"/><path d="M8 8.2C8 5.6 9.8 3.8 12 3.8s4 1.8 4 4.4c-1 .9-2.4 1.4-4 1.4s-3-.5-4-1.4zM9.2 15.6h5.6v2.6H9.2z"/>',
  casaco: '<path d="M8.6 4.4 4.3 6.8V20h15.4V6.8l-4.3-2.4"/><path d="M8.6 4.4 12 8l3.4-3.6M12 8v12M7 11v3M17 11v3"/>',
  bone: '<path d="M4.6 14.6a7.4 6.4 0 0 1 14.8 0z"/><path d="M4.6 14.6h9.2c2.6 0 4.9.5 6.4 1.7M12 8.2v6.4"/>',
  garrafa: '<path d="M10 2.5h4v3l1.6 2.6V20a2 2 0 0 1-2 2h-3.2a2 2 0 0 1-2-2V8.1L10 5.5zM8.4 12.5h7.2"/>',
  caneca: '<path d="M4.5 7.5h11V17a3 3 0 0 1-3 3h-5a3 3 0 0 1-3-3z"/><path d="M15.5 9.5h1.8a2.5 2.5 0 0 1 0 5h-1.8M8 3.5c-.6.9.6 1.6 0 2.5M11.5 3.5c-.6.9.6 1.6 0 2.5"/>',
  impressao: '<path d="M6.5 9V3.5h11V9M6.5 17H4.5v-6.5a1.5 1.5 0 0 1 1.5-1.5h12a1.5 1.5 0 0 1 1.5 1.5V17h-2"/><path d="M6.5 14h11v6.5h-11z"/>',
  'garrafa-termica': '<path d="M7.5 8.5h9V20a1.5 1.5 0 0 1-1.5 1.5H9A1.5 1.5 0 0 1 7.5 20zM8 8.5v-3h8v3M10 5.5V4a2 2 0 0 1 4 0v1.5M7.5 17.5h9"/>',
  'porta-chaves': '<circle cx="8" cy="7" r="4.2"/><path d="M10.9 9.9l1.4 1.4M11 12.74l2.26-2.26a2.4 2.4 0 0 1 3.4 0l4.38 4.38a2.4 2.4 0 0 1 0 3.4l-2.26 2.26a2.4 2.4 0 0 1-3.4 0L11 16.14a2.4 2.4 0 0 1 0-3.4z"/><circle cx="13.8" cy="13.3" r=".7"/>',
  'guarda-chuva': '<path d="M3 12.5a9 8.5 0 0 1 18 0c-1.5-1.2-3-1.2-4.5 0-1.5-1.2-3-1.2-4.5 0-1.5-1.2-3-1.2-4.5 0-1.5-1.2-3-1.2-4.5 0z"/><path d="M12 4V2.5M12 4c-2.4 2-3.8 5-4.5 8.5M12 4c2.4 2 3.8 5 4.5 8.5M12 12.5V19a2 2 0 0 1-4 0"/>',
  agenda: '<rect x="7" y="2.5" width="13" height="17" rx="2.5"/><path d="M16.5 2.5v17M11 19.5v3l1.2-1 1.2 1v-3M4 4v12l.9 2 .9-2V4zM3.4 8H7"/>',
};
const P = { ...INTERFACE, ...FAMILIAS };
export const NOMES_ICONES_FAMILIA = Object.keys(FAMILIAS);

export function icone(nome, { classe = '', titulo = '' } = {}) {
  const p = P[nome];
  if (!p) throw new Error(`ícone desconhecido: ${nome}`);
  const a = titulo ? `role="img" aria-label="${titulo}"` : 'aria-hidden="true"';
  return `<svg class="icone${classe ? ' ' + classe : ''}" viewBox="0 0 24 24" ${a} focusable="false">${p}</svg>`;
}

// O ícone de uma família em três camadas de tinta + a linha preta por cima.
export function iconeFamilia(nome) {
  const p = P[nome];
  if (!p) throw new Error(`ícone desconhecido: ${nome}`);
  return `<svg class="icone-familia" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g class="if-c">${p}</g><g class="if-m">${p}</g><g class="if-a">${p}</g><g class="if-k">${p}</g></svg>`;
}
