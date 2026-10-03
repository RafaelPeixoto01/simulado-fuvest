"""IT-032 a IT-034 (CR-011): familia 2027, dos simulados oficiais da FUVEST 2027.

Fixtures: pagina 2 da prova S1 da 1a edicao (questoes 1-3, espaco como `(cid:172)`, uma
figura), pagina 3 da prova S1 da 2a edicao (questoes 4-5, numero em 14,04 pt, duas
figuras) e a pagina do gabarito da 1a edicao (80 respostas por versao, `*` = anulada).
"""

import json
import shutil
from pathlib import Path

import pytest

from app.pacote.leitura import carregar_pacote
from ingestao.cli import main
from ingestao.gabarito.familia_2025 import ErroGabarito, ParserGabarito2025
from ingestao.gabarito.familia_2027 import ParserGabarito2027
from ingestao.layouts.familia_2025 import ParserLayout2025
from ingestao.layouts.familia_2027 import ParserLayout2027

PDFS = Path(__file__).parent / "fixtures" / "pdfs"
GABARITO = PDFS / "simulado2027s1_gabarito.pdf"
PAGINA_1A_EDICAO = PDFS / "simulado2027s1_p02.pdf"
PAGINA_2A_EDICAO = PDFS / "simulado2027s2_p03.pdf"


# IT-032 — gabarito


def test_gabarito_do_simulado_tem_80_respostas_com_a_anulada():
    respostas = ParserGabarito2027().extrair(GABARITO, "S1")

    assert sorted(respostas) == list(range(1, 81))
    assert (respostas[1], respostas[41], respostas[80]) == ("D", "C", "A")
    assert respostas[51] == "anulada"  # "51 *" na coluna da S1 (retificado em 27/04/2026)


def test_gabarito_de_outra_versao_do_simulado():
    respostas = ParserGabarito2027().extrair(GABARITO, "S2")

    # Correspondencia oficial: a Q1 da S1 e a Q62 da S2 (mesma questao, resposta D)
    assert (respostas[1], respostas[62]) == ("A", "D")


def test_gabarito_do_simulado_nao_passa_na_familia_de_90():
    with pytest.raises(ErroGabarito, match="90"):
        ParserGabarito2025().extrair(GABARITO, "S1")


# IT-033 — layout


def test_layout_da_1a_edicao_sem_alerta_pelo_espaco_cid_172():
    resultado = ParserLayout2027().extrair(PAGINA_1A_EDICAO)

    assert [q.numero for q in resultado.questoes] == [1, 2, 3]
    for q in resultado.questoes:
        assert list(q.alternativas) == ["A", "B", "C", "D", "E"], q.numero
        texto = " ".join(b.texto for b in q.enunciado if b.texto)
        assert "(cid:" not in texto and "  " not in texto
        assert not any("símbolos" in p for p in q.pendencias), q.pendencias
    q1 = resultado.questoes[0]
    assert q1.enunciado[0].texto.startswith("Certas narrativas convidam o leitor a acompanhar")
    q3 = resultado.questoes[2]
    assert [b.figura for b in q3.enunciado if b.figura] == ["q003-1.webp"]
    assert resultado.figuras["q003-1.webp"][:4] == b"RIFF"


def test_layout_da_2a_edicao_com_o_numero_em_14_pt():
    resultado = ParserLayout2027().extrair(PAGINA_2A_EDICAO)

    assert [q.numero for q in resultado.questoes] == [4, 5]
    assert all(list(q.alternativas) == ["A", "B", "C", "D", "E"] for q in resultado.questoes)
    assert sorted(resultado.figuras) == ["q004-1.webp", "q005-1.webp"]
    # A familia 2025 (numero ate 14 pt) nao enxerga os marcadores de 14,04 pt
    assert ParserLayout2025().extrair(PAGINA_2A_EDICAO).questoes == []


# IT-034 — CLI com --prova


@pytest.fixture
def data_dir(tmp_path):
    cache = tmp_path / "_cache" / "2027s1"
    cache.mkdir(parents=True)
    shutil.copy(PAGINA_1A_EDICAO, cache / "prova.pdf")
    shutil.copy(GABARITO, cache / "gabarito.pdf")
    (cache / "fonte.json").write_text(
        json.dumps({
            "prova": "2027s1",
            "versao": "S1",
            "url_prova": "https://www.fuvest.br/wp-content/uploads/simulado2027-1edicao-prova-S1.pdf",
            "url_gabarito": "https://www.fuvest.br/wp-content/uploads/simulado2027-1edicao-gabarito-retificado.pdf",
        }),
        encoding="utf-8",
    )
    return tmp_path / "provas"


def test_extrair_simulado_pelo_codigo(data_dir, capsys):
    assert main(["extrair", "--prova", "2027s1", "--data-dir", str(data_dir)]) == 0

    pacote = carregar_pacote(data_dir / "2027s1")
    assert (pacote.ano, pacote.tipo, pacote.edicao, pacote.codigo) == (2027, "simulado", 1, "2027s1")
    assert (pacote.versao, pacote.total_questoes) == ("S1", 80)
    assert pacote.fonte.familia_layout == "familia_2027"
    assert [q.resposta for q in pacote.questoes] == ["D", "D", "D"]  # gabarito oficial S1
    assert (data_dir / "2027s1" / "figuras" / "q003-1.webp").exists()
    # A fixture tem 3 das 80 questoes: a V01 acusa as que faltam
    assert "Esperadas 80 questões, encontradas 3" in capsys.readouterr().out


def test_ano_continua_aceito_como_sinonimo_de_prova(data_dir):
    assert main(["extrair", "--ano", "2027s1", "--data-dir", str(data_dir)]) == 0
    assert (data_dir / "2027s1" / "prova.yaml").exists()


@pytest.mark.parametrize("codigo", ["2027S1", "2027s0", "2027s10", "27s1", "1976"])
def test_codigo_de_prova_invalido(data_dir, codigo, capsys):
    with pytest.raises(SystemExit):
        main(["extrair", "--prova", codigo, "--data-dir", str(data_dir)])
    assert "Código de prova inválido" in capsys.readouterr().err
