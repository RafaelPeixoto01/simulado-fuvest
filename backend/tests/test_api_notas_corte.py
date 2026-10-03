"""BT-079 e BT-081: GET /api/notas-corte (specs/08-notas-de-corte.md §2.5).
BT-080 (acesso) esta em test_acesso.py, com as demais rotas de conteudo."""

import pytest

from tests.fixtures.gerar_pacotes import notas_corte_sinteticas


def test_sem_ano_devolve_o_mais_recente(client, base_sintetica):
    resposta = client.get("/api/notas-corte")

    assert resposta.status_code == 200
    dados = resposta.json()
    assert dados["anos"] == [2099, 2098]
    assert dados["recente"] == 2099 and dados["ano"] == 2099
    assert dados["fonte"] == "https://www.fuvest.br/wp-content/uploads/fuvest_2099_notas_de_corte.pdf"
    esperadas = notas_corte_sinteticas(2099).carreiras
    assert [c["codigo"] for c in dados["carreiras"]] == [c.codigo for c in esperadas]
    musica = next(c for c in dados["carreiras"] if c["codigo"] == 103)
    assert musica == {
        "codigo": 103,
        "nome": "Música (Ribeirão Preto)",
        "vagas": 15 + 8 + 4,
        "cortes": {"ac": 29, "ep": 29, "ppi": None},  # 2099 % 3 = 2 a mais
    }


def test_com_ano_publicado(client, base_sintetica):
    dados = client.get("/api/notas-corte", params={"ano": 2098}).json()

    assert dados["ano"] == 2098 and dados["recente"] == 2099
    biologicas = next(c for c in dados["carreiras"] if c["codigo"] == 101)
    assert biologicas["cortes"] == {"ac": 61, "ep": 46, "ppi": 34}  # 2098 % 3 = 1 a mais


def test_ano_nao_publicado_devolve_o_mais_recente(client, base_sintetica):
    dados = client.get("/api/notas-corte", params={"ano": 2050}).json()

    assert dados["ano"] == 2099


def test_sem_notas_de_corte(client):
    resposta = client.get("/api/notas-corte")

    assert resposta.status_code == 200
    assert resposta.json() == {
        "anos": [], "recente": None, "ano": None, "pontos_prova": None, "fonte": None, "carreiras": [],
    }


@pytest.mark.parametrize("ano", ["abc", "1800", "2101"])
def test_ano_invalido(client, ano):
    assert client.get("/api/notas-corte", params={"ano": ano}).status_code == 422
