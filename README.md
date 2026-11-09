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

## Comandos

```sh
node scripts/gerar.mjs          # gera o _site/
node scripts/auditar.mjs        # o travão antes de publicar
node scripts/servir.mjs         # http://localhost:8940/MentaConecta/
node scripts/testar.mjs         # a bateria (Chromium e WebKit, computador e telemóvel)
node scripts/imagens.mjs        # ícones e imagens de partilha
node scripts/facetas.mjs        # os fundos de triângulos (assets/img/)
```

Cada push para `main` gera, audita e publica (`.github/workflows/publicar.yml`).

## Antes de abrir ao público

Firma, NIF e morada; horário; artigos, preços, mínimos e técnicas reais; prazos e portes;
o domínio `mentaconecta.pt` (ficheiro `CNAME`) e `demo: false` em `dados/marca.json`.
