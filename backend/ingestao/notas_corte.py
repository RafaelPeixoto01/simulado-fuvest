"""Extrator do PDF "Notas de Corte" da FUVEST, familia unica 2020-2025 (CR-010, specs/08 §2.4).

As colunas saem das posicoes do cabecalho de cada pagina (VAGAS, MINIMO, MAXIMO). O ponto
minimo fica na linha da modalidade (2020) ou cerca de 4 pt acima dela (2022 em diante); de
2024 em diante a linha da carreira traz os totais, que sao ignorados. A linha "Total" encerra
a tabela (em 2025 vem depois uma segunda tabela, por codigo e sem modalidades).
"""

import re
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path

from pydantic import ValidationError

from app.pacote.notas_corte import PADRAO_FONTE, CarreiraCorte, NotasCorteAno
from ingestao.baixar import ErroDownload, _obter_http, obter_pdf

ARQUIVO_PDF = "notas_corte.pdf"
RE_URL = re.compile(PADRAO_FONTE)
RE_CARREIRA = re.compile(r"^(\d{3})\s*[−-]\s*(.+)$")
MODALIDADES = {
    "Ampla Concorrência": "ac",
    "Candidatos de Escola Pública": "ep",
    "Candidatos de Escola Pública − Grupo PPI": "ppi",
}
TOLERANCIA_LINHA = 1.5  # pt: palavras da mesma linha
TOLERANCIA_FUSAO = 2.5  # pt: em 2024-2025 numeros e nome saem em alturas diferentes


class ErroLayout(Exception):
    """O PDF nao tem o layout de 2020-2025: nada e gravado."""


@dataclass
class CarreiraExtraida:
    codigo: int
    nome: str
    modalidades: dict[str, dict] = field(default_factory=dict)


@dataclass(frozen=True)
class _Colunas:
    vagas: float
    minimo: float
    maximo: float


def _colunas(palavras: list[dict], pagina: int) -> _Colunas:
    posicoes = {w["text"]: w["x0"] for w in palavras if w["text"] in ("VAGAS", "MÍNIMO", "MÁXIMO")}
    if len(posicoes) != 3 or not posicoes["VAGAS"] < posicoes["MÍNIMO"] < posicoes["MÁXIMO"]:
        raise ErroLayout(f"página {pagina}: cabeçalho da tabela não encontrado (layout desconhecido)")
    return _Colunas(posicoes["VAGAS"], posicoes["MÍNIMO"], posicoes["MÁXIMO"])


def _linhas(palavras: list[dict], colunas: _Colunas) -> list[list[dict]]:
    linhas: list[list[dict]] = []
    for w in sorted(palavras, key=lambda w: (w["top"], w["x0"])):
        if linhas and abs(linhas[-1][0]["top"] - w["top"]) < TOLERANCIA_LINHA:
            linhas[-1].append(w)
        else:
            linhas.append([w])

    def so_minimo(linha: list[dict]) -> bool:
        return len(linha) == 1 and colunas.minimo <= linha[0]["x0"] < colunas.maximo

    fundidas: list[list[dict]] = []
    for linha in linhas:
        anterior = fundidas[-1] if fundidas else None
        if (
            anterior is not None
            and linha[0]["top"] - anterior[0]["top"] < TOLERANCIA_FUSAO
            and not so_minimo(linha)
            and not so_minimo(anterior)
        ):
            anterior.extend(linha)
        else:
            fundidas.append(list(linha))
    for linha in fundidas:
        linha.sort(key=lambda w: w["x0"])
    return fundidas


def _inteiro(texto: str) -> int | None:
    return int(texto) if texto.isdigit() else None


