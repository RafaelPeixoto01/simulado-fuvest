"""BT-070 a BT-074: login obrigatorio para usar o site (CR-006, ADR-012, specs/07 §8)."""

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import criar_app
from tests.contas import ProvedorFalso, entrar, iniciar
from tests.utils import aplicar_migrations

# (metodo, caminho, corpo) de cada rota de conteudo, validas para a base sintetica
CONTEUDO = [
    ("GET", "/api/catalogo", None),
    ("POST", "/api/simulados", {"modo": "ano", "ano": 2099}),
    ("GET", "/api/questoes?ids=2099-001", None),
    ("POST", "/api/correcoes", {"respostas": [{"questao_id": "2099-001", "resposta": "A"}]}),
    ("POST", "/api/reportes", {"questao_id": "2099-001", "tipo": "outro"}),
    ("GET", "/api/notas-corte", None),  # BT-080 (CR-010)
]
IDS = ["catalogo", "simulados", "questoes", "correcoes", "reportes", "notas-corte"]


def _chamar(client, metodo, caminho, corpo):
    return client.request(metodo, caminho, json=corpo)


@pytest.mark.parametrize(("metodo", "caminho", "corpo"), CONTEUDO, ids=IDS)
def test_sem_sessao_o_conteudo_exige_login(client, provedor_falso, base_sintetica, metodo, caminho, corpo):
    """BT-070."""
    resposta = _chamar(client, metodo, caminho, corpo)

    assert resposta.status_code == 401
    assert resposta.json()["detail"]["codigo"] == "nao_autenticado"


def test_login_vem_antes_da_validacao_do_corpo(client, provedor_falso):
    """BT-070: sem sessao, nem o formato do pedido e avaliado (401, nao 422)."""
    assert client.post("/api/simulados", json={"modo": "nenhum"}).status_code == 401


@pytest.mark.parametrize(("metodo", "caminho", "corpo"), CONTEUDO, ids=IDS)
def test_com_sessao_o_conteudo_responde(client_logado, base_sintetica, metodo, caminho, corpo):
    """BT-071."""
    resposta = _chamar(client_logado, metodo, caminho, corpo)

    assert resposta.status_code in (200, 201)


@pytest.fixture
def app_producao_sem_login(tmp_path, _pacotes_sinteticos):
    """Producao sem as variaveis do Google: o site fecha (D3)."""
    import shutil

    from app.pacote.sincronizar import sincronizar

    settings = Settings(database_url="sqlite://", data_dir=tmp_path / "provas", environment="production")
    app = criar_app(settings)
    aplicar_migrations(app.state.engine)
    shutil.copytree(_pacotes_sinteticos, settings.data_dir)
    with app.state.fabrica_sessao() as sessao:
        sincronizar(sessao, settings.data_dir)
    return app


@pytest.mark.parametrize(("metodo", "caminho", "corpo"), CONTEUDO, ids=IDS)
def test_producao_sem_login_configurado_fica_indisponivel(app_producao_sem_login, metodo, caminho, corpo):
    """BT-072."""
    with TestClient(app_producao_sem_login, base_url="https://testserver") as client:
        resposta = _chamar(client, metodo, caminho, corpo)

    assert resposta.status_code == 503
    assert resposta.json()["detail"]["codigo"] == "site_indisponivel"


def test_producao_sem_login_publicos_e_sessao(app_producao_sem_login):
    """BT-072: health e figuras continuam; a sessao diz que o site esta indisponivel."""
    with TestClient(app_producao_sem_login, base_url="https://testserver") as client:
        assert client.get("/api/health").status_code == 200
        assert client.get("/figuras/2099/q015-1.webp").status_code == 200
        assert client.get("/api/sessao").json() == {
            "login_disponivel": False, "usuario": None, "acesso": "indisponivel"
        }


def test_producao_sem_login_bloqueia_mesmo_quem_tinha_sessao(tmp_path, _pacotes_sinteticos):
    """BT-072: desligar o login em producao fecha o conteudo para todos, mas a conta
    continua acessivel (sair e excluir, RF-026)."""
    settings = Settings(
        database_url="sqlite://", data_dir=tmp_path / "provas", environment="production",
        public_url="https://testserver",
    )
    app = criar_app(settings)
    aplicar_migrations(app.state.engine)
    app.state.provedor_google = ProvedorFalso()
    with TestClient(app, base_url="https://testserver") as client:
        entrar(client)
        app.state.provedor_google = None  # variavel removida

        assert client.get("/api/catalogo").status_code == 503
        assert client.get("/api/sessao").json()["usuario"]["email"] == "ana@exemplo.com"
        assert client.delete("/api/conta").status_code == 204


@pytest.mark.parametrize(("metodo", "caminho", "corpo"), CONTEUDO, ids=IDS)
def test_fora_de_producao_sem_login_configurado_fica_aberto(client, base_sintetica, metodo, caminho, corpo):
    """BT-073: desenvolvimento, testes e CI sem segredo."""
    assert _chamar(client, metodo, caminho, corpo).status_code in (200, 201)
    assert client.get("/api/sessao").json()["acesso"] == "livre"


def test_publicos_com_login_configurado_e_sem_sessao(client, provedor_falso, base_sintetica):
    """BT-074."""
    assert client.get("/api/health").status_code == 200
    assert client.get("/figuras/2099/q015-1.webp").status_code == 200
    assert client.get("/api/sessao").json() == {
        "login_disponivel": True, "usuario": None, "acesso": "conta"
    }
    assert iniciar(client).status_code == 302


@pytest.mark.parametrize(
    ("metodo", "caminho", "corpo"),
    [c for c in CONTEUDO if c[0] == "POST"],
    ids=["simulados", "correcoes", "reportes"],
)
def test_post_de_conteudo_de_outro_site_e_recusado(client_logado, base_sintetica, metodo, caminho, corpo):
    """BT-075 (revisao de codigo): mesma verificacao de Origin das rotas de conta (CR-005)."""
    resposta = client_logado.request(metodo, caminho, json=corpo, headers={"Origin": "https://evil.test"})

    assert resposta.status_code == 403
    assert resposta.json()["detail"]["codigo"] == "origem_invalida"
