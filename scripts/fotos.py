#!/usr/bin/env python3
"""AS FOTOGRAFIAS DOS ARTIGOS PARA A WEB (11 nov 2026).

O painel guarda cada fotografia como um JPEG em media/fotos/ (já reduzida no browser a 2048 px, sem
EXIF). Aqui fazem-se as versões que o site serve: WebP com 480, 960 e 1600 px de largura (sem passar
da largura do original; a de 480 faz-se sempre, é a da lista da família e a do painel), em
.cache/fotos/<nome>-<largura>.webp, e o manifesto .cache/fotos/manifesto.json, que o scripts/site.mjs
lê para escrever as <img> e o gerar.mjs copia para _site/assets/fotos/.

Só se faz o que falta: cada fotografia tem um nome novo em cada envio, por isso uma versão que já está
na pasta é a certa (o CI guarda a pasta entre publicações, actions/cache). Só as fotografias que algum
artigo usa.

    python3 scripts/fotos.py
"""
import glob
import json
import os
import re
import sys

from PIL import Image, ImageOps

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
CACHE = os.path.join(RAIZ, '.cache', 'fotos')
LARGURAS = (480, 960, 1600)
RE_FOTO = re.compile(r'^media/fotos/[a-z0-9]+(?:-[a-z0-9]+)*-[0-9a-f]{8}\.jpg$')


def usadas():
    out = set()
    for f in sorted(glob.glob(os.path.join(RAIZ, 'dados', 'produtos', '*.json'))):
        try:
            with open(f, encoding='utf-8') as fh:
                a = json.load(fh)
        except (OSError, ValueError):
            continue  # a guarda diz o que está mal; aqui só se fazem imagens
        fotos = a.get('fotos') if isinstance(a, dict) else None
        if isinstance(fotos, list):
            out.update(c for c in fotos if isinstance(c, str) and RE_FOTO.match(c))
    return sorted(out)


def main():
    os.makedirs(CACHE, exist_ok=True)
    manifesto = {}
    feitas = 0
    for c in usadas():
        original = os.path.join(RAIZ, c)
        if not os.path.isfile(original):
            print(f'  aviso: {c} não está no repositório (o site deixa-a de fora)')
            continue
        base = os.path.basename(c)[:-4]
        try:
            with Image.open(original) as im:
                im = ImageOps.exif_transpose(im).convert('RGB')
                largura, altura = im.size
                larguras = sorted({w for w in LARGURAS if w <= largura} | {LARGURAS[0]})
                for w in larguras:
                    destino = os.path.join(CACHE, f'{base}-{w}.webp')
                    if os.path.isfile(destino):
                        continue
                    h = max(1, round(altura * w / largura))
                    im.resize((w, h), Image.LANCZOS).save(destino + '.tmp', 'WEBP', quality=80, method=6)
                    os.replace(destino + '.tmp', destino)
                    feitas += 1
        except (OSError, ValueError) as e:
            print(f'  aviso: {c} não abre ({e}); o site deixa-a de fora')
            continue
        manifesto[c] = {'largura': largura, 'altura': altura, 'larguras': larguras}
    with open(os.path.join(CACHE, 'manifesto.json'), 'w', encoding='utf-8') as fh:
        json.dump(manifesto, fh, indent=1, sort_keys=True)
    print(f'fotografias: {len(manifesto)} em uso, {feitas} versões novas')


if __name__ == '__main__':
    sys.exit(main())
