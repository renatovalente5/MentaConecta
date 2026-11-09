# Menta Conecta — site

Fardamentos, gráfica rápida e brindes com a marca dos clientes. Site estático feito por
`scripts/gerar.mjs` (Node, sem dependências) para o GitHub Pages; pré-visualização em
https://renatovalente5.github.io/MentaConecta/ (`noindex` enquanto `demo: true`).

## Como funciona

- **Dados:** `dados/marca.json` (contactos, mensagens, IVA), `dados/familias.json`,
  `dados/produtos/<slug>.json` (um ficheiro por artigo, como o painel os vai gravar),
  `dados/kits.json` (os packs), `dados/cores.json`, `dados/duvidas.json`.
- **Desenhos:** os artigos são desenhos SVG (`assets/js/desenhos.js`) pintados por `--cor`;
  mudar a cor é mudar uma variável. O logótipo do visitante aparece em todos os desenhos.
- **Pedido:** o visitante junta artigos ao orçamento e envia tudo numa só mensagem por
  WhatsApp ou e-mail. Não há pagamentos no site.
- **Logótipo da Menta:** `assets/logo/menta-m.png` é o M original, só sem o fundo. Não se
  redesenha.
- **Regras dos dados:** `scripts/regras.mjs`, um módulo sem dependências que o painel vai copiar
  byte a byte. Cada problema pára a publicação (`bloqueia`), esconde só aquele artigo ou pack
  (`neutraliza`) ou só avisa (`avisa`; os lembretes não impedem gravar). A guarda e o gerador
  usam-nas: um artigo com um erro sai do site e os outros publicam-se.
- **Rascunhos:** `"publicado": false` num artigo tira-o do site inteiro (páginas, grelhas,
  catálogo, packs que o usam, sitemap). Uma família sem artigos publicados desaparece.
- **Horário:** só `horario` em `dados/marca.json` (dias 1 = segunda … 7 = domingo; uma linha sem
  horas é «Por marcação»); o texto da página de contactos sai daí.

## Comandos

```sh
node scripts/test-regras.mjs    # as regras dos dados, à prova (dados de ensaio e os de hoje)
node scripts/guarda.mjs         # a guarda: o que pára a publicação, o que fica fora do site
node scripts/gerar.mjs          # gera o _site/
node scripts/auditar.mjs        # o travão antes de publicar
node scripts/servir.mjs         # http://localhost:8940/MentaConecta/
node scripts/testar.mjs         # a bateria (Chromium e WebKit, computador e telemóvel)
node scripts/imagens.mjs        # ícones e imagens de partilha
node scripts/facetas.mjs        # os fundos de triângulos (assets/img/)
```

Cada push para `main` testa as regras, passa a guarda, gera, audita e publica
(`.github/workflows/publicar.yml`).

## Antes de abrir ao público

Firma, NIF e morada; horário; artigos, preços, mínimos e técnicas reais; prazos e portes;
o domínio `mentaconecta.pt` (ficheiro `CNAME`) e `demo: false` em `dados/marca.json`.
