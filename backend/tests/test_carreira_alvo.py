"""BT-082 a BT-086: carreira-alvo na conta (CR-010, specs/08-notas-de-corte.md §2.4, §2.5)."""

import shutil

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import criar_app
from tests.contas import entrar
from tests.utils import aplicar_migrations

CAMINHO = "/api/conta/carreira-alvo"
ORIGEM = {"Origin": "http://localhost:5173"}


def _definir(client, corpo, headers=ORIGEM):
    return client.put(CAMINHO, json=corpo, headers=headers)


def _carreira_alvo(client):
    return client.get("/api/sessao").json()["usuario"]["carreira_alvo"]


def test_define_carreira_do_ano_mais_recente(client_logado, base_sintetica):
    """BT-082."""
    resposta = _definir(client_logado, {"ano": 2099, "codigo": 102})

    assert resposta.status_code == 200
    assert resposta.headers["cache-control"] == "no-store"
    esperado = {
        "ano": 2099,
        "codigo": 102,
        "carreira": {
            "codigo": 102,
            "nome": "Medicina (São Paulo, Ribeirão Preto)",
            "vagas": 160,
            "cortes": {"ac": 81, "ep": 73, "ppi": 62},
        },
    }
    assert resposta.json() == esperado
    assert _carreira_alvo(client_logado) == esperado

    # trocar substitui a anterior
    assert _definir(client_logado, {"ano": 2099, "codigo": 101}).status_code == 200
    assert _carreira_alvo(client_logado)["codigo"] == 101


@pytest.mark.parametrize("corpo", [{"ano": 2098, "codigo": 102}, {"ano": 2099, "codigo": 999}])
def test_carreira_de_ano_anterior_ou_inexistente(client_logado, base_sintetica, corpo):
    """BT-083: so a lista mais recente."""
    resposta = _definir(client_logado, corpo)

    assert resposta.status_code == 422
    assert resposta.json()["detail"]["codigo"] == "carreira_invalida"
    assert _carreira_alvo(client_logado) is None


@pytest.mark.parametrize(
    "corpo",
    [{"ano": 2099}, {"ano": 2099, "codigo": 99}, {"ano": "x", "codigo": 102}, {"ano": 2099, "codigo": 102, "modalidade": "ppi"}],
)
def test_corpo_invalido(client_logado, base_sintetica, corpo):
    """BT-083: campos extras recusados (a modalidade nunca e guardada, D4)."""
    assert _definir(client_logado, corpo).status_code == 422


def test_sem_sessao_com_login_configurado(client, provedor_falso, base_sintetica):
    """BT-084: 401 antes da validacao do corpo."""
    assert _definir(client, {"ano": 2099, "codigo": 102}).status_code == 401
    assert _definir(client, {"ano": "x"}).status_code == 401
    assert client.delete(CAMINHO, headers=ORIGEM).status_code == 401


def test_sem_usuario_no_modo_livre(client, base_sintetica):
    """BT-084: fora de producao sem login o conteudo abre, mas a carreira-alvo exige conta."""
    resposta = _definir(client, {"ano": 2099, "codigo": 102})

    assert resposta.status_code == 401
    assert resposta.json()["detail"]["codigo"] == "nao_autenticado"


def test_origem_de_outro_site(client_logado, base_sintetica):
    """BT-084."""
    outro = {"Origin": "https://evil.test"}

    assert _definir(client_logado, {"ano": 2099, "codigo": 102}, headers=outro).status_code == 403
    assert client_logado.delete(CAMINHO, headers=outro).status_code == 403


def test_producao_sem_login_configurado(tmp_path, _pacotes_sinteticos):
    """BT-084: 503 como o resto do conteudo."""
    settings = Settings(database_url="sqlite://", data_dir=tmp_path / "provas", environment="production")
    app = criar_app(settings)
    aplicar_migrations(app.state.engine)
    shutil.copytree(_pacotes_sinteticos, settings.data_dir)

    with TestClient(app, base_url="https://testserver") as client:
        assert client.put(CAMINHO, json={"ano": 2099, "codigo": 102}).status_code == 503
        assert client.delete(CAMINHO).status_code == 503


def test_remover_e_idempotente(client_logado, base_sintetica):
    """BT-085."""
    _definir(client_logado, {"ano": 2099, "codigo": 102})

    assert client_logado.delete(CAMINHO, headers=ORIGEM).status_code == 204
    assert client_logado.delete(CAMINHO, headers=ORIGEM).status_code == 204
    assert _carreira_alvo(client_logado) is None


def test_carreira_que_saiu_da_base(client_logado, base_sintetica):
    """BT-086: o par fica na conta, sem os dados da carreira."""
    _definir(client_logado, {"ano": 2099, "codigo": 102})

    (base_sintetica / "notas_corte" / "2099.yaml").unlink()

    assert _carreira_alvo(client_logado) == {"ano": 2099, "codigo": 102, "carreira": None}


def test_excluir_a_conta_apaga_a_carreira_alvo(client_logado, base_sintetica):
    """BT-086."""
    _definir(client_logado, {"ano": 2099, "codigo": 102})

    assert client_logado.delete("/api/conta", headers=ORIGEM).status_code == 204
    entrar(client_logado)
    assert _carreira_alvo(client_logado) is None
