"""Gabarito da familia 2025.

Pagina "GABARITO": cabecalho `PROVA V1 PROVA V2 PROVA V3 PROVA V4` e 45 linhas no
formato `n L n+45 L` repetido por versao (ex.: `1 E 46 D 1 A 46 C ...`).
A pagina "GABARITO DE CORRESPONDENCIA" (mesmas questoes em outra ordem) e ignorada.
"""

import re
from pathlib import Path

import pdfplumber

from ingestao.pdf_util import limpar_texto

LETRAS = {"A", "B", "C", "D", "E"}
MARCADORES_ANULADA = re.compile(r"^(ANULADA|ANUL|\*)$", re.IGNORECASE)
CABECALHO = re.compile(r"PROVA\s+(V\d)")
LINHA = re.compile(r"^\d+\s+\S+\s+\d+\s+\S+")


class ErroGabarito(Exception):
    pass


def _marcacao(token: str):
    token = token.strip().upper()
    if token in LETRAS:
        return token
    if MARCADORES_ANULADA.match(token):
        return "anulada"
    return None


def interpretar_linhas(linhas: list[str], versao: str) -> dict:
    versoes: list[str] = []
    respostas: dict[int, object] = {}
    for linha in linhas:
        if not versoes and (encontradas := CABECALHO.findall(linha)):
            versoes = encontradas
            if versao not in versoes:
                raise ErroGabarito(f"Versão {versao} não está no gabarito (versões: {versoes})")
            k = versoes.index(versao)
            continue
        tokens = linha.split()
        if not versoes or not LINHA.match(linha) or len(tokens) != 4 * len(versoes):
            continue
        n1, m1, n2, m2 = tokens[4 * k : 4 * k + 4]
        respostas[int(n1)] = _marcacao(m1)
        respostas[int(n2)] = _marcacao(m2)

    if not versoes:
        raise ErroGabarito("Cabeçalho 'PROVA V1 PROVA V2 ...' não encontrado")
    if sorted(respostas) != list(range(1, 91)):
        raise ErroGabarito(f"Esperadas 90 respostas numeradas 1–90, encontradas {len(respostas)}")
    return respostas


class ParserGabarito2025:
    nome = "familia_2025"

    def extrair(self, pdf_path: Path, versao: str) -> dict:
        with pdfplumber.open(pdf_path) as pdf:
            for pagina in pdf.pages:
                texto = limpar_texto_linhas(pagina.extract_text() or "")
                if any("CORRESPONDÊNCIA" in linha for linha in texto):
                    continue
                if any(CABECALHO.search(linha) for linha in texto):
                    return interpretar_linhas(texto, versao)
        raise ErroGabarito(f"Página do gabarito não encontrada em {pdf_path.name}")


def limpar_texto_linhas(texto: str) -> list[str]:
    return [limpo for linha in texto.splitlines() if (limpo := limpar_texto(linha))]
