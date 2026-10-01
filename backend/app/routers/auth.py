"""Login com Google por redirecionamento (CR-005, ADR-010, specs/07 §2.4)."""

import hmac
import logging
import secrets
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.autenticacao import (
    apagar_cookie_login,
    caminho_seguro,
    gravar_cookie_login,
    gravar_cookie_sessao,
    ler_cookie_login,
    nome_cookie_login,
    nome_cookie_sessao,
    novo_pkce,
    valor_cookie_login,
)
from app.dependencias import obter_sessao
from app.rate_limit import limiter
from app.services import contas
from app.services.google import ErroLoginGoogle, ProvedorGoogle

router = APIRouter(prefix="/api/auth", tags=["auth"])
log = logging.getLogger(__name__)

FALHA_LOGIN = "/conta?erro=login"


def _provedor(request: Request) -> ProvedorGoogle:
    provedor = request.app.state.provedor_google
    if provedor is None:
        raise HTTPException(404, detail={
            "codigo": "login_indisponivel",
            "mensagem": "O login com Google não está disponível.",
        })
    return provedor


def _redirect_uri(request: Request) -> str:
    return f"{request.app.state.settings.public_url}/api/auth/google/callback"


@router.get("/google")
@limiter.limit("20/minute")
def iniciar_login(request: Request, voltar: str | None = None) -> RedirectResponse:
    provedor = _provedor(request)
    state = secrets.token_urlsafe(32)
    verifier, challenge = novo_pkce()
    resposta = RedirectResponse(
        provedor.url_autorizacao(
            redirect_uri=_redirect_uri(request), state=state, code_challenge=challenge
        ),
        status_code=302,
    )
    gravar_cookie_login(
        resposta,
        request.app.state.settings,
        valor_cookie_login(state, verifier, caminho_seguro(voltar)),
    )
    return resposta


@router.get("/google/callback")
@limiter.limit("20/minute")
def concluir_login(
    request: Request,
    sessao: Annotated[Session, Depends(obter_sessao)],
    code: Annotated[str | None, Query(max_length=2048)] = None,
    state: Annotated[str | None, Query(max_length=256)] = None,
    error: Annotated[str | None, Query(max_length=256)] = None,
) -> RedirectResponse:
    provedor = _provedor(request)
    settings = request.app.state.settings
    falha = RedirectResponse(FALHA_LOGIN, status_code=302)
    apagar_cookie_login(falha, settings)

    pendente = ler_cookie_login(request.cookies.get(nome_cookie_login(settings)))
    if error or not code or not state or pendente is None:
        return falha
    if not hmac.compare_digest(pendente.state.encode(), state.encode()):
        return falha
    try:
        identidade = provedor.trocar_codigo(
            code=code, code_verifier=pendente.verifier, redirect_uri=_redirect_uri(request)
        )
    except ErroLoginGoogle as erro:
        log.warning("Login com Google falhou: %s", erro)
        return falha

    token = contas.entrar(
        sessao, identidade, datetime.now(UTC), request.cookies.get(nome_cookie_sessao(settings))
    )
    resposta = RedirectResponse(pendente.voltar, status_code=302)
    gravar_cookie_sessao(resposta, settings, token)
    apagar_cookie_login(resposta, settings)
    return resposta
