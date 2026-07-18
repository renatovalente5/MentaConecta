# Menta Conecta — Website

Site institucional da **Menta Conecta** — _Conectando marcas, pessoas e ideias!_
Fardamentos • Gráfica rápida • Brindes.

Site estático (HTML/CSS/JS) alojado em **GitHub Pages**, com **backoffice** via **Pages CMS**
(edição de produtos e portfólio sem código, com login por email).

## Estrutura

```
index.html            Página principal
admin/                Acesso ao backoffice (Pages CMS)
.pages.yml            Configuração do backoffice (coleções + media)
assets/
  css/                Design system + componentes
  js/                 Navbar, catálogo, portfólio
  img/                Logo, favicons, fotos otimizadas
  uploads/            Imagens carregadas pelo backoffice
data/
  products.json       Catálogo de produtos/serviços (editável no backoffice)
  works.json          Portfólio de trabalhos (editável no backoffice)
legal/                Páginas legais (privacidade, cookies, termos)
_source/              Fotos originais em alta (NÃO publicado — ver .gitignore)
```

## Ver localmente

O site lê `data/*.json` via `fetch()`, por isso tem de ser servido por HTTP (não abrir com `file://`):

```bash
cd MentaConecta
python3 -m http.server 8000
# abrir http://localhost:8000
```

## Backoffice (gestão de conteúdos)

O conteúdo de **Produtos** e **Portfólio** é gerido no [Pages CMS](https://pagescms.org)
sem tocar em código. Ver `admin/` e as instruções de configuração.

## Contactos

WhatsApp: 966 635 602 · Email: encomendas@mentapersonalizado.pt
Instagram: [@menta.conecta](https://instagram.com/menta.conecta) · Facebook: [/mentaconecta](https://facebook.com/mentaconecta)
