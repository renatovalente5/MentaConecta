#!/usr/bin/env python3
"""PUBLICA UMA PASTA NO ALOJAMENTO DA MENTA por FTP com TLS (11 nov 2026).

    FTP_SENHA=… python3 scripts/publicar-ftp.py _site previa.mentaconecta.pt
    FTP_SENHA_FICHEIRO=~/Chaves/menta-conecta/ftp-publicar.txt python3 scripts/publicar-ftp.py em-breve public_html

O alojamento é o cPanel do Yuri na PTisp (cpp88.webserver.pt). A conta publicar@mentaconecta.pt
vê a pasta pessoal inteira; esta publicação só mexe no que ELA LÁ PÔS:
  - no destino fica um `.publicado.json` com o sha256 de cada ficheiro publicado;
  - sobe só o que mudou (por conteúdo: um preço de 12,50 → 13,50 tem o mesmo tamanho);
  - apaga só o que estava no manifesto anterior e saiu da pasta — o que o cPanel lá põe
    (/.well-known/ do certificado, cgi-bin) nunca é tocado;
  - cada ficheiro sobe com um nome temporário e troca de nome no fim (nunca se serve meio ficheiro),
    e os .html sobem depois do resto (uma página nova nunca aponta para uma imagem que ainda não lá está).

Porquê Python e não o curl: com este servidor (Pure-FTPd), o curl recebia «451» nos envios entre ~20 e
~130 KB e deixava o ficheiro vazio; o ftplib fecha bem o TLS do canal de dados.
"""
import ftplib, hashlib, io, json, os, ssl, sys, time
from pathlib import Path

SERVIDOR = 'cpp88.webserver.pt'
UTILIZADOR = 'publicar@mentaconecta.pt'
MANIFESTO = '.publicado.json'


def senha():
    if os.environ.get('FTP_SENHA'):
        return os.environ['FTP_SENHA'].strip()
    caminho = os.environ.get('FTP_SENHA_FICHEIRO')
    if caminho:
        return Path(os.path.expanduser(caminho)).read_text().strip()
    sys.exit('falta a senha: FTP_SENHA ou FTP_SENHA_FICHEIRO')


def ligar():
    f = ftplib.FTP_TLS(SERVIDOR, context=ssl.create_default_context(), timeout=60)
    f.login(UTILIZADOR, senha())
    f.prot_p()
    return f


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def main(pasta, destino):
    raiz = Path(pasta)
    if not raiz.is_dir():
        sys.exit(f'não há pasta {pasta}')
    destino = destino.strip('/')
    locais = {p.relative_to(raiz).as_posix(): sha(p) for p in sorted(raiz.rglob('*'))
              if p.is_file() and p.name != '.DS_Store'}
    f = ligar()

    antes = {}
    try:
        b = io.BytesIO()
        f.retrbinary(f'RETR {destino}/{MANIFESTO}', b.write)
        antes = json.loads(b.getvalue() or b'{}')
    except ftplib.error_perm:
        pass  # primeira publicação neste destino: sobe tudo

    mudados = [c for c, h in locais.items() if antes.get(c) != h]
    mudados.sort(key=lambda c: (c.endswith('.html'), c))
    sairam = sorted(c for c in antes if c not in locais)

    pastas_feitas = set()

    def garantir_pasta(caminho):
        partes = caminho.split('/')[:-1]
        for i in range(1, len(partes) + 1):
            d = '/'.join([destino] + partes[:i])
            if d in pastas_feitas:
                continue
            try:
                f.mkd(d)
            except ftplib.error_perm:
                pass  # já existe
            pastas_feitas.add(d)

    def enviar(c, tentativas=3):
        nonlocal f
        for t in range(1, tentativas + 1):
            try:
                garantir_pasta(c)
                final = f'{destino}/{c}'
                pasta_, nome = final.rsplit('/', 1)
                temp = f'{pasta_}/.{nome}.a-subir'
                with open(raiz / c, 'rb') as fh:
                    f.storbinary(f'STOR {temp}', fh)
                f.rename(temp, final)
                return
            except (ftplib.Error, OSError) as e:
                if t == tentativas:
                    raise
                print(f'  outra vez ({t}): {c}: {e}')
                time.sleep(2 * t)
                try:
                    f.quit()
                except Exception:
                    pass
                f = ligar()
                pastas_feitas.clear()

    for c in mudados:
        enviar(c)
        print(f'  ↑ {c}')
    for c in sairam:
        try:
            f.delete(f'{destino}/{c}')
            print(f'  × {c}')
        except ftplib.error_perm:
            pass  # já não estava lá
    # As pastas que ficaram vazias (das mais fundas para as de cima); as que têm coisas recusam.
    for d in sorted({c.rsplit('/', 1)[0] for c in sairam if '/' in c}, key=lambda d: -d.count('/')):
        partes = d.split('/')
        for i in range(len(partes), 0, -1):
            try:
                f.rmd('/'.join([destino] + partes[:i]))
            except ftplib.error_perm:
                break

    f.storbinary(f'STOR {destino}/{MANIFESTO}', io.BytesIO(json.dumps(locais, indent=0, sort_keys=True).encode()))
    f.quit()
    print(f'{pasta} → {SERVIDOR}:{destino}/ — {len(mudados)} enviados, {len(sairam)} apagados, {len(locais) - len(mudados)} iguais')


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
