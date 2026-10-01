"""BT-050 a BT-055, BT-060, BT-061, BT-063, BT-064: login, sessao e conta (CR-005, ADR-010)."""

from datetime import UTC, datetime, timedelta
from urllib.parse import parse_qs, urlsplit

from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.autenticacao import hash_token
from app.config import Settings
from app.main import criar_app
from app.models import SessaoUsuario, SimuladoConcluido, Usuario
from app.services.google import IdentidadeGoogle
from tests.contas import entrada_historico, entrar, iniciar, state_de
from tests.utils import aplicar_migrations


def _set_cookies(resposta) -> list[str]:
    return resposta.headers.get_list("set-cookie")


def _cookie(resposta, nome: str) -> str:
    return next(c for c in _set_cookies(resposta) if c.startswith(f"{nome}="))


def _contar(sessao, modelo) -> int:
    return sessao.scalar(select(func.count()).select_from(modelo))


# --- BT-050: sessao ---


def test_sessao_sem_login_configurado(client):
    resposta = client.get("/api/sessao")

    assert resposta.status_code == 200
    assert resposta.json() == {"login_disponivel": False, "usuario": None}
    assert resposta.headers["cache-control"] == "no-store"
    assert "set-cookie" not in resposta.headers  # sem conta, nenhum cookie (RNF-005)


def test_sessao_com_login_disponivel_e_sem_cookie(client, provedor_falso):
    assert client.get("/api/sessao").json() == {"login_disponivel": True, "usuario": None}


# --- BT-051: inicio do login ---


def test_inicio_do_login_desligado_404(client):
    resposta = iniciar(client)

    assert resposta.status_code == 404
    assert resposta.json()["detail"]["codigo"] == "login_indisponivel"


def test_inicio_do_login_redireciona_para_o_google_com_o_provedor_real(tmp_path):
    settings = Settings(
        database_url="sqlite://",
        data_dir=tmp_path,
        environment="test",
        google_client_id="cliente.apps.googleusercontent.com",
        google_client_secret="segredo",
        public_url="https://site.test",
    )
    with TestClient(criar_app(settings)) as client:
        resposta = iniciar(client, "/historico")

    assert resposta.status_code == 302
    url = urlsplit(resposta.headers["location"])
    params = {k: v[0] for k, v in parse_qs(url.query).items()}
    assert url.netloc == "accounts.google.com"
    assert params["client_id"] == "cliente.apps.googleusercontent.com"
    assert params["redirect_uri"] == "https://site.test/api/auth/google/callback"
    assert params["scope"] == "openid email profile"
    assert params["code_challenge_method"] == "S256"
    assert "segredo" not in resposta.headers["location"]
    cookie = _cookie(resposta, "login-google")
    assert params["state"] in cookie
    assert "HttpOnly" in cookie and "SameSite=lax" in cookie and "Max-Age=600" in cookie


def test_voltar_invalido_vira_raiz(client, provedor_falso):
    resposta = entrar(client, voltar="https://evil.test")

    assert resposta.headers["location"] == "/"


# --- BT-052: callback feliz ---


def test_callback_cria_usuario_e_sessao(client, provedor_falso, sessao):
    resposta = entrar(client, voltar="/historico")

    assert resposta.status_code == 302
    assert resposta.headers["location"] == "/historico"
    usuario = sessao.scalar(select(Usuario))
    assert (usuario.google_sub, usuario.email, usuario.nome) == (
        "sub-ana", "ana@exemplo.com", "Ana Souza"
    )
    cookie = _cookie(resposta, "sessao")
    token = cookie.split(";")[0].split("=", 1)[1]
    assert "HttpOnly" in cookie and "SameSite=lax" in cookie and "Path=/" in cookie
    assert f"Max-Age={90 * 24 * 3600}" in cookie
    registro = sessao.scalar(select(SessaoUsuario))
    assert registro.token_hash == hash_token(token) != token  # so o hash vai ao banco
    assert any(c.startswith('login-google=""') for c in _set_cookies(resposta))  # apagado
    # o code_verifier do cookie chegou a troca
    code, verifier, redirect_uri = provedor_falso.trocas[0]
    assert code == "codigo-ana" and len(verifier) >= 43
    assert redirect_uri == "http://localhost:5173/api/auth/google/callback"
    assert client.get("/api/sessao").json() == {
        "login_disponivel": True,
        "usuario": {"id": usuario.id, "email": "ana@exemplo.com", "nome": "Ana Souza"},
    }


def test_segundo_login_atualiza_sem_duplicar(client, provedor_falso, sessao):
    entrar(client)
    provedor_falso.identidades["codigo-ana"] = IdentidadeGoogle(
        sub="sub-ana", email="ana.nova@exemplo.com", nome="Ana S."
    )

    entrar(client)

    usuarios = sessao.scalars(select(Usuario)).all()
    assert len(usuarios) == 1 and usuarios[0].email == "ana.nova@exemplo.com"
    # a sessao anterior do mesmo navegador foi encerrada
    assert _contar(sessao, SessaoUsuario) == 1


# --- BT-053: callback com falha ---


def test_callback_com_erro_do_google(client, provedor_falso, sessao):
    iniciar(client)

    resposta = client.get(
        "/api/auth/google/callback", params={"error": "access_denied"}, follow_redirects=False
    )

    assert resposta.headers["location"] == "/conta?erro=login"
    assert _contar(sessao, SessaoUsuario) == 0


