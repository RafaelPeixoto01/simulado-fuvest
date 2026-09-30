"""IT-008: gabarito da familia 2025 (specs/01-ingestao.md §2.4)."""

from pathlib import Path

import pytest

from ingestao.familias import FamiliaNaoRegistrada
from ingestao.gabarito import obter_parser_gabarito
from ingestao.gabarito.familia_2025 import ErroGabarito, interpretar_linhas

GABARITO_2025 = Path(__file__).parent / "fixtures" / "pdfs" / "fuvest2025_gabarito.pdf"
CABECALHO = "PROVA V1 PROVA V2 PROVA V3 PROVA V4"


def _linhas_sinteticas(marcas_v1: dict[int, str] | None = None) -> list[str]:
    marcas_v1 = marcas_v1 or {}
    linhas = [CABECALHO]
    for n in range(1, 46):
        a, b = marcas_v1.get(n, "A"), marcas_v1.get(n + 45, "B")
        linhas.append(f"{n} {a} {n + 45} {b} " + " ".join(f"{n} C {n + 45} D" for _ in range(3)))
    return linhas


def test_gabarito_oficial_2025_versao_v1():
    respostas = obter_parser_gabarito(2025).extrair(GABARITO_2025, "V1")

    assert sorted(respostas) == list(range(1, 91))
    assert (respostas[1], respostas[46], respostas[90]) == ("E", "D", "B")


def test_gabarito_oficial_2025_outra_versao():
    respostas = obter_parser_gabarito(2025).extrair(GABARITO_2025, "V2")

    assert (respostas[1], respostas[46]) == ("A", "C")
    # Correspondencia oficial: a Q1 da V1 e a Q82 da V2 (mesma questao, resposta E)
    assert respostas[82] == "E"


def test_marcador_de_anulada_e_token_desconhecido():
    respostas = interpretar_linhas(_linhas_sinteticas({3: "ANULADA", 50: "*", 7: "X"}), "V1")

    assert respostas[3] == "anulada"
    assert respostas[50] == "anulada"
    assert respostas[7] is None  # nao reconhecido: vira pendencia para o curador
    assert respostas[1] == "A"


def test_menos_de_90_respostas_e_erro():
    with pytest.raises(ErroGabarito, match="90"):
        interpretar_linhas(_linhas_sinteticas()[:-1], "V1")


def test_versao_inexistente_no_gabarito():
    with pytest.raises(ErroGabarito, match="V5"):
        interpretar_linhas(_linhas_sinteticas(), "V5")


def test_ano_sem_familia_registrada():
    with pytest.raises(FamiliaNaoRegistrada, match="2025"):
        obter_parser_gabarito(1990)
