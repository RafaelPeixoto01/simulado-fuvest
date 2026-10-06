"""IT-035 a IT-037 (CR-012): familia 2026, da prova da FUVEST 2026 e do simulado oficial de 19/10/2025.

Fixtures: a pagina "Gabarito" de cada PDF (90 respostas por versao, `*` = anulada), a
pagina 22 da prova V1 (questoes 48-49, espaco como `(cid:172)`) e a pagina 28 da prova S1
do simulado (questoes 89-90, uma figura em cada).
"""

import json
import shutil
from pathlib import Path

import pytest

from app.pacote.leitura import carregar_pacote
from ingestao.cli import main
from ingestao.gabarito.familia_2025 import ErroGabarito
from ingestao.gabarito.familia_2026 import ParserGabarito2026
from ingestao.gabarito.familia_2027 import ParserGabarito2027
from ingestao.layouts.familia_2025 import ParserLayout2025
from ingestao.layouts.familia_2026 import ParserLayout2026

PDFS = Path(__file__).parent / "fixtures" / "pdfs"
GABARITO_PROVA = PDFS / "fuvest2026_gabarito.pdf"
GABARITO_SIMULADO = PDFS / "simulado2026s1_gabarito.pdf"
PAGINA_PROVA = PDFS / "fuvest2026_v1_p22.pdf"
PAGINA_SIMULADO = PDFS / "simulado2026s1_p28.pdf"


# IT-035 — gabarito


def test_gabarito_da_prova_tem_90_respostas_com_a_anulada():
    respostas = ParserGabarito2026().extrair(GABARITO_PROVA, "V1")

    assert sorted(respostas) == list(range(1, 91))
    assert (respostas[1], respostas[48], respostas[90]) == ("E", "B", "C")
    assert respostas[3] == "anulada"  # "3 *" na coluna da V1 (retificado em 25/11/2025)


def test_gabarito_da_prova_em_outra_versao():
    # Na V3 a anulada e a 48 (mesma questao que a 3 da V1)
    respostas = ParserGabarito2026().extrair(GABARITO_PROVA, "V3")

    assert (respostas[3], respostas[48]) == ("B", "anulada")


def test_gabarito_do_simulado_tem_90_respostas():
    respostas = ParserGabarito2026().extrair(GABARITO_SIMULADO, "S1")

    assert sorted(respostas) == list(range(1, 91))
    assert (respostas[1], respostas[46], respostas[89], respostas[90]) == ("D", "B", "B", "C")
    assert "anulada" not in respostas.values()
    # Correspondencia oficial: a Q1 da S1 e a Q71 da S2 (mesma questao, resposta D)
    assert ParserGabarito2026().extrair(GABARITO_SIMULADO, "S2")[71] == "D"


def test_gabarito_de_90_nao_passa_na_familia_2027():
    with pytest.raises(ErroGabarito, match="80"):
        ParserGabarito2027().extrair(GABARITO_SIMULADO, "S1")


# IT-036 — layout


def test_layout_da_prova_com_o_espaco_cid_172():
    resultado = ParserLayout2026().extrair(PAGINA_PROVA)

    assert [q.numero for q in resultado.questoes] == [48, 49]
    for q in resultado.questoes:
        assert list(q.alternativas) == ["A", "B", "C", "D", "E"], q.numero
        texto = " ".join(b.texto for b in q.enunciado if b.texto)
        assert "(cid:" not in texto and "  " not in texto
        assert q.pendencias == [], q.pendencias
    assert resultado.questoes[0].enunciado[0].texto.startswith("Mwando está embasbacado com a descoberta")
    # A familia 2025 acha as questoes, mas toma o (cid:172) por simbolo nao extraido
    pendencias_2025 = [p for q in ParserLayout2025().extrair(PAGINA_PROVA).questoes for p in q.pendencias]
    assert any("símbolos" in p for p in pendencias_2025)


def test_layout_do_simulado_ate_a_questao_90():
    resultado = ParserLayout2026().extrair(PAGINA_SIMULADO)

    assert [q.numero for q in resultado.questoes] == [89, 90]
    assert all(list(q.alternativas) == ["A", "B", "C", "D", "E"] for q in resultado.questoes)
    assert sorted(resultado.figuras) == ["q089-1.webp", "q090-1.webp"]


# IT-037 — CLI


@pytest.fixture
def data_dir(tmp_path):
    cache = tmp_path / "_cache" / "2026s1"
    cache.mkdir(parents=True)
    shutil.copy(PAGINA_SIMULADO, cache / "prova.pdf")
    shutil.copy(GABARITO_SIMULADO, cache / "gabarito.pdf")
    (cache / "fonte.json").write_text(
        json.dumps({
            "prova": "2026s1",
            "versao": "S1",
            "url_prova": "https://www.fuvest.br/wp-content/uploads/fuvest2026-simulado-fase1-prova-S1.pdf",
            "url_gabarito": "https://www.fuvest.br/wp-content/uploads/fuvest2026-simulado-fase1-gabarito.pdf",
        }),
        encoding="utf-8",
    )
    return tmp_path / "provas"


def test_extrair_simulado_de_90_pelo_codigo(data_dir, capsys):
    assert main(["extrair", "--prova", "2026s1", "--data-dir", str(data_dir)]) == 0

    pacote = carregar_pacote(data_dir / "2026s1")
    assert (pacote.ano, pacote.tipo, pacote.edicao, pacote.codigo) == (2026, "simulado", 1, "2026s1")
    assert (pacote.versao, pacote.total_questoes) == ("S1", 90)
    assert pacote.fonte.familia_layout == "familia_2026"
    assert [q.resposta for q in pacote.questoes] == ["B", "C"]  # gabarito oficial S1
    assert (data_dir / "2026s1" / "figuras" / "q090-1.webp").exists()
    # A fixture tem 2 das 90 questoes: a V01 acusa as que faltam
    assert "Esperadas 90 questões, encontradas 2" in capsys.readouterr().out