def test_callback_com_state_errado(client, provedor_falso, sessao):
    iniciar(client)

    resposta = client.get(
        "/api/auth/google/callback",
        params={"code": "codigo-ana", "state": "forjado"},
        follow_redirects=False,
    )

    assert resposta.headers["location"] == "/conta?erro=login"
    assert provedor_falso.trocas == []
    assert _contar(sessao, Usuario) == 0


def test_callback_sem_cookie_de_login(client, provedor_falso, app, sessao):
    state = state_de(iniciar(client))

    with TestClient(app) as outro_navegador:
        resposta = outro_navegador.get(
            "/api/auth/google/callback",
            params={"code": "codigo-ana", "state": state},
            follow_redirects=False,
        )

    assert resposta.headers["location"] == "/conta?erro=login"
    assert _contar(sessao, Usuario) == 0


def test_callback_com_troca_falhando(client, provedor_falso, sessao):
    resposta = entrar(client, code="codigo-invalido")

    assert resposta.headers["location"] == "/conta?erro=login"
    assert "sessao=" not in "".join(_set_cookies(resposta))
    assert _contar(sessao, Usuario) == 0


def test_callback_com_parametro_longo_demais(client, provedor_falso):
    resposta = client.get(
        "/api/auth/google/callback",
        params={"code": "x" * 2049, "state": "s"},
        follow_redirects=False,
    )

    assert resposta.status_code == 422


# --- BT-054: sessao invalida ou vencida ---


def test_token_desconhecido_nao_autentica(client, provedor_falso):
    client.cookies.set("sessao", "token-que-nao-existe")

    assert client.get("/api/sessao").json()["usuario"] is None
    assert client.get("/api/historico").status_code == 401


def test_sessao_vencida_e_apagada(client_logado, sessao):
    registro = sessao.scalar(select(SessaoUsuario))
    registro.expira_em = datetime.now(UTC) - timedelta(seconds=1)
    sessao.commit()

    assert client_logado.get("/api/sessao").json()["usuario"] is None
    sessao.expire_all()
    assert _contar(sessao, SessaoUsuario) == 0


def test_login_desligado_desconecta_quem_tinha_sessao(client_logado, app):
    app.state.provedor_google = None

    assert client_logado.get("/api/sessao").json() == {
        "login_disponivel": False, "usuario": None
    }
    assert client_logado.get("/api/historico").status_code == 401


# --- BT-055: sair ---


def test_sair_encerra_a_sessao(client_logado, sessao):
    resposta = client_logado.delete("/api/sessao")

    assert resposta.status_code == 204
    assert _contar(sessao, SessaoUsuario) == 0
    assert 'sessao=""' in _cookie(resposta, "sessao") and "Max-Age=0" in _cookie(resposta, "sessao")
    assert client_logado.get("/api/sessao").json()["usuario"] is None


def test_sair_sem_sessao_e_idempotente(client):
    assert client.delete("/api/sessao").status_code == 204


# --- BT-060: excluir conta ---


def test_excluir_conta_apaga_tudo(client_logado, sessao):
    client_logado.post("/api/historico", json={"entradas": [entrada_historico()]})

    resposta = client_logado.delete("/api/conta")

    assert resposta.status_code == 204
    assert "Max-Age=0" in _cookie(resposta, "sessao")
    for modelo in (Usuario, SessaoUsuario, SimuladoConcluido):
        assert _contar(sessao, modelo) == 0
    assert client_logado.get("/api/sessao").json()["usuario"] is None


def test_excluir_conta_exige_sessao(client, provedor_falso):
    resposta = client.delete("/api/conta")

    assert resposta.status_code == 401
    assert resposta.json()["detail"]["codigo"] == "nao_autenticado"


# --- BT-061: Origin ---


def test_origin_de_outro_site_e_recusado(client_logado, sessao):
    outro = {"Origin": "https://evil.test"}

    for resposta in (
        client_logado.post("/api/historico", json={"entradas": [entrada_historico()]}, headers=outro),
        client_logado.delete("/api/historico", headers=outro),
        client_logado.delete("/api/conta", headers=outro),
        client_logado.delete("/api/sessao", headers=outro),
    ):
        assert resposta.status_code == 403
        assert resposta.json()["detail"]["codigo"] == "origem_invalida"
    assert _contar(sessao, Usuario) == 1 and _contar(sessao, SimuladoConcluido) == 0


def test_origin_do_proprio_site_e_aceito(client_logado):
    resposta = client_logado.post(
        "/api/historico",
        json={"entradas": [entrada_historico()]},
        headers={"Origin": "http://localhost:5173"},
    )

    assert resposta.status_code == 200


# --- BT-063: rate limit ---


def test_rate_limit_do_login(client, provedor_falso):
    codigos = [iniciar(client).status_code for _ in range(21)]

    assert codigos[:20] == [302] * 20 and codigos[20] == 429


# --- BT-064: cookies em producao ---


def test_cookies_de_producao_com_host_e_secure(tmp_path):
    from tests.contas import ProvedorFalso

    settings = Settings(
        database_url="sqlite://",
        data_dir=tmp_path,
        environment="production",
        public_url="https://site.test",
    )
    app = criar_app(settings)
    aplicar_migrations(app.state.engine)
    app.state.provedor_google = ProvedorFalso()

    with TestClient(app, base_url="https://site.test") as client:
        resposta = entrar(client)

    assert resposta.status_code == 302
    cookie = _cookie(resposta, "__Host-sessao")
    assert "Secure" in cookie and "HttpOnly" in cookie and "Path=/" in cookie
    assert "Domain" not in cookie
