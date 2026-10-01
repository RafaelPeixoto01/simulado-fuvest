"""BT-062: provedor OpenID Connect do Google (CR-005, ADR-010), sem rede."""

import base64
import json
from urllib.parse import parse_qs, urlsplit

import pytest

from app.autenticacao import caminho_seguro, ler_cookie_login, novo_pkce, valor_cookie_login
from app.services.google import (
    URL_TOKEN,
    ErroLoginGoogle,
    ProvedorGoogle,
    claims_do_id_token,
)

AGORA = 1_800_000_000.0


def _jwt(claims: dict) -> str:
    def parte(dados: dict) -> str:
        return base64.urlsafe_b64encode(json.dumps(dados).encode()).decode().rstrip("=")

    return f"{parte({'alg': 'RS256'})}.{parte(claims)}.assinatura"


def _claims(**extra) -> dict:
    return {
        "iss": "https://accounts.google.com",
        "aud": "cliente-id",
        "exp": AGORA + 3600,
        "sub": "1234567890",
        "email": "ana@exemplo.com",
        "name": "Ana Souza",
        **extra,
    }


def _provedor(resposta: dict | Exception) -> tuple[ProvedorGoogle, list]:
    chamadas = []

    def post(url, campos):
        chamadas.append((url, campos))
        if isinstance(resposta, Exception):
            raise resposta
        return resposta

    return ProvedorGoogle("cliente-id", "segredo", post=post, agora=lambda: AGORA), chamadas


def test_url_de_autorizacao_com_pkce_e_state():
    provedor, _ = _provedor({})

    url = provedor.url_autorizacao(
        redirect_uri="https://site.test/api/auth/google/callback", state="st", code_challenge="ch"
    )

    partes = urlsplit(url)
    params = {k: v[0] for k, v in parse_qs(partes.query).items()}
    assert f"{partes.scheme}://{partes.netloc}{partes.path}" == (
        "https://accounts.google.com/o/oauth2/v2/auth"
    )
    assert params == {
        "client_id": "cliente-id",
        "redirect_uri": "https://site.test/api/auth/google/callback",
        "response_type": "code",
        "scope": "openid email profile",
        "state": "st",
        "code_challenge": "ch",
        "code_challenge_method": "S256",
        "prompt": "select_account",
    }


def test_troca_do_codigo_devolve_a_identidade():
    provedor, chamadas = _provedor({"id_token": _jwt(_claims()), "access_token": "x"})

    identidade = provedor.trocar_codigo(code="c", code_verifier="v", redirect_uri="https://r")

    assert (identidade.sub, identidade.email, identidade.nome) == (
        "1234567890", "ana@exemplo.com", "Ana Souza"
    )
    url, campos = chamadas[0]
    assert url == URL_TOKEN
    assert campos == {
        "grant_type": "authorization_code",
        "code": "c",
        "code_verifier": "v",
        "redirect_uri": "https://r",
        "client_id": "cliente-id",
        "client_secret": "segredo",
    }


def test_nome_ausente_ou_vazio_vira_none():
    for extra in ({"name": None}, {"name": "   "}):
        claims = {k: v for k, v in _claims(**extra).items() if v is not None}
        provedor, _ = _provedor({"id_token": _jwt(claims)})
        assert provedor.trocar_codigo(code="c", code_verifier="v", redirect_uri="r").nome is None


@pytest.mark.parametrize(
    "claims",
    [
        _claims(iss="https://evil.test"),
        _claims(aud="outro-cliente"),
        _claims(exp=AGORA - 3600),
        _claims(exp="amanha"),
        {k: v for k, v in _claims().items() if k != "sub"},
        {k: v for k, v in _claims().items() if k != "email"},
        _claims(sub="x" * 256),
    ],
    ids=["iss", "aud", "exp-vencido", "exp-texto", "sem-sub", "sem-email", "sub-longo"],
)
def test_id_token_invalido_e_recusado(claims):
    provedor, _ = _provedor({"id_token": _jwt(claims)})

    with pytest.raises(ErroLoginGoogle):
        provedor.trocar_codigo(code="c", code_verifier="v", redirect_uri="r")


def test_aud_em_lista_e_aceito():
    provedor, _ = _provedor({"id_token": _jwt(_claims(aud=["cliente-id", "outro"]))})

    assert provedor.trocar_codigo(code="c", code_verifier="v", redirect_uri="r").sub == "1234567890"


@pytest.mark.parametrize(
    "resposta",
    [{}, {"id_token": 123}, {"id_token": "sem-pontos"}, {"id_token": "a.!!!.c"}, ErroLoginGoogle("x")],
    ids=["sem-id-token", "nao-texto", "malformado", "base64-ruim", "erro-http"],
)
def test_resposta_ruim_do_google_vira_erro_de_login(resposta):
    provedor, _ = _provedor(resposta)

    with pytest.raises(ErroLoginGoogle):
        provedor.trocar_codigo(code="c", code_verifier="v", redirect_uri="r")


def test_claims_precisam_ser_um_objeto():
    payload = base64.urlsafe_b64encode(b"[1, 2]").decode().rstrip("=")

    with pytest.raises(ErroLoginGoogle):
        claims_do_id_token(f"x.{payload}.y")


def test_pkce_s256():
    import hashlib

    verifier, challenge = novo_pkce()

    esperado = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest())
    assert challenge == esperado.decode().rstrip("=")
    assert 43 <= len(verifier) <= 128  # RFC 7636


@pytest.mark.parametrize(
    ("voltar", "esperado"),
    [
        ("/conta", "/conta"),
        ("/resultado/1b2c-3d", "/resultado/1b2c-3d"),
        ("/", "/"),
        (None, "/"),
        ("", "/"),
        ("//evil", "/"),
        ("https://evil.test", "/"),
        ("/a?x=1", "/"),
        ("/../x", "/"),
        ("conta", "/"),
        ("/" + "a" * 300, "/"),
    ],
)
def test_caminho_de_volta_so_interno(voltar, esperado):
    assert caminho_seguro(voltar) == esperado


def test_cookie_de_login_ida_e_volta():
    pendente = ler_cookie_login(valor_cookie_login("st", "ver", "/historico"))

    assert (pendente.state, pendente.verifier, pendente.voltar) == ("st", "ver", "/historico")
    assert ler_cookie_login(None) is None
    assert ler_cookie_login("a.b") is None
    assert ler_cookie_login("..x") is None
    assert ler_cookie_login("a.b.!!!") is None
