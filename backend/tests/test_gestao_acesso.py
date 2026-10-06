"""BT-104: acesso a area de gestao (CR-013, RN-020, specs/09-gestao.md §2.4, §2.5)."""

from dataclasses import replace

import pytest
from fastapi.testclient import TestClient

from tests.contas import entrar

ORIGEM = {"Origin": "http://localhost:5173"}
LEITURAS = [
    "/api/gestao/uso",
    "/api/gestao/aprendizado",
    "/api/gestao/qualidade",
    "/api/gestao/reportes",
    "/api/gestao/estudantes",
]
RESOLVER = "/api/gestao/reportes/resolver"


def _todas(client, corpo=None, headers=ORIGEM):
    """Status de todas as rotas da gestao."""
    status = [client.get(rota).status_code for rota in LEITURAS]
    status.append(client.post(RESOLVER, json=corpo or {"ids": [1]}, headers=headers).status_code)
    return status


def _nao_encontrado(resposta):
    return resposta.status_code == 404 and resposta.json()["detail"]["codigo"] == "nao_encontrado"


def test_sem_sessao_404_em_todas_as_rotas(client, provedor_falso):
    assert _todas(client) == [404] * 6
    assert _nao_encontrado(client.get("/api/gestao/uso"))


def test_modo_livre_sem_usuario_404(client):
    """Sem login configurado (desenvolvimento) nao ha usuario: a area nao existe."""
    assert _todas(client) == [404] * 6


def test_conta_comum_sem_a_variavel_404(client_logado):
    assert _todas(client_logado) == [404] * 6


def test_conta_que_nao_esta_na_variavel_404(client_logado, app):
    app.state.settings = replace(app.state.settings, admin_google_subs=frozenset({"sub-outro"}))

    assert _todas(client_logado) == [404] * 6
    assert client_logado.get("/api/sessao").json()["usuario"]["admin"] is False


@pytest.mark.parametrize("rota", ["/api/gestao/uso?periodo=x", "/api/gestao/estudantes?pagina=0"])
def test_nao_admin_recebe_404_antes_da_validacao(client_logado, rota):
    assert _nao_encontrado(client_logado.get(rota))
    assert _nao_encontrado(client_logado.post(RESOLVER, json={"ids": "x"}, headers=ORIGEM))


def test_admin_acessa_todas_as_rotas_sem_cache(client_admin):
    for rota in LEITURAS:
        resposta = client_admin.get(rota)
        assert resposta.status_code == 200, rota
        assert resposta.headers["cache-control"] == "no-store"
    resolver = client_admin.post(RESOLVER, json={"ids": [1]}, headers=ORIGEM)
    assert resolver.status_code == 200
    assert resolver.json() == {"resolvidos": [], "ja_resolvidos": [], "inexistentes": [1]}
    assert client_admin.get("/api/sessao").json()["usuario"]["admin"] is True


def test_admin_com_origin_de_outro_site_403(client_admin):
    resposta = client_admin.post(RESOLVER, json={"ids": [1]}, headers={"Origin": "https://malicioso.exemplo"})

    assert resposta.status_code == 403


def test_outra_conta_nao_herda_o_acesso(client_admin, app):
    """A Beto, em outro navegador, a area continua inexistente."""
    with TestClient(app) as outro:
        assert entrar(outro, "codigo-beto").status_code == 302
        assert _todas(outro) == [404] * 6
        assert outro.get("/api/sessao").json()["usuario"]["admin"] is False
