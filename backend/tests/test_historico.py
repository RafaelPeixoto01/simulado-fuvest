"""BT-056 a BT-059: historico da conta (CR-005, ADR-011, RN-016)."""

import pytest
from sqlalchemy import func, select

from app.models import SimuladoConcluido
from app.services.historico import LIMITE_HISTORICO
from tests.contas import entrada_historico, entrar


def _enviar(client, *entradas):
    return client.post("/api/historico", json={"entradas": list(entradas)})


def _ids(resposta) -> list[str]:
    return [e["id"] for e in resposta.json()["entradas"]]


# --- BT-056: sem sessao ---


def test_historico_exige_sessao(client, provedor_falso):
    for resposta in (
        client.get("/api/historico"),
        _enviar(client, entrada_historico()),
        client.delete("/api/historico"),
    ):
        assert resposta.status_code == 401
        assert resposta.json()["detail"]["codigo"] == "nao_autenticado"


def test_historico_com_login_desligado_401(client):
    assert client.get("/api/historico").status_code == 401


# --- BT-057: gravar ---


def test_grava_e_devolve_como_chegou(client_logado):
    entrada = entrada_historico("sim-1")

    resposta = _enviar(client_logado, entrada)

    assert resposta.status_code == 200
    assert resposta.headers["cache-control"] == "no-store"
    assert resposta.json() == {"entradas": [entrada], "rejeitadas": []}
    assert client_logado.get("/api/historico").json() == {"entradas": [entrada], "rejeitadas": []}


def test_entrada_anterior_ao_cr004_volta_sem_assunto(client_logado):
    antiga = entrada_historico("antiga", com_assunto=False)

    devolvida = _enviar(client_logado, antiga).json()["entradas"][0]

    assert devolvida == antiga
    assert "assunto" not in devolvida["resultado"]["itens"][0]
    assert "assuntos" not in devolvida["resultado"]["por_disciplina"][0]


def test_reenviar_nao_duplica_nem_altera(client_logado, sessao):
    original = entrada_historico("sim-1")
    _enviar(client_logado, original)
    alterada = entrada_historico("sim-1")
    alterada["descricao"] = "Outra descrição"

    resposta = _enviar(client_logado, alterada, alterada)

    assert resposta.json()["entradas"] == [original]  # o resultado e imutavel
    assert sessao.scalar(select(func.count()).select_from(SimuladoConcluido)) == 1


def test_ordem_do_mais_recente_para_o_mais_antigo(client_logado):
    _enviar(client_logado, entrada_historico("b", 2_000), entrada_historico("a", 3_000))

    resposta = _enviar(client_logado, entrada_historico("c", 1_000))

    assert _ids(resposta) == ["a", "b", "c"]


def test_limite_de_50_mantem_os_mais_recentes(client_logado):
    _enviar(client_logado, *[entrada_historico(f"s{i:02d}", 10_000 + i) for i in range(50)])

    resposta = _enviar(client_logado, entrada_historico("novo", 20_000), entrada_historico("velho", 1))

    ids = _ids(resposta)
    assert len(ids) == LIMITE_HISTORICO
    assert ids[0] == "novo"
    assert "velho" not in ids and "s00" not in ids and "s01" in ids


def test_entradas_invalidas_vao_para_rejeitadas(client_logado):
    extra = entrada_historico("extra")
    extra["campoNovo"] = 1
    sem_itens = entrada_historico("sem-itens")
    del sem_itens["resultado"]["itens"]
    id_ruim = entrada_historico("id com espaço")
    grande = entrada_historico("grande")
    grande["resultado"]["itens"] *= 91

    resposta = _enviar(
        client_logado, entrada_historico("boa"), extra, sem_itens, id_ruim, grande, {"x": 1}
    )

    assert resposta.status_code == 200
    assert _ids(resposta) == ["boa"]
    assert resposta.json()["rejeitadas"] == ["extra", "sem-itens", "id com espaço", "grande", "?"]


@pytest.mark.parametrize(
    "corpo",
    [
        {"entradas": []},
        {"entradas": [entrada_historico(f"s{i}") for i in range(51)]},
        {"entradas": ["texto"]},
        {"outra": []},
    ],
    ids=["vazia", "51", "nao-objeto", "sem-entradas"],
)
def test_corpo_fora_do_formato_422(client_logado, corpo):
    assert client_logado.post("/api/historico", json=corpo).status_code == 422


# --- BT-058: ownership ---


def test_cada_conta_ve_so_o_proprio_historico(client_logado, app, provedor_falso):
    from fastapi.testclient import TestClient

    _enviar(client_logado, entrada_historico("da-ana"))
    with TestClient(app) as beto:
        entrar(beto, code="codigo-beto")
        _enviar(beto, entrada_historico("do-beto"))

        assert _ids(beto.get("/api/historico")) == ["do-beto"]
        assert beto.delete("/api/historico").status_code == 204

    assert _ids(client_logado.get("/api/historico")) == ["da-ana"]


def test_mesmo_id_em_contas_diferentes_nao_conflita(client_logado, app, provedor_falso):
    from fastapi.testclient import TestClient

    _enviar(client_logado, entrada_historico("igual"))
    with TestClient(app) as beto:
        entrar(beto, code="codigo-beto")
        assert _ids(_enviar(beto, entrada_historico("igual"))) == ["igual"]


# --- BT-059: limpar ---


def test_limpar_apaga_o_historico_da_conta(client_logado):
    _enviar(client_logado, entrada_historico("a"), entrada_historico("b", 2))

    resposta = client_logado.delete("/api/historico")

    assert resposta.status_code == 204
    assert client_logado.get("/api/historico").json()["entradas"] == []


@pytest.mark.parametrize("dialeto", ["postgresql", "sqlite"])
def test_insert_ignora_conflito_nos_dois_dialetos(dialeto):
    """O pytest roda no SQLite; o SQL do Postgres (producao) e conferido compilado."""
    from sqlalchemy.dialects import postgresql, sqlite

    from app.services.historico import inserir_sem_conflito

    linhas = [{"usuario_id": 1, "id": "a", "finalizado_em_ms": 1, "dados": {}}]
    sql = str(inserir_sem_conflito(dialeto, linhas).compile(
        dialect=(postgresql if dialeto == "postgresql" else sqlite).dialect()
    ))

    assert "ON CONFLICT (usuario_id, id) DO NOTHING" in sql
