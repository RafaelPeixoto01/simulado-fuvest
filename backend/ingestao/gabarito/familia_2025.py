"""Gabarito da familia 2025.

Pagina "GABARITO": cabecalho `PROVA V1 PROVA V2 ...` (2025) ou `PROVA V PROVA K ...`
(2020, 2022-2024) e 45 linhas no formato `n L n+45 L` repetido por versao
(ex.: `1 E 46 D 1 A 46 C ...`). A pagina "GABARITO DE CORRESPONDENCIA" (mesmas
questoes em outra ordem) e ignorada. Os simulados de 2027 (familia 2027, CR-011)
usam o mesmo formato com `PROVA S1 ...`, 80 questoes e linhas `n L n+40 L`.

Gabarito retificado pode aceitar duas respostas (`48 D E`): o modelo guarda uma
resposta so, entao a marcacao vira None (pendencia para o curador decidir).
"""

import re
from pathlib import Path

import pdfplumber

from ingestao.pdf_util import limpar_texto

LETRAS = {"A", "B", "C", "D", "E"}
MARCADORES_ANULADA = re.compile(r"^(ANULADA|ANUL|\*)$", re.IGNORECASE)
# "PROVA V1" / "Prova K"; o lookahead impede "PROVA DE CONHECIMENTOS" de virar versão "D"
CABECALHO = re.compile(r"PROVA\s+([A-Z]\d?)(?=\s|$)", re.IGNORECASE)
LINHA = re.compile(r"^\d+\s")


class ErroGabarito(Exception):
    pass


def _marcacao(tokens: list[str]):
    if len(tokens) != 1:
        return None  # nenhuma ou mais de uma resposta aceita (retificacao)
    token = tokens[0].strip().upper()
    if token in LETRAS:
        return token
    if MARCADORES_ANULADA.match(token):
        return "anulada"
    return None


def interpretar_linhas(linhas: list[str], versao: str, total: int = 90) -> dict:
    versoes: list[str] = []
    respostas: dict[int, object] = {}
    for linha in linhas:
        if not versoes and (encontradas := CABECALHO.findall(linha)):
            versoes = encontradas
            if versao not in versoes:
                raise ErroGabarito(f"Versão {versao} não está no gabarito (versões: {versoes})")
            k = versoes.index(versao)
            continue
        if not versoes or not LINHA.match(linha):
            continue
        # Cada entrada = numero seguido das marcacoes ate o proximo numero
        entradas: list[tuple[int, list[str]]] = []
        for token in linha.split():
            if token.isdigit():
                entradas.append((int(token), []))
            elif entradas:
                entradas[-1][1].append(token)
        if len(entradas) != 2 * len(versoes):
            continue
        for numero, marcas in entradas[2 * k : 2 * k + 2]:
            respostas[numero] = _marcacao(marcas)

    if not versoes:
        raise ErroGabarito("Cabeçalho 'PROVA V1 PROVA V2 ...' não encontrado")
    if sorted(respostas) != list(range(1, total + 1)):
        raise ErroGabarito(
            f"Esperadas {total} respostas numeradas 1–{total}, encontradas {len(respostas)}"
        )
    return respostas


class ParserGabarito2025:
    nome = "familia_2025"
    total = 90  # questoes da prova: o pacote extraido grava esse total (V01)

    def extrair(self, pdf_path: Path, versao: str) -> dict:
        with pdfplumber.open(pdf_path) as pdf:
            for pagina in pdf.pages:
                texto = limpar_texto_linhas(pagina.extract_text() or "")
                if any("CORRESPONDÊNCIA" in linha.upper() for linha in texto):
                    continue
                if any(CABECALHO.search(linha) for linha in texto):
                    return interpretar_linhas(texto, versao, self.total)
        raise ErroGabarito(f"Página do gabarito não encontrada em {pdf_path.name}")


def limpar_texto_linhas(texto: str) -> list[str]:
    return [limpo for linha in texto.splitlines() if (limpo := limpar_texto(linha))]
