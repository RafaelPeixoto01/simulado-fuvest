"""T-028: a família do layout de 2025 estendida a 2020 e 2022–2024.

Diferenças entre os anos: a fonte do número da questão (Gadugi, Arial,
BrandonGrotesque), versões com letra (V, K, Q, X, Z) no gabarito e a ausência
do separador "#####" antes de 2025. 2021 fica de fora: o PDF não tem texto
extraível (fontes sem mapeamento) e exigiria OCR.
"""

from pathlib import Path

import pytest

from app.pacote.schema import PacoteProva
from ingestao.familias import FAMILIAS, FamiliaNaoRegistrada, familia_do_ano
from ingestao.gabarito.familia_2025 import interpretar_linhas
from ingestao.layouts import obter_parser_layout

FIXTURES = Path(__file__).parent / "fixtures"


def _gabarito(ano: int) -> list[str]:
    return (FIXTURES / "gabaritos" / f"fuvest{ano}_gabarito.txt").read_text(encoding="utf-8").splitlines()


def test_registry_cobre_2020_e_2022_a_2025():
    assert sorted(FAMILIAS) == [2020, 2022, 2023, 2024, 2025]
    with pytest.raises(FamiliaNaoRegistrada):
        familia_do_ano(2021)


@pytest.mark.parametrize(
    ("ano", "pagina", "numeros"),
    [(2024, 5, [10, 11, 12]), (2022, 13, [43, 44, 45, 46, 47, 48]), (2020, 10, [31, 32, 33, 34, 35])],
)
def test_layout_de_anos_anteriores(ano, pagina, numeros):
    resultado = obter_parser_layout(ano).extrair(FIXTURES / "pdfs" / f"fuvest{ano}_p{pagina:02d}.pdf")

    assert [q.numero for q in resultado.questoes] == numeros
    for q in resultado.questoes:
        assert list(q.alternativas) == ["A", "B", "C", "D", "E"], q.numero
        assert q.enunciado, q.numero


def test_gabarito_com_versoes_por_letra():
    respostas = interpretar_linhas(_gabarito(2024), "V")

    assert sorted(respostas) == list(range(1, 91))
    assert (respostas[1], respostas[3], respostas[46]) == ("C", "E", "E")


def test_gabarito_retificado_com_duas_respostas_vira_pendencia():
    # "3 E 48 D E": na versão V a questão 48 aceita D ou E
    assert interpretar_linhas(_gabarito(2024), "V")[48] is None
    assert interpretar_linhas(_gabarito(2024), "K")[48] == "C"


@pytest.mark.parametrize("ano", [2022, 2020])
def test_gabaritos_de_2022_e_2020(ano):
    # 2020 escreve "Prova V" (minúsculas)
    respostas = interpretar_linhas(_gabarito(ano), "V")

    assert sorted(respostas) == list(range(1, 91))
    assert all(v in {"A", "B", "C", "D", "E", "anulada", None} for v in respostas.values())


@pytest.mark.parametrize("versao", ["V", "K", "Z", "V1", "unica"])
def test_versao_por_letra_e_aceita_no_pacote(versao):
    pacote = PacoteProva(
        ano=2024,
        versao=versao,
        fonte={"url_prova": "https://e.test/p.pdf", "url_gabarito": "https://e.test/g.pdf", "familia_layout": "familia_2025"},
        questoes=[],
    )
    assert pacote.versao == versao