def extrair_de_palavras(paginas: list[list[dict]]) -> list[CarreiraExtraida]:
    """Carreiras na ordem do PDF, inclusive as de treineiro (o rascunho as tira)."""
    carreiras: list[CarreiraExtraida] = []
    atual: CarreiraExtraida | None = None
    minimo_pendente: int | None = None
    for numero, palavras in enumerate(paginas, start=1):
        colunas = _colunas(palavras, numero)
        for linha in _linhas(palavras, colunas):
            nome = " ".join(w["text"] for w in linha if w["x0"] < colunas.vagas)
            numeros = [w["text"] for w in linha if colunas.vagas <= w["x0"] < colunas.minimo]
            minimos = [w["text"] for w in linha if colunas.minimo <= w["x0"] < colunas.maximo]
            maximos = [w["text"] for w in linha if w["x0"] >= colunas.maximo]
            if not nome and len(minimos) == 1 and not numeros and not maximos:
                minimo_pendente = _inteiro(minimos[0])
                continue
            if nome.startswith("Total"):
                return carreiras
            casamento = RE_CARREIRA.match(nome)
            if casamento and int(casamento.group(1)) >= 100:
                atual = CarreiraExtraida(int(casamento.group(1)), casamento.group(2).strip())
                carreiras.append(atual)
                minimo_pendente = None
                continue
            if nome.startswith("−") and atual is not None:
                modalidade = nome.lstrip("− ").strip()
                if modalidade not in MODALIDADES:
                    raise ErroLayout(f"página {numero}: modalidade desconhecida: {modalidade}")
                atual.modalidades[MODALIDADES[modalidade]] = {
                    "vagas": _inteiro(numeros[0]) if numeros else None,
                    "convocados": _inteiro(numeros[3]) if len(numeros) > 3 else None,
                    "corte": _inteiro(minimos[0]) if minimos else minimo_pendente,
                    "maximo": _inteiro(maximos[0]) if maximos else None,
                }
                minimo_pendente = None
    return carreiras


def montar_rascunho(carreiras: list[CarreiraExtraida], ano: int, fonte: str) -> NotasCorteAno:
    """Tira os treineiros e aponta as pendencias de nome (cortado ou repetido no ano)."""
    validas = []
    for extraida in carreiras:
        if extraida.nome.startswith("Treinamento"):
            continue
        faltando = [m for m in MODALIDADES.values() if m not in extraida.modalidades]
        if faltando:
            raise ErroLayout(f"Carreira {extraida.codigo}: sem as modalidades {', '.join(faltando)}")
        for modalidade in extraida.modalidades.values():
            if modalidade["convocados"] == 0:
                # Sem convocados nao ha corte: o PDF imprime o piso (27) e a maior nota de quem
                # ficou abaixo dele (2024/710 PPI: 22), ou "−−−" quando nao ha vagas
                modalidade["corte"] = modalidade["maximo"] = None
        try:
            validas.append(CarreiraCorte(codigo=extraida.codigo, nome=extraida.nome, **extraida.modalidades))
        except ValidationError as erro:
            raise ErroLayout(f"Carreira {extraida.codigo}: valores fora do esperado: {erro}") from erro

    pendencias = []
    nomes = [c.nome.casefold() for c in validas]
    for carreira in validas:
        if nomes.count(carreira.nome.casefold()) > 1:
            pendencias.append(
                f"Carreira {carreira.codigo}: nome repetido ({carreira.nome}) — completar o campus pelo Guia de Carreiras"
            )
        if "..." in carreira.nome or "…" in carreira.nome:
            pendencias.append(f"Carreira {carreira.codigo}: nome cortado no PDF — completar pelo Guia de Carreiras")
    return NotasCorteAno(ano=ano, status="rascunho", fonte=fonte, pendencias=pendencias, carreiras=validas)


def extrair_notas_corte(pdf: Path, ano: int, fonte: str) -> NotasCorteAno:
    import pdfplumber

    try:
        with pdfplumber.open(pdf) as documento:
            paginas = [pagina.extract_words() for pagina in documento.pages]
    except Exception as erro:  # pdfminer tem varias excecoes de PDF malformado; todas viram erro da CLI
        raise ErroLayout(f"PDF ilegível ({erro.__class__.__name__}): apague {pdf} e baixe de novo") from erro
    return montar_rascunho(extrair_de_palavras(paginas), ano, fonte)


def baixar_pdf(
    ano: int, url: str, cache_dir: Path, obter: Callable[[str], bytes] = _obter_http
) -> Path:
    """`cache_dir/AAAA/notas_corte.pdf`, com a URL de origem ao lado (`.url`): o cache so vale
    para a mesma URL; outra URL baixa de novo."""
    if not RE_URL.match(url):
        raise ErroDownload(f"URL deve ser um PDF em https://www.fuvest.br/: {url}")
    destino = cache_dir / str(ano) / ARQUIVO_PDF
    origem = destino.with_name(f"{ARQUIVO_PDF}.url")
    if destino.is_file() and origem.is_file() and origem.read_text(encoding="utf-8") == url:
        return destino
    dados = obter_pdf(url, obter)
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_bytes(dados)
    origem.write_text(url, encoding="utf-8")
    return destino
