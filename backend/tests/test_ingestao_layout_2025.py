"""IT-009: parser de prova da familia 2025 sobre paginas reais recortadas."""

from pathlib import Path

import pytest

from ingestao.layouts import obter_parser_layout
from ingestao.layouts.familia_2025 import numeros_texto_base

PDFS = Path(__file__).parent / "fixtures" / "pdfs"


@pytest.fixture(scope="module")
def p03():
    return obter_parser_layout("2025").extrair(PDFS / "fuvest2025_v1_p03.pdf")


@pytest.fixture(scope="module")
def p06():
    return obter_parser_layout("2025").extrair(PDFS / "fuvest2025_v1_p06.pdf")


@pytest.fixture(scope="module")
def p23():
    return obter_parser_layout("2025").extrair(PDFS / "fuvest2025_v1_p23.pdf")


def _questao(resultado, numero):
    return next(q for q in resultado.questoes if q.numero == numero)


def _texto(blocos) -> str:
    return "\n".join(b.texto for b in blocos if b.texto)


@pytest.mark.parametrize(
    ("cabecalho", "esperado"),
    [
        ("TEXTO PARA AS QUESTÕES 10 E 11", [10, 11]),
        ("TEXTO PARA AS QUESTÕES DE 27 A 29", [27, 28, 29]),
        ("TEXTO PARA AS QUESTÕES 10, 11 E 12", [10, 11, 12]),
        ("Texto para as questões 5 a 7", [5, 6, 7]),
    ],
)
def test_numeros_do_cabecalho_de_texto_base(cabecalho, esperado):
    assert numeros_texto_base(cabecalho) == esperado


def test_p03_encontra_as_tres_questoes_na_ordem(p03):
    assert [q.numero for q in p03.questoes] == [2, 3, 4]


def test_questao_com_figura_e_rotulos_sobrepostos(p03):
    q = _questao(p03, 2)

    assert q.enunciado[0].texto.startswith("Analise, na figura a seguir")
    assert any(b.figura == "q002-1.webp" for b in q.enunciado)
    # rotulos desenhados sobre o mapa ficam na figura, nao no texto
    assert "ÁREA DE GARIMPO" not in _texto(q.enunciado)
    assert "q002-1.webp" in p03.figuras and p03.figuras["q002-1.webp"][:4] == b"RIFF"


def test_alternativas_sem_prefixo_e_com_hifenizacao_desfeita(p03):
    q = _questao(p03, 2)

    assert list(q.alternativas) == ["A", "B", "C", "D", "E"]
    assert q.alternativas["A"].texto.startswith("Os territórios indígenas encontram-se")
    assert q.alternativas["E"].texto.endswith("próximas a rios e lagos.")
    assert "(A)" not in q.alternativas["A"].texto


def test_questao_sem_figura_nao_tem_pendencia(p03):
    q = _questao(p03, 4)

    assert q.pendencias == []
    assert all(b.figura is None for b in q.enunciado)
    assert q.alternativas["E"].texto.startswith("pela exploração do transporte fluvial")


def test_texto_base_compartilhado(p06):
    (tb,) = p06.textos_base

    assert tb.id == "tb01" and tb.questoes == [10, 11]
    assert _texto(tb.conteudo).startswith("“O que torna possível o surgimento")
    assert _questao(p06, 10).texto_base == "tb01"
    assert _questao(p06, 11).texto_base == "tb01"
    assert _questao(p06, 12).texto_base is None


def test_sublinhado_no_texto_base_vira_pendencia(p06):
    assert any("sublinhado" in p for p in _questao(p06, 10).pendencias)


def test_indice_em_fonte_pequena_vira_pendencia(p23):
    q = _questao(p23, 58)

    assert any("fonte pequena" in p for p in q.pendencias)
    assert "\n4\n" not in _texto(q.enunciado)


def test_formula_com_simbolos_nao_extraidos_vira_pendencia(p23):
    q = _questao(p23, 59)

    assert any("símbolos não extraídos" in p for p in q.pendencias)
    assert "(cid:" not in _texto(q.enunciado)


def test_questao_que_continua_na_outra_coluna(p23):
    q = _questao(p23, 59)

    assert q.alternativas["E"].texto.startswith("Duas barras de comprimentos 5 m e 10 m")


def test_alternativas_formadas_por_imagens(p23):
    q = _questao(p23, 60)

    assert [q.alternativas[letra].figura for letra in "ABCDE"] == [
        f"q060-{letra}.webp" for letra in "abcde"
    ]
    # As imagens comecam 2pt acima do rotulo "(A)": nao podem escorregar para o enunciado
    assert not any(b.figura for b in q.enunciado)
    assert all(f"q060-{letra}.webp" in p23.figuras for letra in "abcde")
    assert any("figura vetorial" in p for p in q.pendencias)  # tabela desenhada
