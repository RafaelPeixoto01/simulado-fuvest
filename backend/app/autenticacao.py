"""Cookies e parametros do login com Google (CR-005, ADR-010).

Os dois cookies sao HttpOnly e SameSite=Lax; em producao, Secure e com o prefixo __Host-
(o navegador recusa um __Host- vindo de subdominio ou sem Secure).
"""

import base64
import binascii
import hashlib
import re
import secrets
from dataclasses import dataclass
from datetime import timedelta
from urllib.parse import urlsplit

from fastapi import Response

from app.config import Settings

DURACAO_SESSAO = timedelta(days=90)
DURACAO_LOGIN = timedelta(minutes=10)
TAMANHO_MAXIMO_TOKEN = 128
# So caminhos internos simples: evita redirecionamento aberto pelo parametro `voltar`
CAMINHO_VOLTAR = re.compile(r"/[A-Za-z0-9/_-]{0,199}")


def nome_cookie_sessao(settings: Settings) -> str:
    return "__Host-sessao" if settings.producao else "sessao"


def nome_cookie_login(settings: Settings) -> str:
    return "__Host-login-google" if settings.producao else "login-google"


def origem_publica(settings: Settings) -> str:
    partes = urlsplit(settings.public_url)
    return f"{partes.scheme}://{partes.netloc}"


def novo_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _b64url(dados: bytes) -> str:
    return base64.urlsafe_b64encode(dados).decode("ascii").rstrip("=")


def novo_pkce() -> tuple[str, str]:
    """(code_verifier, code_challenge S256)."""
    verifier = secrets.token_urlsafe(64)
    return verifier, _b64url(hashlib.sha256(verifier.encode("ascii")).digest())


def caminho_seguro(voltar: str | None) -> str:
    if voltar and CAMINHO_VOLTAR.fullmatch(voltar) and not voltar.startswith("//"):
        return voltar
    return "/"


@dataclass(frozen=True)
class LoginPendente:
    state: str
    verifier: str
    voltar: str


def valor_cookie_login(state: str, verifier: str, voltar: str) -> str:
    # state e verifier sao base64url (sem ponto); o caminho vai codificado
    return f"{state}.{verifier}.{_b64url(voltar.encode())}"


def ler_cookie_login(valor: str | None) -> LoginPendente | None:
    partes = (valor or "").split(".")
    if len(partes) != 3 or not all(partes[:2]):
        return None
    try:
        voltar = base64.b64decode(
            partes[2] + "=" * (-len(partes[2]) % 4), altchars=b"-_", validate=True
        ).decode()
    except (binascii.Error, ValueError):
        return None
    return LoginPendente(partes[0], partes[1], caminho_seguro(voltar))


def _gravar(resposta: Response, settings: Settings, nome: str, valor: str, duracao: timedelta):
    resposta.set_cookie(
        nome,
        valor,
        max_age=int(duracao.total_seconds()),
        path="/",
        secure=settings.producao,
        httponly=True,
        samesite="lax",
    )


def _apagar(resposta: Response, settings: Settings, nome: str) -> None:
    resposta.delete_cookie(nome, path="/", secure=settings.producao, httponly=True, samesite="lax")


def gravar_cookie_sessao(resposta: Response, settings: Settings, token: str) -> None:
    _gravar(resposta, settings, nome_cookie_sessao(settings), token, DURACAO_SESSAO)


def apagar_cookie_sessao(resposta: Response, settings: Settings) -> None:
    _apagar(resposta, settings, nome_cookie_sessao(settings))


def gravar_cookie_login(resposta: Response, settings: Settings, valor: str) -> None:
    _gravar(resposta, settings, nome_cookie_login(settings), valor, DURACAO_LOGIN)


def apagar_cookie_login(resposta: Response, settings: Settings) -> None:
    _apagar(resposta, settings, nome_cookie_login(settings))
