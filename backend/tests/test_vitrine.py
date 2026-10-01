"""BT-076 a BT-078: vitrine publica da apresentacao (CR-007, specs/07 §9.1)."""

import shutil

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import criar_app
from app.pacote.sincronizar import sincronizar
from tests.utils import aplicar_migrations


def test_vitrine_tem_os_totais_do_catalogo(client, base_sintetica):
    """BT-076: questoes validas (sem anuladas) e anos em ordem crescente."""
    catalogo = client.get("/api/catalogo").json()

    resposta = client.get("/api/vitrine")

    assert resposta.status_code == 200
    assert resposta.json() == {
        "total_questoes": catalogo["total_questoes"],
        "anos": [2098, 2099],
    }
    assert catalogo["total_questoes"] < 180  # a base sintetica tem anuladas


def test_vitrine_e_publica_com_login_configurado(client, provedor_falso, base_sintetica):
    """BT-077: sem sessao, so os dois campos, e nenhum cookie."""
    assert client.get("/api/catalogo").status_code == 401

    resposta = client.get("/api/vitrine")

    assert resposta.status_code == 200
    assert set(resposta.json()) == {"total_questoes", "anos"}
    assert "set-cookie" not in resposta.headers


def test_vitrine_e_publica_em_producao_sem_login(tmp_path, _pacotes_sinteticos):
    """BT-077: com o site indisponivel (D3 do CR-006), a vitrine continua respondendo."""
    settings = Settings(database_url="sqlite://", data_dir=tmp_path / "provas", environment="production")
    app = criar_app(settings)
    aplicar_migrations(app.state.engine)
    shutil.copytree(_pacotes_sinteticos, settings.data_dir)
    with app.state.fabrica_sessao() as sessao:
        sincronizar(sessao, settings.data_dir)

    with TestClient(app, base_url="https://testserver") as client:
        assert client.get("/api/catalogo").status_code == 503
        resposta = client.get("/api/vitrine")

    assert resposta.status_code == 200
    assert resposta.json()["anos"] == [2098, 2099]


def test_vitrine_com_a_base_vazia(client):
    """BT-078."""
    assert client.get("/api/vitrine").json() == {"total_questoes": 0, "anos": []}
