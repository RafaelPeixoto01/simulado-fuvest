"""Download dos PDFs oficiais para data/_cache/AAAA/ (RF-001)."""

import json
import urllib.request
from collections.abc import Callable
from pathlib import Path

TIMEOUT_S = 60


class ErroDownload(Exception):
    pass


def _obter_http(url: str) -> bytes:
    requisicao = urllib.request.Request(url, headers={"User-Agent": "simulado-fuvest/1.0"})
    with urllib.request.urlopen(requisicao, timeout=TIMEOUT_S) as resposta:
        if resposta.status != 200:
            raise ErroDownload(f"{url}: HTTP {resposta.status}")
        return resposta.read()


def baixar(
    ano: int,
    url_prova: str,
    url_gabarito: str,
    versao: str,
    cache_dir: Path,
    obter: Callable[[str], bytes] = _obter_http,
) -> Path:
    """Baixa prova e gabarito e grava `fonte.json`. Nada e gravado se algo falhar."""
    for url in (url_prova, url_gabarito):
        if not url.startswith("https://"):
            raise ErroDownload(f"URL deve usar https: {url}")
    conteudos = {}
    for nome, url in (("prova.pdf", url_prova), ("gabarito.pdf", url_gabarito)):
        dados = obter(url)
        if not dados.startswith(b"%PDF"):
            raise ErroDownload(f"{url}: conteúdo não é um PDF")
        conteudos[nome] = dados

    destino = cache_dir / str(ano)
    destino.mkdir(parents=True, exist_ok=True)
    for nome, dados in conteudos.items():
        (destino / nome).write_bytes(dados)
    fonte = {"ano": ano, "versao": versao, "url_prova": url_prova, "url_gabarito": url_gabarito}
    (destino / "fonte.json").write_text(json.dumps(fonte, indent=2), encoding="utf-8")
    return destino
