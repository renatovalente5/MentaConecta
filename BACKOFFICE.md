# Backoffice (Pages CMS) — Menta Conecta

O conteúdo de **Produtos** (`data/products.json`) e **Portfólio** (`data/works.json`),
bem como as **imagens** (`assets/uploads/`), é gerido pelo [Pages CMS](https://pagescms.org)
— um CMS gratuito baseado em Git. Cada alteração é um commit no repositório e o
GitHub Pages republica o site em ~1–2 minutos. **Custo: €0. Sem servidor. Sem cartão.**

A configuração está em [`.pages.yml`](.pages.yml).

## Configuração inicial (uma só vez — feita pelo Renato)

1. **Publicar o repositório no GitHub** e **ativar o GitHub Pages**
   (Settings → Pages → Deploy from a branch → `main` / root).
2. Ir a **https://app.pagescms.org** e **iniciar sessão com o GitHub**.
3. **Instalar a app “Pages CMS”** no repositório `renatovalente5/MentaConecta`
   (quando pedido, dar acesso a este repositório).
4. Abrir o projeto no Pages CMS. O `.pages.yml` é detetado automaticamente e devem
   aparecer três coleções: **Produtos**, **Portfólio** e **Imagens do site**.
5. Testar: adicionar/editar/remover um item e carregar uma imagem. Guardar e confirmar
   que o site atualiza em ~1–2 min.

## Dar acesso ao cliente (sem conta GitHub)

No Pages CMS: **projeto → Settings → Collaborators → Invite by email**.
O cliente recebe um convite e entra por **link de email** (magic-link), sem precisar
de conta GitHub. Pode depois gerir Produtos e Portfólio.

> O cliente acede em **https://app.pagescms.org** ou pelo botão em **`/admin`** no site.

## Como o cliente usa (resumo)

1. Abrir `/admin` no site (ou app.pagescms.org) e iniciar sessão.
2. Escolher **Produtos**, **Portfólio** ou **Imagens do site**.
3. **Adicionar** (＋), **editar** ou **remover** itens; carregar imagens no campo *Imagem*.
   Em **Imagens do site** pode trocar as imagens do topo (hero), dos serviços e do “Sobre”.
4. **Guardar** — o site atualiza sozinho em ~1–2 minutos.

## Notas técnicas

- As imagens carregadas vão para `assets/uploads/`. O caminho gravado pode começar por
  `/` — o frontend normaliza (`normImg()` em `catalog.js`, `portfolio.js` e `main.js`)
  para funcionar no subpath do GitHub Pages (`/MentaConecta/`).
- **Todas as imagens das secções são editáveis:** o topo (hero), os serviços e o “Sobre”
  são geridos na coleção **Imagens do site** (`data/content.json`); Produtos e Portfólio
  têm as suas próprias imagens. Se o `content.json` não carregar, o site mantém as imagens
  por defeito definidas no HTML (nunca fica sem imagem).
- Recomende-se ao cliente carregar imagens já otimizadas para web (≤ ~1500 px, < 500 KB)
  para manter o site rápido e o repositório leve.
