"""Login com Google: OpenID Connect com authorization code + PKCE (CR-005, ADR-010).

So a stdlib: a troca do codigo e um POST de formulario. O id_token chega direto do
endpoint de token do Google, por TLS, numa chamada autenticada com o segredo do cliente,
entao as claims sao validadas sem verificar a assinatura (OIDC Core §3.1.3.7).
Nenhuma mensagem de erro carrega tokens, codigos ou o segredo.
"""

import base64
import http.client
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Callable
from dataclasses import dataclass

URL_AUTORIZACAO = "https://accounts.google.com/o/oauth2/v2/auth"
URL_TOKEN = "https://oauth2.googleapis.com/token"
EMISSORES = frozenset({"https://accounts.google.com", "accounts.google.com"})
ESCOPOS = "openid email profile"
TIMEOUT_S = 10
TOLERANCIA_RELOGIO_S = 60


@dataclass(frozen=True)
class IdentidadeGoogle:
    sub: str
    email: str
    nome: str | None


class ErroLoginGoogle(Exception):
    """Troca do codigo falhou ou o id_token nao e valido para este cliente."""


def _post_formulario(url: str, campos: dict[str, str]) -> dict:
    pedido = urllib.request.Request(
        url,
        data=urllib.parse.urlencode(campos).encode(),
        method="POST",
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(pedido, timeout=TIMEOUT_S) as resposta:
            return json.loads(resposta.read())
    except urllib.error.HTTPError as erro:
        raise ErroLoginGoogle(f"o endpoint de token respondeu {erro.code}") from None
    # OSError cobre URLError, timeout e conexao derrubada (RemoteDisconnected); HTTPException,
    # resposta cortada (IncompleteRead); ValueError, JSON invalido
    except (OSError, http.client.HTTPException, ValueError) as erro:
        raise ErroLoginGoogle(f"falha na troca do codigo ({type(erro).__name__})") from None


def claims_do_id_token(id_token: str) -> dict:
    """Payload do JWT (base64url), sem verificar a assinatura (ver docstring do modulo)."""
    try:
        payload = id_token.split(".")[1]
        claims = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
    except (IndexError, ValueError):
        raise ErroLoginGoogle("id_token malformado") from None
    if not isinstance(claims, dict):
        raise ErroLoginGoogle("id_token malformado")
    return claims


def _texto(valor: object, limite: int) -> str | None:
    return valor if isinstance(valor, str) and 0 < len(valor) <= limite else None


class ProvedorGoogle:
    """Fica em app.state.provedor_google; testes e a validacao local trocam por um falso."""

    def __init__(
        self,
        client_id: str,
        client_secret: str,
        *,
        post: Callable[[str, dict[str, str]], dict] = _post_formulario,
        agora: Callable[[], float] = time.time,
    ):
        self.client_id = client_id
        self._client_secret = client_secret
        self._post = post
        self._agora = agora

    def url_autorizacao(self, *, redirect_uri: str, state: str, code_challenge: str) -> str:
        parametros = {
            "client_id": self.client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": ESCOPOS,
            "state": state,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
            # Computador compartilhado: sempre deixar escolher a conta
            "prompt": "select_account",
        }
        return f"{URL_AUTORIZACAO}?{urllib.parse.urlencode(parametros)}"

    def trocar_codigo(
        self, *, code: str, code_verifier: str, redirect_uri: str
    ) -> IdentidadeGoogle:
        resposta = self._post(URL_TOKEN, {
            "grant_type": "authorization_code",
            "code": code,
            "code_verifier": code_verifier,
            "redirect_uri": redirect_uri,
            "client_id": self.client_id,
            "client_secret": self._client_secret,
        })
        id_token = resposta.get("id_token") if isinstance(resposta, dict) else None
        if not isinstance(id_token, str):
            raise ErroLoginGoogle("resposta do Google sem id_token")
        return self.identidade(claims_do_id_token(id_token))

    def identidade(self, claims: dict) -> IdentidadeGoogle:
        if claims.get("iss") not in EMISSORES:
            raise ErroLoginGoogle("emissor do id_token invalido")
        aud = claims.get("aud")
        if aud != self.client_id and not (isinstance(aud, list) and self.client_id in aud):
            raise ErroLoginGoogle("id_token emitido para outro cliente")
        # Varias audiencias: o token tem de ter sido pedido por este cliente (OIDC Core §3.1.3.7)
        if isinstance(aud, list) and len(aud) > 1 and claims.get("azp") != self.client_id:
            raise ErroLoginGoogle("id_token pedido por outro cliente")
        # O e-mail so e exibido ao proprio dono da conta; a identidade e o `sub`. Por isso
        # email_verified nao e exigido (revisao de codigo do CR-005)
        exp = claims.get("exp")
        if not isinstance(exp, int | float) or exp <= self._agora() - TOLERANCIA_RELOGIO_S:
            raise ErroLoginGoogle("id_token vencido")
        sub, email = _texto(claims.get("sub"), 255), _texto(claims.get("email"), 320)
        if sub is None or email is None:
            raise ErroLoginGoogle("id_token sem sub ou e-mail")
        nome = claims.get("name")
        nome = (nome.strip()[:200] or None) if isinstance(nome, str) else None
        return IdentidadeGoogle(sub=sub, email=email, nome=nome)
