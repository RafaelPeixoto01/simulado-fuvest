"""BT-041 a BT-046: figuras, SPA, headers de seguranca e comportamento por ambiente."""

from dataclasses import replace

import pytest
from fastapi.testclient import TestClient

from app.main import criar_app
from tests.utils import aplicar_migrations


def _cliente(settings):
    aplicacao = criar_app(settings)
    aplicar_migrations(aplicacao.state.engine)
    return TestClient(aplicacao)


def test_figura_de_prova_sincronizada(client, base_sintetica):
    """BT-041."""
    resposta = client.get("/figuras/2099/q015-1.webp")

    assert resposta.status_code == 200
    assert resposta.headers["content-type"] == "image/webp"
    assert resposta.headers["cache-control"] == "public, max-age=86400"
    assert resposta.content[:4] == b"RIFF"


@pytest.mark.parametrize(
    "caminho",
    [
        "/figuras/2099/..%2Fprova.yaml",
        "/figuras/2099/x.png",
        "/figuras/2099/Q015-1.webp",
        "/figuras/20a9/q015-1.webp",
        "/figuras/2099/nao-existe.webp",
    ],
)
def test_figura_invalida_404(client, base_sintetica, caminho):
    """BT-042: validado antes de tocar o disco (sem path traversal)."""
    assert client.get(caminho).status_code == 404


def test_figura_de_prova_nao_sincronizada_404(client, base_sintetica):
    """BT-043: pacote no disco mas fora do banco (rascunho)."""
    pasta = base_sintetica / "2097" / "figuras"
    pasta.mkdir(parents=True)
    (pasta / "q001-1.webp").write_bytes(b"RIFF....WEBP")

    assert client.get("/figuras/2097/q001-1.webp").status_code == 404


@pytest.fixture
def com_spa(settings, tmp_path):
    static = tmp_path / "static"
    (static / "assets").mkdir(parents=True)
    (static / "index.html").write_text("<html>spa</html>", encoding="utf-8")
    (static / "assets" / "app.js").write_text("console.log(1)", encoding="utf-8")
    return replace(settings, static_dir=static)


def test_rotas_do_spa_devolvem_index_html(com_spa):
    """BT-044."""
    with _cliente(com_spa) as c:
        assert c.get("/historico").text == "<html>spa</html>"
        assert c.get("/resultado/abc").text == "<html>spa</html>"
        assert c.get("/assets/app.js").text == "console.log(1)"
        api = c.get("/api/nada")
        assert api.status_code == 404 and api.headers["content-type"].startswith("application/json")


def test_headers_de_seguranca(client):
    """BT-045."""
    h = client.get("/api/health").headers

    assert h["x-content-type-options"] == "nosniff"
    assert h["x-frame-options"] == "DENY"
    assert h["referrer-policy"] == "strict-origin-when-cross-origin"
    assert "default-src 'self'" in h["content-security-policy"]
    assert "frame-ancestors 'none'" in h["content-security-policy"]
    assert "strict-transport-security" not in h  # so em producao


def test_producao_sem_docs_sem_cors_e_com_hsts(settings):
    """BT-046."""
    with _cliente(replace(settings, environment="production")) as c:
        assert c.get("/docs").status_code == 404
        assert c.get("/openapi.json").status_code == 404
        resposta = c.get("/api/health", headers={"Origin": "http://localhost:5173"})
        assert "access-control-allow-origin" not in resposta.headers
        assert resposta.headers["strict-transport-security"] == "max-age=31536000"


def test_desenvolvimento_com_cors_para_o_vite(client):
    resposta = client.get("/api/health", headers={"Origin": "http://localhost:5173"})

    assert resposta.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert client.get("/docs").status_code == 200
